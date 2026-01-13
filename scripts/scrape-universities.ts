import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import type {
	Establishment,
	Region,
	SchoolLevel,
	SchoolType,
	UniversityData,
} from "../src";

// URL 설정
const TARGET_URL = "https://www.career.go.kr/cloud/w/school/list";

// __dirname 대신 process.cwd() 사용
const OUTPUT_DIR = path.resolve(process.cwd(), "src/data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "universities.json");

/**
 * 텍스트에서 학교명과 캠퍼스명을 분리합니다.
 */
function parseSchoolName(fullName: string) {
	const match = fullName.match(/^(.*?)(?:\((.*?)\))?$/);
	if (!match) return { name: fullName.trim() };

	return {
		name: match[1].trim(),
		campus: match[2]?.trim(),
	};
}

async function scrape() {
	console.log("🚀 대학 정보 수집을 시작합니다...");

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		await page.goto(TARGET_URL);
		await page.waitForLoadState("networkidle");

		const universityTab = page.getByRole("button", { name: "대학교" });
		const isTabActive = await universityTab
			.getAttribute("class")
			.then((c) => c?.includes("active"));

		if (!isTabActive) {
			console.log("switched to 'University' tab...");
			await universityTab.click();
			await page.waitForLoadState("networkidle");
		}

		console.log("🔄 목록 개수 30개로 변경 중...");
		await page.selectOption("#test-select-01", "30");
		await page.locator(".btn-apply").click();
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(1000);

		const universities: UniversityData[] = [];
		let pageNum = 1;
		let hasNextPage = true;

		while (hasNextPage) {
			console.log(`📄 페이지 ${pageNum} 수집 중...`);

			const rows = page.locator("tbody tr");
			const count = await rows.count();

			if (count === 0) {
				console.log("⚠️ 데이터가 없습니다.");
				break;
			}

			for (let i = 0; i < count; i++) {
				const row = rows.nth(i);
				const cells = row.locator("td");
				if ((await cells.count()) < 5) continue;

				// 1. 번호 추출 (index 0)
				const idRaw = await cells.nth(0).innerText();
				const id = Number.parseInt(idRaw, 10);

				// 2. 학교명 및 링크 추출 (index 1)
				const nameRaw = await cells.nth(1).innerText();
				const linkEl = cells.nth(1).locator("a");
				const href =
					(await linkEl.count()) > 0 ? await linkEl.getAttribute("href") : null;
				// http로 시작하는 유효한 링크만 저장
				const link = href?.startsWith("http") ? href : undefined;

				// 나머지 정보 추출
				const levelRaw = await cells.nth(2).innerText();
				const typeRaw = await cells.nth(3).innerText();
				const establishmentRaw = await cells.nth(4).innerText();
				const regionRaw = await cells.nth(5).innerText();

				const { name, campus } = parseSchoolName(nameRaw);

				const university: UniversityData = {
					id, // 번호 추가
					nameKr: name,
					link, // 링크 추가 (Optional)
					campus: campus,
					level: levelRaw as SchoolLevel,
					type: typeRaw as SchoolType,
					establishment: establishmentRaw as Establishment,
					region: regionRaw as Region,
				};

				universities.push(university);
			}

			const nextButton = page.locator('button.btn-next[title="다음 페이지"]');
			const isVisible = await nextButton.isVisible();
			const isDisabled = (await nextButton.getAttribute("disabled")) !== null;

			if (isVisible && !isDisabled) {
				const firstSchoolBefore = await rows
					.first()
					.locator("td")
					.nth(1)
					.innerText();

				await nextButton.click();
				await page.waitForLoadState("networkidle");
				await page.waitForTimeout(500);

				const firstSchoolAfter = await page
					.locator("tbody tr")
					.first()
					.locator("td")
					.nth(1)
					.innerText();

				if (firstSchoolBefore === firstSchoolAfter) {
					console.log("🏁 마지막 페이지에 도달했습니다.");
					hasNextPage = false;
				} else {
					pageNum++;
				}
			} else {
				console.log("🏁 다음 페이지 버튼이 없습니다.");
				hasNextPage = false;
			}
		}

		if (!fs.existsSync(OUTPUT_DIR)) {
			fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		}

		fs.writeFileSync(
			OUTPUT_FILE,
			JSON.stringify(universities, null, 2),
			"utf-8",
		);
		console.log(
			`✅ 완료! 총 ${universities.length}개의 대학 정보를 저장했습니다.`,
		);
		console.log(`📁 저장 위치: ${OUTPUT_FILE}`);
	} catch (error) {
		console.error("❌ 에러 발생:", error);
	} finally {
		await browser.close();
	}
}

scrape().catch((err) => {
	console.error(err);
	process.exit(1);
});

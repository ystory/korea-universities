// file: scripts/scrape-accreditation.ts
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

// 저장할 파일 경로
const OUTPUT_FILE = path.resolve(process.cwd(), "src/data/accredited.json");
const TARGET_URL =
	"https://www.studyinkorea.go.kr/ko/plan/certifiedUniversity.do";

interface CategoryList {
	university: string[];
	college: string[];
	graduate: string[];
}

interface AccreditedRawData {
	lastModified: string;
	scrapedAt: string;
	excellent: CategoryList;
	degree: CategoryList;
	language: CategoryList;
}

function createEmptyCategory(): CategoryList {
	return { university: [], college: [], graduate: [] };
}

function parseUniversityString(text: string): string[] {
	return text
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

function getSchoolTypeKey(title: string): keyof CategoryList | null {
	if (title.includes("일반대학")) return "university";
	if (title.includes("전문대학")) return "college";
	if (title.includes("대학원")) return "graduate";
	return null;
}

async function scrapeRaw() {
	console.log("🚀 인증 대학 정보(Raw Data) 수집을 시작합니다...");

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		userAgent:
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
		locale: "ko-KR",
		timezoneId: "Asia/Seoul",
		viewport: { width: 1920, height: 1080 },
	});
	const page = await context.newPage();

	try {
		await page.goto(TARGET_URL);
		await page.waitForLoadState("networkidle");

		// 1. 최종 수정일 추출
		const dateElement = page
			.locator(".univ-total .text-primary")
			.filter({ hasText: "최종 수정일" })
			.first();

		let lastModified = "Unknown";
		if ((await dateElement.count()) > 0) {
			const dateText = await dateElement.innerText();
			const match = dateText.match(/(\d{4}-\d{2}-\d{2})/);
			if (match) lastModified = match[1];
		}
		console.log(`📅 최종 수정일: ${lastModified}`);

		// -----------------------------------------------------------
		// 2. 컨테이너 식별
		// -----------------------------------------------------------

		// A. "우수 인증 대학 명단" 컨테이너
		const excellentContainer = page
			.locator(".container")
			.filter({
				has: page.getByRole("heading", { name: "우수 인증 대학 명단" }),
			})
			.first();

		// B. "인증 대학 명단" (일반) 컨테이너
		// exact: true를 사용하여 "우수 인증..." 헤더가 아닌 정확히 "인증 대학 명단"인 곳만 찾음
		const certifiedContainer = page
			.locator(".container")
			.filter({
				has: page.getByRole("heading", { name: "인증 대학 명단", exact: true }),
			})
			.first();

		// -----------------------------------------------------------
		// 3. 데이터 추출
		// -----------------------------------------------------------
		const excellentData = createEmptyCategory();
		const degreeData = createEmptyCategory();
		const languageData = createEmptyCategory();

		// [3-1] 우수 인증 대학 수집 (단순 구조)
		console.log("🔍 우수 인증 대학 분석 중...");
		if ((await excellentContainer.count()) > 0) {
			const dls = excellentContainer.locator("dl.line-box");
			const count = await dls.count();
			for (let i = 0; i < count; i++) {
				const dl = dls.nth(i);
				const title = await dl.locator("dt").innerText();
				const typeKey = getSchoolTypeKey(title);
				if (typeKey) {
					const text = await dl.locator("dd p.text-basic").innerText();
					excellentData[typeKey].push(...parseUniversityString(text));
				}
			}
		}

		// [3-2] 일반 인증 대학 수집 (학위/어학 분리 필요)
		// 핵심 로직 변경: 모든 DL을 돌면서 DOM 부모 체크(closest)로 분류
		console.log("🔍 일반 인증 대학(학위/어학) 분석 중...");
		if ((await certifiedContainer.count()) > 0) {
			const dls = certifiedContainer.locator("dl.line-box");
			const count = await dls.count();

			for (let i = 0; i < count; i++) {
				const dl = dls.nth(i);

				// 1. 해당 DL이 .content-wrap (어학연수 영역) 안에 있는지 확인
				// Playwright의 evaluate를 사용하여 브라우저 컨텍스트 내에서 DOM 확인
				const isLanguageCourse = await dl.evaluate((el) => {
					return el.closest(".content-wrap") !== null;
				});

				// 2. 데이터 추출
				const title = await dl.locator("dt").innerText();
				const typeKey = getSchoolTypeKey(title);

				if (typeKey) {
					const text = await dl.locator("dd p.text-basic").innerText();
					const schools = parseUniversityString(text);

					if (isLanguageCourse) {
						languageData[typeKey].push(...schools);
					} else {
						degreeData[typeKey].push(...schools);
					}
				}
			}
		}

		// -----------------------------------------------------------
		// 4. 결과 요약 출력
		// -----------------------------------------------------------
		const sum = (cat: CategoryList) =>
			cat.university.length + cat.college.length + cat.graduate.length;

		console.log(`✨ 수집 결과:`);
		console.log(
			`   - 우수 인증: ${sum(excellentData)}개 (일반: ${excellentData.university.length}, 전문: ${excellentData.college.length}, 대학원: ${excellentData.graduate.length})`,
		);
		console.log(
			`   - 학위 과정: ${sum(degreeData)}개 (일반: ${degreeData.university.length}, 전문: ${degreeData.college.length}, 대학원: ${degreeData.graduate.length})`,
		);
		console.log(
			`   - 어학 연수: ${sum(languageData)}개 (일반: ${languageData.university.length}, 전문: ${languageData.college.length}, 대학원: ${languageData.graduate.length})`,
		);

		// -----------------------------------------------------------
		// 5. 파일 저장
		// -----------------------------------------------------------
		const result: AccreditedRawData = {
			lastModified,
			scrapedAt: new Date().toISOString(),
			excellent: excellentData,
			degree: degreeData,
			language: languageData,
		};

		const dir = path.dirname(OUTPUT_FILE);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf-8");
		console.log(`✅ 저장 완료: ${OUTPUT_FILE}`);
	} catch (err) {
		console.error("❌ 에러 발생:", err);
	} finally {
		await browser.close();
	}
}

scrapeRaw().catch((err) => {
	console.error(err);
	process.exit(1);
});

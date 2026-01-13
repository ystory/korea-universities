import fs from "node:fs";
import path from "node:path";
import type {
	AccreditationStatus,
	Establishment,
	LibraryMetadata,
	Region,
	SchoolLevel,
	SchoolType,
	University,
	UniversityData,
} from "../src";

// 파일 경로 설정
const DATA_DIR = path.resolve(process.cwd(), "src/data");
const SRC_UNIV_FILE = path.join(DATA_DIR, "universities.json");
const SRC_ACC_FILE = path.join(DATA_DIR, "accredited.json");
const OUTPUT_FILE = path.join(DATA_DIR, "universities-final.json");
const META_FILE = path.join(DATA_DIR, "metadata.json");

// 인증 데이터 타입 (accredited.json 구조)
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

let NEXT_ID = 90000;

function parseTargetString(text: string) {
	const match = text.match(/^(.*?)(?:\((.*?)\))?$/);
	if (!match) return { name: text.trim(), condition: null };
	return {
		name: match[1].trim(),
		condition: match[2]?.trim() || null,
	};
}

function findMatchingIds(
	targetString: string,
	universities: UniversityData[],
): number[] {
	const { name, condition } = parseTargetString(targetString);

	// Case 1: 명지대학교 예외 처리
	if (name === "명지대학교") {
		if (condition === "서울캠퍼스") {
			return universities
				.filter(
					(u) => u.nameKr.includes("명지대학교") && u.region === "서울특별시",
				)
				.map((u) => u.id);
		}
		return universities
			.filter((u) => u.nameKr.includes("명지대학교") && u.region === "경기도")
			.map((u) => u.id);
	}

	// 규칙 A, B, C 적용
	if (!condition) {
		return universities.filter((u) => u.nameKr === name).map((u) => u.id);
	}
	if (condition === "본교") {
		return universities
			.filter(
				(u) =>
					u.nameKr === name &&
					(u.campus === "제1캠퍼스" || u.campus === "본교" || !u.campus),
			)
			.map((u) => u.id);
	}
	return universities
		.filter((u) => {
			const targetNameConstructed = `${name} ${condition}캠퍼스`;
			return (
				u.nameKr === targetNameConstructed ||
				(u.nameKr === name && u.campus?.includes(condition))
			);
		})
		.map((u) => u.id);
}

/**
 * 💡 누락된 대학 정보를 생성합니다.
 * targetLevel 파라미터를 통해 4년제/전문대/대학원대학을 구분하여 생성합니다.
 */
function createMissingUniversity(
	nameRaw: string,
	targetLevel: SchoolLevel,
): University {
	const { name, condition } = parseTargetString(nameRaw);

	// Type 결정 로직
	let type: SchoolType = "대학교";
	if (targetLevel === "전문대학") type = "전문대학";
	else if (targetLevel === "대학원대학") type = "대학원대학";

	const newUniversity: University = {
		id: NEXT_ID++,
		nameKr: name,
		link: undefined,
		campus: condition || undefined, // 괄호 안 내용이 있으면 캠퍼스명으로 활용

		// 💡 요청사항 반영: 추정치 대신 '기타' 사용
		level: targetLevel,
		type: type,
		establishment: "기타" as Establishment,
		region: "기타" as Region,

		accreditation: {
			degree: false,
			language: false,
			excellent: false,
		},
	};

	console.log(
		`➕ [자동추가] ${targetLevel}: ${name} (조건: ${condition || "없음"})`,
	);
	return newUniversity;
}

async function build() {
	console.log("🚀 데이터 병합 및 매칭 작업을 시작합니다...");

	if (!fs.existsSync(SRC_UNIV_FILE) || !fs.existsSync(SRC_ACC_FILE)) {
		console.error("❌ 소스 데이터가 없습니다.");
		process.exit(1);
	}

	const universitiesRaw: UniversityData[] = JSON.parse(
		fs.readFileSync(SRC_UNIV_FILE, "utf-8"),
	);
	const accreditationRaw: AccreditedRawData = JSON.parse(
		fs.readFileSync(SRC_ACC_FILE, "utf-8"),
	);

	// 초기 데이터 변환
	const universities: University[] = universitiesRaw.map((u) => ({
		...u,
		accreditation: { degree: false, language: false, excellent: false },
	}));

	/**
	 * 💡 핵심 로직 변경:
	 * 단순히 리스트를 합치지 않고, 카테고리(univ/college/grad) 별로 순회하며
	 * 매칭 실패 시 올바른 Level로 생성합니다.
	 */
	const processCategory = (
		list: string[],
		field: keyof AccreditationStatus,
		level: SchoolLevel,
	) => {
		for (const targetString of list) {
			let matchedIds = findMatchingIds(targetString, universities);

			// 매칭 안 되면 -> 해당 Level로 신규 생성
			if (matchedIds.length === 0) {
				const newUni = createMissingUniversity(targetString, level);
				universities.push(newUni);
				matchedIds = [newUni.id];
			}

			// 인증 마킹
			for (const id of matchedIds) {
				const uni = universities.find((u) => u.id === id);
				if (uni) {
					uni.accreditation[field] = true;
				}
			}
		}
	};

	// 1. 학위 과정 (Degree) 처리
	console.log("--- 학위 과정 매칭 중 ---");
	processCategory(accreditationRaw.degree.university, "degree", "대학(4년제)");
	processCategory(accreditationRaw.degree.college, "degree", "전문대학");
	processCategory(accreditationRaw.degree.graduate, "degree", "대학원대학"); // 👈 대학원대학 분리 처리

	// 2. 어학 연수 (Language) 처리
	console.log("--- 어학 연수 매칭 중 ---");
	processCategory(
		accreditationRaw.language.university,
		"language",
		"대학(4년제)",
	);
	processCategory(accreditationRaw.language.college, "language", "전문대학");
	processCategory(accreditationRaw.language.graduate, "language", "대학원대학");

	// 3. 우수 인증 (Excellent) 처리
	console.log("--- 우수 인증 매칭 중 ---");
	processCategory(
		accreditationRaw.excellent.university,
		"excellent",
		"대학(4년제)",
	);
	processCategory(accreditationRaw.excellent.college, "excellent", "전문대학");
	processCategory(
		accreditationRaw.excellent.graduate,
		"excellent",
		"대학원대학",
	);

	// 통계 출력
	const stats = {
		total: universities.length,
		university: universities.filter((u) => u.level === "대학(4년제)").length,
		college: universities.filter((u) => u.level === "전문대학").length,
		graduate: universities.filter((u) => u.level === "대학원대학").length,
		accredited: universities.filter(
			(u) => u.accreditation.degree || u.accreditation.language,
		).length,
	};

	console.log(`✨ 최종 결과 요약:`);
	console.log(`   - 전체 대학 수: ${stats.total}`);
	console.log(
		`   - 분류별: 4년제(${stats.university}), 전문대(${stats.college}), 대학원대학(${stats.graduate})`,
	);
	console.log(`   - 인증 대학 수: ${stats.accredited}`);

	// 저장
	universities.sort((a, b) => a.id - b.id);
	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(universities, null, 2), "utf-8");
	console.log(`✅ 대학 데이터 저장 완료: ${OUTPUT_FILE}`);

	const metadata: LibraryMetadata = {
		builtAt: new Date().toISOString(),
		sourceLastModified: accreditationRaw.lastModified,
		sources: [
			"커리어넷 (career.go.kr)",
			"한국유학종합시스템 (studyinkorea.go.kr)",
		],
		stats: {
			total: stats.total,
			university: stats.university,
			college: stats.college,
			graduate: stats.graduate,
			accredited: stats.accredited,
		},
	};

	fs.writeFileSync(META_FILE, JSON.stringify(metadata, null, 2), "utf-8");
	console.log(`✅ 메타데이터 저장 완료: ${META_FILE}`);
}

build().catch((err) => {
	console.error(err);
	process.exit(1);
});

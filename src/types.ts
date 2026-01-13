import type {
	ALL_SCHOOL_TYPES,
	ESTABLISHMENTS,
	REGIONS,
	SCHOOL_LEVELS,
} from "./constants";

// ---------------------------------------------------------
// 1. Literal Types (상수에서 추출)
// ---------------------------------------------------------

/** 지역 (예: '서울특별시' | '경기도' ...) */
export type Region = (typeof REGIONS)[number];

/** 설립 구분 ('국립' | '공립' | '사립') */
export type Establishment = (typeof ESTABLISHMENTS)[number];

/** 학교 분류 ('대학(4년제)' | '전문대학') */
export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];

/** 학교 세부 유형 ('대학교' | '전문대학' | '교육대학' ...) */
export type SchoolType = (typeof ALL_SCHOOL_TYPES)[number];

// ---------------------------------------------------------
// 2. Interface Definitions
// ---------------------------------------------------------

/**
 * 인증(IEQAS) 상세 상태
 */
export interface AccreditationStatus {
	/** 학위과정 인증 여부 */
	degree: boolean;
	/** 어학연수 과정 인증 여부 */
	language: boolean;
	/** 우수 인증 대학 여부 */
	excellent: boolean;
}

/**
 * 대학교 원본 데이터 구조 (universities.json)
 */
export interface UniversityData {
	/** 사이트 제공 순번 (예: 466) */
	id: number;
	/** 학교명 (예: 가천대학교) - *캠퍼스명 제외* */
	nameKr: string;
	/** 학교 홈페이지 URL (없는 경우도 있음) */
	link?: string;
	/** 캠퍼스명 (예: 제1캠퍼스, 본교, 글로컬) */
	campus?: string;

	/** 학교 분류 (4년제 vs 전문대) */
	level: SchoolLevel;
	/** 학교 세부 유형 (대학교, 교육대학 등) */
	type: SchoolType;
	/** 설립 구분 */
	establishment: Establishment;
	/** 지역 */
	region: Region;
}

/**
 * 애플리케이션용 대학교 객체 (인증 정보 포함)
 */
export interface University extends UniversityData {
	/** 인증 정보 객체 */
	accreditation: AccreditationStatus;
}

// ---------------------------------------------------------
// 3. Search & Filter Options
// ---------------------------------------------------------

export interface SearchOptions {
	/** 지역 필터 */
	region?: Region;
	/** 학교 분류 필터 (4년제/전문대) */
	level?: SchoolLevel;
	/** 설립 구분 필터 (국립/사립/공립) */
	establishment?: Establishment;

	/**
	 * 인증 대학 여부
	 * true일 경우 학위(degree) or 어학(language) 중 하나라도 인증 시 포함
	 */
	isAccredited?: boolean;
	/** 우수 인증 대학만 필터링 */
	onlyExcellent?: boolean;
}

// ---------------------------------------------------------
// 4. Metadata
// ---------------------------------------------------------

export interface LibraryMetadata {
	/** 데이터 빌드 시점 (ISO String) */
	builtAt: string;
	/** 원본 데이터(인증 대학) 최종 수정일 */
	sourceLastModified?: string;
	/** 데이터 출처 목록 */
	sources: string[];
	/** 데이터 통계 */
	stats: {
		total: number;
		university: number;
		college: number;
		graduate: number;
		accredited: number;
	};
}

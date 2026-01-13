// 지역 (17개 시도 + 해외)
export const REGIONS = [
	"서울특별시",
	"부산광역시",
	"대구광역시",
	"인천광역시",
	"광주광역시",
	"대전광역시",
	"울산광역시",
	"세종특별자치시",
	"경기도",
	"강원특별자치도",
	"충청북도",
	"충청남도",
	"전북특별자치도",
	"전라남도",
	"경상북도",
	"경상남도",
	"제주특별자치도",
	"해외",
	"기타",
] as const;

// 설립 구분
export const ESTABLISHMENTS = ["국립", "공립", "사립", "기타"] as const;

// 학교 분류 (Level 1)
export const SCHOOL_LEVELS = ["대학(4년제)", "전문대학", "대학원대학"] as const;

// 학교 세부 유형 (Level 2) - 4년제
export const UNIVERSITY_TYPES = [
	"대학교",
	"교육대학",
	"산업대학",
	"사이버대학(대학)",
	"각종대학(대학)",
	"사내대학(대학)",
	"원격대학(대학)",
	"기술대학",
	"방송통신대학교",
] as const;

// 학교 세부 유형 (Level 2) - 전문대
export const COLLEGE_TYPES = [
	"전문대학",
	"기능대학",
	"사이버대학(전문)",
	"전공대학",
	"사내대학(전문)",
	"원격대학(전문)",
] as const;

// 학교 세부 유형 (Level 2) - 대학원대학
export const GRADUATE_TYPES = ["대학원대학"] as const;

export const ALL_SCHOOL_TYPES = [
	...UNIVERSITY_TYPES,
	...COLLEGE_TYPES,
	...GRADUATE_TYPES,
] as const;

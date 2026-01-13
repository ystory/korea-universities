import { describe, expect, it } from "vitest";
import {
	getAllUniversities,
	getLibraryMetadata,
	getUniversities,
	searchUniversities,
} from "../index";

describe("Korea Universities Library", () => {
	it("should load all universities", () => {
		const all = getAllUniversities();
		expect(all.length).toBeGreaterThan(0);
		// Based on the provided json file, check count roughly
		expect(all.length).toBe(476 + 15); // Universities + Graduate Schools in JSON
	});

	it("should be sorted alphabetically (Ga-Na-Da)", () => {
		const all = getAllUniversities();
		const first = all[0];
		const last = all[all.length - 1];

		// '가' comes before '힝'
		expect(first.nameKr.localeCompare(last.nameKr, "ko")).toBe(-1);

		// Check actual first element based on data (Available: 가천대학교 or 가야대학교 etc.)
		expect(first.nameKr.startsWith("가")).toBe(true);
	});

	describe("searchUniversities", () => {
		it("should perform prefix match", () => {
			const results = searchUniversities("고려");
			const kims = results.map((u) => u.nameKr);
			expect(kims).toContain("고려대학교");
			expect(kims).toContain("고려사이버대학교");
		});

		it("should perform infix (middle) match", () => {
			// '서울' should match '디지털서울문화예술대학교'
			const results = searchUniversities("서울");
			const names = results.map((u) => u.nameKr);

			expect(names).toContain("서울대학교"); // Prefix
			expect(names).toContain("디지털서울문화예술대학교"); // Infix
		});

		it("should be space-insensitive", () => {
			// '한국 공학' -> '한국공학대학교'
			const results = searchUniversities("한국 공학");
			const names = results.map((u) => u.nameKr);
			expect(names).toContain("한국공학대학교");
		});

		it("should return empty array for no match", () => {
			const results = searchUniversities("존재하지않는대학교이름123");
			expect(results).toHaveLength(0);
		});
	});

	describe("getUniversities (Filters)", () => {
		it("should filter by region", () => {
			const jejuUnis = getUniversities({ region: "제주특별자치도" });
			expect(jejuUnis.length).toBeGreaterThan(0);
			expect(jejuUnis.every((u) => u.region === "제주특별자치도")).toBe(true);
		});

		it("should filter by school level", () => {
			const colleges = getUniversities({ level: "전문대학" });
			expect(colleges.every((u) => u.level === "전문대학")).toBe(true);
		});

		it("should filter by establishment", () => {
			const nationals = getUniversities({ establishment: "국립" });
			expect(nationals.every((u) => u.establishment === "국립")).toBe(true);
		});

		it("should filter by accreditation", () => {
			const accredited = getUniversities({ isAccredited: true });
			expect(
				accredited.every(
					(u) =>
						u.accreditation.degree ||
						u.accreditation.language ||
						u.accreditation.excellent,
				),
			).toBe(true);
		});
	});

	describe("Combined Search & Filter", () => {
		it("should search within filtered region", () => {
			// Search '대학' in '제주' region
			const results = searchUniversities("제주", { level: "대학(4년제)" });

			expect(results.every((u) => u.level === "대학(4년제)")).toBe(true);
			expect(results.map((u) => u.nameKr)).toContain("제주대학교");
			// Should not contain '제주한라대학교' (which is 전문대학 in provided json)
			const halla = results.find((u) => u.nameKr === "제주한라대학교");
			expect(halla).toBeUndefined();
		});
	});

	describe("Library Metadata", () => {
		it("should provide valid metadata", () => {
			const meta = getLibraryMetadata();

			expect(meta).toBeDefined();
			expect(meta.sources).toContain("커리어넷 (career.go.kr)");
			expect(meta.stats.total).toBeGreaterThan(0);

			// 날짜 형식 체크
			expect(new Date(meta.builtAt).toString()).not.toBe("Invalid Date");
		});
	});
});

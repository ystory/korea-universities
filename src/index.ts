import metaData from "./data/metadata.json";
import rawData from "./data/universities-final.json";
import type { LibraryMetadata, SearchOptions, University } from "./types";

// --------------------------------------------------------------------------
// 1. Initialization & Pre-computation
// --------------------------------------------------------------------------

/**
 * Validated and Sorted Data Source
 */
const SOURCE_DATA = rawData as University[];

// Sort alphabetical order (Ga-Na-Da) strictly for Korean
SOURCE_DATA.sort((a, b) => a.nameKr.localeCompare(b.nameKr, "ko"));

/**
 * Internal Search Index Interface
 */
interface SearchIndexItem {
	/** Reference to the original object */
	data: University;
	/**
	 * Pre-computed search string
	 * - Lowercase
	 * - No spaces
	 * - Used for high-performance substring matching
	 */
	searchKey: string;
}

// Generate Search Index
// This runs once at module load time to optimize future searches
const SEARCH_INDEX: SearchIndexItem[] = SOURCE_DATA.map((uni) => ({
	data: uni,
	searchKey: uni.nameKr.replace(/\s+/g, "").toLowerCase(),
}));

// --------------------------------------------------------------------------
// 2. Core Functions
// --------------------------------------------------------------------------

/**
 * Get the full list of universities sorted alphabetically (Ga-Na-Da).
 * Returns the raw array reference (readonly recommended).
 */
export function getAllUniversities(): ReadonlyArray<University> {
	return SOURCE_DATA;
}

export function getLibraryMetadata(): LibraryMetadata {
	return metaData;
}

export const LIBRARY_METADATA: LibraryMetadata = metaData;

/**
 * Filter universities based on specific criteria (Region, Type, Accreditation).
 *
 * @param options - Filter options
 * @returns Filtered array of universities
 */
export function getUniversities(options: SearchOptions): University[] {
	// Optimization: If no options are provided, return all
	if (Object.keys(options).length === 0) {
		return [...SOURCE_DATA];
	}

	return SOURCE_DATA.filter((uni) => applyFilters(uni, options));
}

/**
 * Search universities by name with support for prefix and infix matching.
 *
 * Performance Features:
 * - Uses pre-computed space-less keys.
 * - Supports filtering options simultaneously.
 * - Search is case-insensitive.
 *
 * @param query - The search keyword (e.g., "서울", "한국 공학")
 * @param options - Optional filters to apply alongside search
 * @returns Array of matched universities
 */
export function searchUniversities(
	query: string,
	options?: SearchOptions,
): University[] {
	const trimmedQuery = query.trim();

	// 1. If query is empty, behavior depends on options
	if (!trimmedQuery) {
		return options ? getUniversities(options) : [...SOURCE_DATA];
	}

	// 2. Normalize query: remove spaces, lowercase
	const normalizedQuery = trimmedQuery.replace(/\s+/g, "").toLowerCase();

	// 3. Search using the Index
	const results: University[] = [];

	for (let i = 0; i < SEARCH_INDEX.length; i++) {
		const { data, searchKey } = SEARCH_INDEX[i];

		// A. Check Filters first (Fail fast)
		if (options && !applyFilters(data, options)) {
			continue;
		}

		// B. Check String Match (Prefix OR Infix)
		if (searchKey.includes(normalizedQuery)) {
			results.push(data);
		}
	}

	return results;
}

// --------------------------------------------------------------------------
// 3. Helper Functions
// --------------------------------------------------------------------------

/**
 * Internal helper to check if a university matches the given filters.
 */
function applyFilters(uni: University, options: SearchOptions): boolean {
	// 1. Region Filter
	if (options.region && uni.region !== options.region) {
		return false;
	}

	// 2. Level Filter (4년제 vs 전문대)
	if (options.level && uni.level !== options.level) {
		return false;
	}

	// 3. Establishment Filter (국립/사립 etc)
	if (options.establishment && uni.establishment !== options.establishment) {
		return false;
	}

	// 4. Accreditation Check (Any valid accreditation)
	if (options.isAccredited) {
		const { degree, language, excellent } = uni.accreditation;
		if (!degree && !language && !excellent) {
			return false;
		}
	}

	// 5. Excellent Accreditation Check
	return !(options.onlyExcellent && !uni.accreditation.excellent);
}

export * from "./constants";
// Re-export types for consumers
export * from "./types";

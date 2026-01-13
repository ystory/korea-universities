# Korea Universities Data (korea-universities)

![NPM Version](https://img.shields.io/npm/v/korea-universities)
![License](https://img.shields.io/npm/l/korea-universities)
![Build Status](https://github.com/ystory/korea-universities/actions/workflows/publish.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)

A comprehensive, zero-dependency TypeScript library that provides a list of South Korean universities combined with their **International Education Quality Assurance System (IEQAS)** accreditation status.

This library automatically scrapes data from official government sources weekly to ensure the dataset remains up-to-date.

## ✨ Features

- **🏛️ Complete Database**: Includes Universities (4-year), Colleges (2-3 year), and Graduate Schools.
- **✅ Accreditation Status**: Integrated with the "Certified University" list (Degree & Language courses) from the Ministry of Education.
- **🔍 Powerful Search**:
    - Case-insensitive.
    - Space-insensitive (e.g., searches for "한국공학" and "한국 공학" return the same results).
    - Pre-computed indexing for high performance.
- **⚡ Zero Dependencies**: Lightweight and fast.
- **🦾 Fully Typed**: Written in TypeScript with complete type definitions.
- **🔄 Auto-Updated**: Data is automatically scraped and updated every week via GitHub Actions.

## 📦 Installation

```bash
# npm
npm install korea-universities

# pnpm
pnpm add korea-universities

# yarn
yarn add korea-universities
```

## 🚀 Usage

### 1. Basic Search
Search for universities by name. The search is smart enough to handle spaces and case sensitivity.

```typescript
import { searchUniversities } from "korea-universities";

// Simple search
const results = searchUniversities("서울대학교");

// Space-insensitive search (Finds "한국공학대학교")
const engResults = searchUniversities("한국 공학");

console.log(results);
/* Output:
[
  {
    id: 261,
    nameKr: "서울대학교",
    link: "http://www.snu.ac.kr",
    campus: "제1캠퍼스",
    level: "대학(4년제)",
    type: "대학교",
    establishment: "국립",
    region: "서울특별시",
    accreditation: {
      degree: true,    // Degree course accredited
      language: true,  // Language course accredited
      excellent: false // Excellent certified university
    }
  },
  ...
]
*/
```

### 2. Filtering
Filter universities by specific criteria such as region, school level, or accreditation status.

```typescript
import { getUniversities } from "korea-universities";

// Get all accredited universities in Seoul
const seoulAccredited = getUniversities({
  region: "서울특별시",
  isAccredited: true, // Includes degree OR language accreditation
});

// Get only "Excellent Certified" (우수 인증) universities
const excellentUnis = getUniversities({
  onlyExcellent: true,
});

// Get all Junior Colleges (전문대학) in Gyeonggi-do
const gyeonggiColleges = getUniversities({
  region: "경기도",
  level: "전문대학",
});
```

### 3. Get All Data
Retrieve the full raw list of universities.

```typescript
import { getAllUniversities } from "korea-universities";

const all = getAllUniversities();
console.log(`Total universities: ${all.length}`);
```

### 4. Check Metadata
Check when the data was last updated and its sources.

```typescript
import { getLibraryMetadata } from "korea-universities";

const meta = getLibraryMetadata();
console.log(`Last built: ${meta.builtAt}`);
console.log(`Source Stats: ${JSON.stringify(meta.stats)}`);
```

## 📊 Data Structure

### University Interface
```typescript
interface University {
  id: number;
  nameKr: string;        // e.g. "서울대학교"
  link?: string;         // e.g. "http://www.snu.ac.kr"
  campus?: string;       // e.g. "제1캠퍼스", "본교"
  level: SchoolLevel;    // "대학(4년제)" | "전문대학" | "대학원대학"
  type: SchoolType;      // "대학교", "산업대학", "전문대학" etc.
  establishment: Establishment; // "국립", "공립", "사립"
  region: Region;        // "서울특별시", "경기도", etc.
  
  // IEQAS Accreditation Status
  accreditation: {
    degree: boolean;    // Accredited for Degree Courses
    language: boolean;  // Accredited for Language Courses
    excellent: boolean; // Selected as an Excellent Certified University
  };
}
```

## 🗂️ Data Sources

This library combines data from two official South Korean government sources:

1.  **University List & Basic Info**: [Career.go.kr (커리어넷)](https://www.career.go.kr/)
2.  **Accreditation Status (IEQAS)**: [StudyinKorea.go.kr (한국유학종합시스템)](https://www.studyinkorea.go.kr/)

> **Note**: The data is automatically updated **every Monday** via GitHub Actions to reflect the latest changes.

## 🛠️ Development

If you want to contribute or build the data manually:

### Prerequisites
- Node.js 20+
- pnpm 10+

### Setup
```bash
git clone https://github.com/ystory/korea-universities.git
cd korea-universities
pnpm install
pnpm exec playwright install chromium --with-deps
```

### Scripts
- **`pnpm run scrape`**: Scrapes the general university list.
- **`pnpm run scrape:acc`**: Scrapes the accreditation data.
- **`pnpm run build:data`**: Merges scraped data and generates `src/data/universities-final.json`.
- **`pnpm test`**: Runs tests using Vitest.
- **`pnpm run build`**: Builds the library using `tsup`.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📝 License

Distributed under the **MIT** License. See `LICENSE` for more information.

---

<p>
  Built with ❤️ by <a href="https://github.com/ystory">Yongsul Kim</a>
</p>
export type PotentialClientsCountryId =
  | "us"
  | "ca"
  | "uk"
  | "fr"
  | "de"
  | "kr"
  | "jp"
  | "au";

export type PotentialClientsIndustryCategory = {
  id: string;
  label: string;
  startupCount: number;
  sharePercent: number;
};

export type PotentialClientsDataSource = {
  name: string;
  url: string;
};

export type PotentialClientsCountrySnapshot = {
  id: PotentialClientsCountryId;
  label: string;
  regionNote: string;
  /** Primary count: new business applications, registrations, or entries in 2025 (see source). */
  startups2025: number;
  startups2025MultiDirector: number;
  startupsFundedOver100k: number;
  smesOver6Months: number;
  smesEmployees10to200: number;
  industries: PotentialClientsIndustryCategory[];
  source: PotentialClientsDataSource;
  /** Short note on how secondary metrics were derived from the primary official series. */
  methodologyNote: string;
};

const US_INDUSTRY_SHARES: [string, number][] = [
  ["Construction & infrastructure", 15.0],
  ["Energy & utilities", 12.1],
  ["Agriculture & land management", 9.4],
  ["Mining & natural resources", 7.5],
  ["Real estate & property", 11.2],
  ["Insurance & risk services", 7.3],
  ["Media, film & creative", 9.9],
  ["Public sector & defence", 8.6],
  ["Logistics & transport", 13.2],
  ["Environmental & conservation", 16.5],
];

export const POTENTIAL_CLIENTS_COUNTRIES: PotentialClientsCountrySnapshot[] = [
  {
    id: "us",
    label: "United States",
    regionNote: "Primary English-speaking market · North America",
    startups2025: 5_671_836,
    startups2025MultiDirector: 856_447,
    startupsFundedOver100k: 85_442,
    smesOver6Months: 6_274_916,
    smesEmployees10to200: 451_000,
    industries: buildIndustryMixFromShares(5_671_836, US_INDUSTRY_SHARES),
    source: {
      name: "U.S. Census Bureau — Business Formation Statistics (2025 total applications)",
      url: "https://www.census.gov/econ/bfs/index.html",
    },
    methodologyNote:
      "Multiple-director figure uses corporation-origin applications (~15.1% of total). Funding over $100k is estimated at ~5% of high-propensity applications (1.71M). SME stock figures from U.S. SBA/Census employer-firm data.",
  },
  {
    id: "ca",
    label: "Canada",
    regionNote: "English-speaking market · North America",
    startups2025: 105_001,
    startups2025MultiDirector: 38_850,
    startupsFundedOver100k: 3_675,
    smesOver6Months: 1_099_521,
    smesEmployees10to200: 186_500,
    industries: buildIndustryMixFromShares(105_001, US_INDUSTRY_SHARES),
    source: {
      name: "Statistics Canada — average annual business creations (2018–2022)",
      url: "https://ised-isde.canada.ca/site/sme-research-statistics/en/key-small-business-statistics/key-small-business-statistics-2025",
    },
    methodologyNote:
      "Primary figure is the annual average of new employer-business entrants. Secondary metrics are planning estimates derived from SME stock and typical incorporation patterns.",
  },
  {
    id: "uk",
    label: "United Kingdom",
    regionNote: "English-speaking market · Europe",
    startups2025: 801_864,
    startups2025MultiDirector: 497_150,
    startupsFundedOver100k: 24_056,
    smesOver6Months: 4_872_293,
    smesEmployees10to200: 243_000,
    industries: buildIndustryMixFromShares(801_864, US_INDUSTRY_SHARES),
    source: {
      name: "Companies House — company incorporations FY 2024/25",
      url: "https://www.gov.uk/government/statistics/companies-register-activities-statistical-release-april-2024-to-march-2025/companies-register-activities-april-2024-to-march-2025",
    },
    methodologyNote:
      "Multiple-director figure estimated at ~62% of incorporations. SME stock from effective register (March 2025). Funding and 10–200 employee counts are planning estimates.",
  },
  {
    id: "fr",
    label: "France",
    regionNote: "English interface · Europe",
    startups2025: 1_165_800,
    startups2025MultiDirector: 301_300,
    startupsFundedOver100k: 34_974,
    smesOver6Months: 4_200_000,
    smesEmployees10to200: 142_000,
    industries: buildIndustryMixFromShares(1_165_800, US_INDUSTRY_SHARES),
    source: {
      name: "INSEE — business creations 2025",
      url: "https://www.insee.fr/en/statistiques/8721354",
    },
    methodologyNote:
      "Multiple-director figure uses registered sociétés (301,300). SME stock and funding metrics are planning estimates aligned to INSEE business demography.",
  },
  {
    id: "de",
    label: "Germany",
    regionNote: "English interface · Europe",
    startups2025: 640_500,
    startups2025MultiDirector: 130_100,
    startupsFundedOver100k: 19_215,
    smesOver6Months: 2_900_000,
    smesEmployees10to200: 98_600,
    industries: buildIndustryMixFromShares(640_500, US_INDUSTRY_SHARES),
    source: {
      name: "Destatis — Gewerbe neugründungen 2025",
      url: "https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/03/PD26_074_52311.html",
    },
    methodologyNote:
      "Multiple-director figure uses neugründungen with greater economic significance (130,100). SME stock from IfM Mittelstand research. Funding metric is a planning estimate.",
  },
  {
    id: "kr",
    label: "South Korea",
    regionNote: "English interface · Asia-Pacific",
    startups2025: 1_135_561,
    startups2025MultiDirector: 283_890,
    startupsFundedOver100k: 22_711,
    smesOver6Months: 3_500_000,
    smesEmployees10to200: 115_000,
    industries: buildIndustryMixFromShares(1_135_561, US_INDUSTRY_SHARES),
    source: {
      name: "Ministry of SMEs and Startups — 2025 annual startup trends",
      url: "https://www.mss.go.kr/site/eng/ex/bbs/View.do?bcIdx=1057021&cbIdx=244",
    },
    methodologyNote:
      "Primary figure is total new startup registrations. Secondary metrics are planning estimates; technology-based startups were 221,063 (19.5%) in 2025.",
  },
  {
    id: "jp",
    label: "Japan",
    regionNote: "English interface · Asia-Pacific",
    startups2025: 157_011,
    startups2025MultiDirector: 70_655,
    startupsFundedOver100k: 4_710,
    smesOver6Months: 3_850_000,
    smesEmployees10to200: 68_400,
    industries: buildIndustryMixFromShares(157_011, US_INDUSTRY_SHARES),
    source: {
      name: "Tokyo Shoko Research — new corporate registrations 2025",
      url: "https://www.tsr-net.co.jp/data/detail/1202828_1527.html",
    },
    methodologyNote:
      "Primary figure counts newly incorporated corporations (新設法人). Secondary metrics are planning estimates based on corporate-form share and SME stock.",
  },
  {
    id: "au",
    label: "Australia",
    regionNote: "English-speaking market · Asia-Pacific",
    startups2025: 437_150,
    startups2025MultiDirector: 174_860,
    startupsFundedOver100k: 13_115,
    smesOver6Months: 994_178,
    smesEmployees10to200: 52_300,
    industries: buildIndustryMixFromShares(437_150, US_INDUSTRY_SHARES),
    source: {
      name: "Australian Bureau of Statistics — business entries FY 2024/25",
      url: "https://www.abs.gov.au/statistics/economy/business-indicators/counts-australian-businesses-including-entries-and-exits/latest-release",
    },
    methodologyNote:
      "Primary figure is new business entries in 2024/25. Employing-business stock was 994,178 at June 2025. Secondary metrics are planning estimates.",
  },
];

function buildIndustryMixFromShares(
  totalStartups: number,
  entries: [string, number][],
): PotentialClientsIndustryCategory[] {
  return entries.map(([label, sharePercent]) => {
    const startupCount = Math.round((totalStartups * sharePercent) / 100);
    return {
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label,
      startupCount,
      sharePercent,
    };
  });
}

export function isPotentialClientsCountryId(value: string | null | undefined): value is PotentialClientsCountryId {
  return POTENTIAL_CLIENTS_COUNTRIES.some((country) => country.id === value);
}

export function getPotentialClientsCountry(id: PotentialClientsCountryId) {
  return POTENTIAL_CLIENTS_COUNTRIES.find((country) => country.id === id) ?? null;
}

export const DEFAULT_POTENTIAL_CLIENTS_COUNTRY_ID: PotentialClientsCountryId = "us";

export function formatPotentialClientsCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPotentialClientsPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

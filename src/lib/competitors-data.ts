export type CompetitorRegion =
  | "us"
  | "uk"
  | "canada"
  | "spain"
  | "france"
  | "italy"
  | "germany"
  | "portugal"
  | "kenya"
  | "namibia"
  | "southafrica"
  | "congo";

export const COMPETITOR_REGION_IDS: CompetitorRegion[] = [
  "us",
  "uk",
  "canada",
  "spain",
  "france",
  "italy",
  "germany",
  "portugal",
  "kenya",
  "namibia",
  "southafrica",
  "congo",
];

export type Competitor = {
  id: string;
  region: CompetitorRegion;
  companyName: string;
  website: string;
  services: string;
  serviceCategories: string;
  droneTechnology: string;
  lastRevenue: string;
  notes: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const COMPETITOR_REGIONS: {
  id: CompetitorRegion;
  title: string;
  subtitle: string;
}[] = [
  { id: "us", title: "US", subtitle: "" },
  { id: "uk", title: "UK", subtitle: "" },
  { id: "canada", title: "Canada", subtitle: "" },
  { id: "spain", title: "Spain", subtitle: "" },
  { id: "france", title: "France", subtitle: "" },
  { id: "italy", title: "Italy", subtitle: "" },
  { id: "germany", title: "Germany", subtitle: "" },
  { id: "portugal", title: "Portugal", subtitle: "" },
  { id: "kenya", title: "Kenya", subtitle: "" },
  { id: "namibia", title: "Namibia", subtitle: "" },
  { id: "southafrica", title: "South Africa", subtitle: "" },
  { id: "congo", title: "Congo", subtitle: "" },
];

type DbCompetitor = {
  id: string;
  region: CompetitorRegion;
  company_name: string;
  website: string | null;
  services: string | null;
  service_categories: string | null;
  drone_technology: string | null;
  last_revenue: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function mapCompetitor(row: DbCompetitor): Competitor {
  return {
    id: row.id,
    region: row.region,
    companyName: row.company_name,
    website: row.website ?? "",
    services: row.services ?? "",
    serviceCategories: row.service_categories ?? "",
    droneTechnology: row.drone_technology ?? "",
    lastRevenue: row.last_revenue ?? "",
    notes: row.notes ?? "",
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createBlankCompetitorInput(region: CompetitorRegion) {
  return {
    region,
    companyName: "New Company",
    website: "",
    services: "",
    serviceCategories: "",
    droneTechnology: "",
    lastRevenue: "",
    notes: "",
  };
}

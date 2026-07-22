import type { CompetitorRegion } from "@/lib/competitors-data";

export type SaasCompetitorSeed = {
  companyName: string;
  website: string;
  services: string;
  serviceCategories: string;
  lastRevenue: string;
  notes: string;
  sortOrder: number;
};

/** Markets requested for Unit311 Central competitor coverage. */
export const SAAS_COMPETITOR_MARKETS: CompetitorRegion[] = [
  "us",
  "uk",
  "canada",
  "spain",
  "france",
  "italy",
  "germany",
];

export const SAAS_COMPETITOR_SEEDS: SaasCompetitorSeed[] = [
  {
    companyName: "Salesforce",
    website: "https://www.salesforce.com/",
    services: "Enterprise CRM, sales automation, service cloud, and marketing cloud suites.",
    serviceCategories: "other",
    lastRevenue: "$37.9B (FY2025)",
    notes: "Largest CRM platform; deep enterprise footprint across all listed markets.",
    sortOrder: 1,
  },
  {
    companyName: "HubSpot",
    website: "https://www.hubspot.com/",
    services: "Inbound CRM, marketing automation, sales pipeline, and customer service hubs.",
    serviceCategories: "other",
    lastRevenue: "$2.6B (2024)",
    notes: "Strong mid-market CRM and marketing automation presence.",
    sortOrder: 2,
  },
  {
    companyName: "Freshworks",
    website: "https://www.freshworks.com/",
    services: "CRM, IT service management, customer support, and marketing suites for growing teams.",
    serviceCategories: "other",
    lastRevenue: "$720M (2024 est.)",
    notes: "Competes in CRM and support desks against HubSpot and Salesforce.",
    sortOrder: 3,
  },
  {
    companyName: "Monday.com",
    website: "https://monday.com/",
    services: "Work OS for projects, CRM boards, marketing workflows, and operations dashboards.",
    serviceCategories: "other",
    lastRevenue: "$972M (2024)",
    notes: "Work management platform expanding into CRM and service workflows.",
    sortOrder: 4,
  },
  {
    companyName: "Asana",
    website: "https://asana.com/",
    services: "Work management, project tracking, goals, and cross-team collaboration.",
    serviceCategories: "other",
    lastRevenue: "$724M (2024)",
    notes: "Project and portfolio management competitor in knowledge-work markets.",
    sortOrder: 5,
  },
  {
    companyName: "Zoho CRM",
    website: "https://www.zoho.com/crm/",
    services: "Affordable CRM with sales automation, analytics, and Zoho suite integrations.",
    serviceCategories: "other",
    lastRevenue: "$1.2B suite (2024 est.)",
    notes: "Price-competitive CRM alternative popular with SMBs.",
    sortOrder: 6,
  },
  {
    companyName: "Pipedrive",
    website: "https://www.pipedrive.com/",
    services: "Sales-focused CRM pipeline management for SMBs and revenue teams.",
    serviceCategories: "other",
    lastRevenue: "$200M (2024 est.)",
    notes: "Sales CRM specialist competing with HubSpot and Salesforce Essentials.",
    sortOrder: 7,
  },
  {
    companyName: "Airtable",
    website: "https://www.airtable.com/",
    services: "Flexible database, interface builder, and workflow automation for operations teams.",
    serviceCategories: "other",
    lastRevenue: "$300M (2024 est.)",
    notes: "No-code operations database competing with Notion and Monday.",
    sortOrder: 8,
  },
  {
    companyName: "Notion",
    website: "https://www.notion.so/",
    services: "Docs, wikis, projects, and AI workspace for teams and companies.",
    serviceCategories: "other",
    lastRevenue: "$300M (2024 est.)",
    notes: "All-in-one workspace overlapping with Asana and Monday use cases.",
    sortOrder: 9,
  },
  {
    companyName: "ClickUp",
    website: "https://clickup.com/",
    services: "Tasks, docs, goals, dashboards, and AI productivity for project teams.",
    serviceCategories: "other",
    lastRevenue: "$200M (2024 est.)",
    notes: "All-in-one work management challenger to Asana and Monday.",
    sortOrder: 10,
  },
  {
    companyName: "Atlassian Jira",
    website: "https://www.atlassian.com/software/jira",
    services: "Issue tracking, agile project management, and software delivery workflows.",
    serviceCategories: "other",
    lastRevenue: "$4.4B Atlassian (FY2025)",
    notes: "Dominant engineering project-tracking platform.",
    sortOrder: 11,
  },
  {
    companyName: "Microsoft Dynamics 365",
    website: "https://dynamics.microsoft.com/",
    services: "CRM and ERP cloud suite integrated with Microsoft 365 and Azure.",
    serviceCategories: "other",
    lastRevenue: "$5B+ Dynamics (2024 est.)",
    notes: "Enterprise CRM/ERP alternative to Salesforce in Microsoft-centric accounts.",
    sortOrder: 12,
  },
];

/** Inline SQL used when the migration file is not present in the serverless bundle. */
export const COMPETITORS_SAAS_MARKETS_INLINE_SQL = `
alter table public.competitors drop constraint if exists competitors_region_check;

alter table public.competitors
  add constraint competitors_region_check
  check (
    region in (
      'us','uk','canada','spain','france','italy','germany',
      'portugal','kenya','namibia','southafrica','congo',
      'northamerica','europe','asia','middleeast','africa','latam','global'
    )
  );
`;

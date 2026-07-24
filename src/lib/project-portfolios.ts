import type { InternalProject, ProjectPhase } from "@/lib/projects-data";

export type ProjectPortfolioScope = "internal" | "external" | "all";

export type PortfolioMilestone = {
  id: string;
  name: string;
  dueDate: string;
  status: "done" | "upcoming" | "at-risk";
};

export type PortfolioRisk = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  owner: string;
};

export type PortfolioProject = InternalProject & {
  kind: "internal" | "external";
  projectManager: string;
  budgetLabel: string;
  milestones: PortfolioMilestone[];
  risks: PortfolioRisk[];
  /** Internal: sponsoring department. External: unused. */
  department?: string;
  /** Internal stakeholders. */
  stakeholders?: string[];
  /** External account manager. */
  accountManager?: string;
  /** External commercial fields. */
  contractValueLabel?: string;
  deliveryStatus?: string;
  billingStatus?: string;
  customerContacts?: string[];
};

function project(
  partial: Omit<PortfolioProject, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
): PortfolioProject {
  return {
    createdAt: partial.createdAt ?? "2026-01-15T09:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-07-20T14:30:00.000Z",
    ...partial,
  };
}

/** Internal Projects — running our own business (no client field). */
export const INTERNAL_PROJECT_PORTFOLIO: PortfolioProject[] = [
  project({
    id: "int-crm-platform-upgrade",
    kind: "internal",
    name: "CRM Platform Upgrade",
    clientId: null,
    clientName: "Business Central",
    department: "Business Central",
    site: "Barcelona HQ · Platform Ops",
    region: "Group · Commercial Systems",
    operator: "Elena Vargas",
    projectManager: "Elena Vargas",
    phase: "live",
    startDate: "2026-02-03",
    endDate: "2026-09-30",
    progressPct: 58,
    budgetLabel: "€214,000",
    stakeholders: ["Chief Commercial Officer", "Sales Operations", "IT Security"],
    notes:
      "Migrate pipeline, discovery & client onboarding onto the upgraded CRM with SSO and audit trails.",
    milestones: [
      { id: "m1", name: "Discovery complete", dueDate: "2026-02-28", status: "done" },
      { id: "m2", name: "Sandbox cutover", dueDate: "2026-05-15", status: "done" },
      { id: "m3", name: "Production migration", dueDate: "2026-08-12", status: "upcoming" },
      { id: "m4", name: "Hypercare close", dueDate: "2026-09-30", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Historical pipeline field mapping gaps",
        severity: "medium",
        owner: "Elena Vargas",
      },
      {
        id: "r2",
        title: "Sales adoption lag in regional offices",
        severity: "low",
        owner: "Marcus Chen",
      },
    ],
  }),
  project({
    id: "int-hr-self-service",
    kind: "internal",
    name: "HR Self-Service Portal",
    clientId: null,
    clientName: "Human Resources",
    department: "Human Resources",
    site: "People Systems · Cloud",
    region: "Group · People",
    operator: "Priya Natarajan",
    projectManager: "Priya Natarajan",
    phase: "live",
    startDate: "2026-01-12",
    endDate: "2026-07-31",
    progressPct: 71,
    budgetLabel: "€96,500",
    stakeholders: ["CHRO", "Payroll Lead", "Employee Experience"],
    notes:
      "Employee portal for leave, payslips, personal data and onboarding checklists across all entities.",
    milestones: [
      { id: "m1", name: "Leave workflows live", dueDate: "2026-03-20", status: "done" },
      { id: "m2", name: "Payslip module UAT", dueDate: "2026-05-08", status: "done" },
      { id: "m3", name: "Manager approvals release", dueDate: "2026-07-10", status: "at-risk" },
      { id: "m4", name: "Full portal GA", dueDate: "2026-07-31", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Payroll vendor API rate limits",
        severity: "high",
        owner: "Priya Natarajan",
      },
      {
        id: "r2",
        title: "Works council sign-off in Germany entity",
        severity: "medium",
        owner: "Hannah Vogel",
      },
    ],
  }),
  project({
    id: "int-finance-reporting",
    kind: "internal",
    name: "Finance Reporting Modernisation",
    clientId: null,
    clientName: "Financials",
    department: "Financials",
    site: "Finance Shared Services",
    region: "Group · Finance",
    operator: "James Whitfield",
    projectManager: "James Whitfield",
    phase: "live",
    startDate: "2025-11-04",
    endDate: "2026-08-28",
    progressPct: 44,
    budgetLabel: "€168,000",
    stakeholders: ["CFO", "Controller", "Board Reporting"],
    notes:
      "Replace spreadsheet packs with governed board and management reporting from the general ledger.",
    milestones: [
      { id: "m1", name: "Chart of accounts alignment", dueDate: "2025-12-18", status: "done" },
      { id: "m2", name: "Management P&L prototype", dueDate: "2026-03-14", status: "done" },
      { id: "m3", name: "Board pack automation", dueDate: "2026-06-30", status: "at-risk" },
      { id: "m4", name: "Audit trail certification", dueDate: "2026-08-28", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Multi-entity FX revaluation rules incomplete",
        severity: "high",
        owner: "James Whitfield",
      },
      {
        id: "r2",
        title: "Month-end freeze window too short for cutover",
        severity: "medium",
        owner: "Sofia Almeida",
      },
    ],
  }),
  project({
    id: "int-office-network",
    kind: "internal",
    name: "Office Network Refresh",
    clientId: null,
    clientName: "Technology Management",
    department: "Technology Management",
    site: "Barcelona · Oxford · Remote hubs",
    region: "Group · Infrastructure",
    operator: "Tomás Ribeiro",
    projectManager: "Tomás Ribeiro",
    phase: "live",
    startDate: "2026-03-02",
    endDate: "2026-10-15",
    progressPct: 33,
    budgetLabel: "€142,750",
    stakeholders: ["CTO", "Facilities", "Information Security"],
    notes:
      "Replace core switching, Wi-Fi and SD-WAN at HQ and satellite offices with zero-trust segmentation.",
    milestones: [
      { id: "m1", name: "Design & BOM approved", dueDate: "2026-03-28", status: "done" },
      { id: "m2", name: "Barcelona core cutover", dueDate: "2026-06-20", status: "upcoming" },
      { id: "m3", name: "Oxford refresh", dueDate: "2026-08-22", status: "upcoming" },
      { id: "m4", name: "SD-WAN optimisation", dueDate: "2026-10-15", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Switch lead times slipped 4 weeks",
        severity: "high",
        owner: "Tomás Ribeiro",
      },
      {
        id: "r2",
        title: "After-hours window conflicts with board week",
        severity: "medium",
        owner: "Facilities Desk",
      },
    ],
  }),
  project({
    id: "int-iso-27001",
    kind: "internal",
    name: "ISO 27001 Certification",
    clientId: null,
    clientName: "QMS · Information Security",
    department: "Quality & Security",
    site: "Group ISMS programme",
    region: "Group · Compliance",
    operator: "Nadia Okonkwo",
    projectManager: "Nadia Okonkwo",
    phase: "live",
    startDate: "2025-09-01",
    endDate: "2026-11-30",
    progressPct: 62,
    budgetLabel: "€87,400",
    stakeholders: ["CISO", "QMS Lead", "Legal Counsel"],
    notes:
      "Establish ISMS controls, evidence packs and Stage 1/2 audit readiness across Unit311 Central.",
    milestones: [
      { id: "m1", name: "Gap assessment closed", dueDate: "2025-11-15", status: "done" },
      { id: "m2", name: "SoA approved", dueDate: "2026-02-27", status: "done" },
      { id: "m3", name: "Stage 1 audit", dueDate: "2026-08-05", status: "upcoming" },
      { id: "m4", name: "Stage 2 certification", dueDate: "2026-11-18", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Supplier assurance evidence incomplete",
        severity: "medium",
        owner: "Nadia Okonkwo",
      },
      {
        id: "r2",
        title: "Access review cadence missed in Q2",
        severity: "low",
        owner: "IT Operations",
      },
    ],
  }),
  project({
    id: "int-ai-knowledge",
    kind: "internal",
    name: "AI Knowledge Assistant",
    clientId: null,
    clientName: "Executive Office",
    department: "Executive Office",
    site: "EA platform · Knowledge layer",
    region: "Group · AI Operating Model",
    operator: "Lucas Ferreira",
    projectManager: "Lucas Ferreira",
    phase: "live",
    startDate: "2026-04-07",
    endDate: "2026-12-18",
    progressPct: 27,
    budgetLabel: "€125,000",
    stakeholders: ["CEO", "Head of Knowledge", "Data Protection Officer"],
    notes:
      "Internal AI assistant grounded in policies, playbooks and workspace documentation with human-in-the-loop.",
    milestones: [
      { id: "m1", name: "Corpus ingestion v1", dueDate: "2026-05-22", status: "done" },
      { id: "m2", name: "Pilot with leadership team", dueDate: "2026-07-31", status: "at-risk" },
      { id: "m3", name: "Role-based retrieval policies", dueDate: "2026-09-25", status: "upcoming" },
      { id: "m4", name: "Company-wide release", dueDate: "2026-12-18", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Hallucination risk on policy answers",
        severity: "high",
        owner: "Lucas Ferreira",
      },
      {
        id: "r2",
        title: "Stale document corpus in HR & Finance",
        severity: "medium",
        owner: "Knowledge Ops",
      },
    ],
  }),
  project({
    id: "int-website-redesign",
    kind: "internal",
    name: "Company Website Redesign",
    clientId: null,
    clientName: "Marketing",
    department: "Marketing & Brand",
    site: "Public web · CMS",
    region: "Group · Brand",
    operator: "Claire Fontaine",
    projectManager: "Claire Fontaine",
    phase: "upcoming",
    startDate: "2026-08-04",
    endDate: "2027-01-30",
    progressPct: 8,
    budgetLabel: "€74,200",
    stakeholders: ["CMO", "Product Marketing", "Website Management"],
    notes:
      "Rebuild public site IA, case studies and careers flows with measurable conversion tracking.",
    milestones: [
      { id: "m1", name: "Creative direction locked", dueDate: "2026-08-29", status: "upcoming" },
      { id: "m2", name: "CMS content migration", dueDate: "2026-10-16", status: "upcoming" },
      { id: "m3", name: "Soft launch", dueDate: "2026-12-09", status: "upcoming" },
      { id: "m4", name: "SEO & analytics harden", dueDate: "2027-01-30", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Brand asset library incomplete",
        severity: "medium",
        owner: "Claire Fontaine",
      },
      {
        id: "r2",
        title: "Legal review backlog on case studies",
        severity: "low",
        owner: "Legal Counsel",
      },
    ],
  }),
  project({
    id: "int-onboarding-opt",
    kind: "internal",
    name: "Employee Onboarding Optimisation",
    clientId: null,
    clientName: "Human Resources",
    department: "Human Resources",
    site: "People Ops · All entities",
    region: "Group · People Experience",
    operator: "Amelia Brooks",
    projectManager: "Amelia Brooks",
    phase: "live",
    startDate: "2026-02-16",
    endDate: "2026-08-14",
    progressPct: 49,
    budgetLabel: "€41,800",
    stakeholders: ["CHRO", "Hiring Managers", "IT Service Desk"],
    notes:
      "Compress time-to-productivity with day-0 device kits, access packs and structured 30/60/90 plans.",
    milestones: [
      { id: "m1", name: "Process map & SLAs", dueDate: "2026-03-06", status: "done" },
      { id: "m2", name: "Device kit standard", dueDate: "2026-04-24", status: "done" },
      { id: "m3", name: "Access pack automation", dueDate: "2026-07-03", status: "upcoming" },
      { id: "m4", name: "Manager checklist GA", dueDate: "2026-08-14", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Laptop buffer stock below target",
        severity: "medium",
        owner: "Amelia Brooks",
      },
      {
        id: "r2",
        title: "Identity provisioning delays on contractors",
        severity: "low",
        owner: "IT Service Desk",
      },
    ],
  }),
  project({
    id: "int-data-warehouse",
    kind: "internal",
    name: "Data Warehouse Implementation",
    clientId: null,
    clientName: "Business Intelligence",
    department: "Data & Analytics",
    site: "Cloud data platform",
    region: "Group · Data",
    operator: "Owen Gallagher",
    projectManager: "Owen Gallagher",
    phase: "live",
    startDate: "2025-10-13",
    endDate: "2026-09-25",
    progressPct: 55,
    budgetLabel: "€239,000",
    stakeholders: ["CFO", "Head of Analytics", "Engineering Platform"],
    notes:
      "Central warehouse for finance, CRM, HR and operations with governed semantic models.",
    milestones: [
      { id: "m1", name: "Landing zone live", dueDate: "2025-12-05", status: "done" },
      { id: "m2", name: "Finance mart v1", dueDate: "2026-03-27", status: "done" },
      { id: "m3", name: "CRM & HR marts", dueDate: "2026-07-17", status: "at-risk" },
      { id: "m4", name: "Self-serve BI rollout", dueDate: "2026-09-25", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "CRM incremental sync latency",
        severity: "high",
        owner: "Owen Gallagher",
      },
      {
        id: "r2",
        title: "PII classification incomplete for HR extracts",
        severity: "medium",
        owner: "Data Protection Officer",
      },
    ],
  }),
  project({
    id: "int-cyber-security",
    kind: "internal",
    name: "Internal Cyber Security Programme",
    clientId: null,
    clientName: "Information Security",
    department: "Information Security",
    site: "SOC · Endpoint · Identity",
    region: "Group · Security",
    operator: "Helena Krüger",
    projectManager: "Helena Krüger",
    phase: "upcoming",
    startDate: "2026-09-01",
    endDate: "2027-03-31",
    progressPct: 5,
    budgetLabel: "€178,500",
    stakeholders: ["CISO", "CTO", "Board Risk Committee"],
    notes:
      "Multi-year uplift: EDR standardisation, phishing simulation, privileged access and IR runbooks.",
    milestones: [
      { id: "m1", name: "Programme charter", dueDate: "2026-09-18", status: "upcoming" },
      { id: "m2", name: "EDR fleet standard", dueDate: "2026-11-28", status: "upcoming" },
      { id: "m3", name: "Privileged access hardening", dueDate: "2027-01-30", status: "upcoming" },
      { id: "m4", name: "Tabletop IR exercise", dueDate: "2027-03-20", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Security tooling budget contingent on FY27 plan",
        severity: "high",
        owner: "Helena Krüger",
      },
      {
        id: "r2",
        title: "OT/field device coverage gaps",
        severity: "medium",
        owner: "Operations Security",
      },
    ],
  }),
];

/** External Projects — customer delivery (distinct clients, PMs, commercial status). */
export const EXTERNAL_PROJECT_PORTFOLIO: PortfolioProject[] = [
  project({
    id: "ext-northwind-erp",
    kind: "external",
    name: "ERP Implementation for Northwind Manufacturing",
    clientId: "client-northwind",
    clientName: "Northwind Manufacturing",
    site: "Leeds plant · Finance & Supply Chain",
    region: "United Kingdom",
    operator: "Daniel Okoro",
    projectManager: "Daniel Okoro",
    accountManager: "Sophie Lang",
    phase: "live",
    startDate: "2025-12-01",
    endDate: "2026-10-31",
    progressPct: 61,
    budgetLabel: "£1.24m",
    contractValueLabel: "£1.24m",
    deliveryStatus: "On track",
    billingStatus: "Milestone 3 invoiced · 58% recognised",
    customerContacts: ["Rachel Holt (CFO)", "Ian Pratt (IT Director)"],
    notes:
      "Full ERP replace for manufacturing, inventory, finance and plant maintenance across three UK sites.",
    milestones: [
      { id: "m1", name: "Blueprint signed", dueDate: "2026-01-24", status: "done" },
      { id: "m2", name: "Finance module UAT", dueDate: "2026-04-18", status: "done" },
      { id: "m3", name: "Plant 1 go-live", dueDate: "2026-07-25", status: "upcoming" },
      { id: "m4", name: "Multi-site hypercare end", dueDate: "2026-10-31", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Shop-floor data cleansing backlog",
        severity: "high",
        owner: "Daniel Okoro",
      },
      {
        id: "r2",
        title: "Customer change freeze for peak season",
        severity: "medium",
        owner: "Sophie Lang",
      },
    ],
  }),
  project({
    id: "ext-apex-digital",
    kind: "external",
    name: "Digital Transformation for Apex Logistics",
    clientId: "client-apex",
    clientName: "Apex Logistics",
    site: "Rotterdam HQ · Network ops",
    region: "Benelux",
    operator: "Maya Lindström",
    projectManager: "Maya Lindström",
    accountManager: "Greg Palmer",
    phase: "live",
    startDate: "2026-01-20",
    endDate: "2026-11-20",
    progressPct: 39,
    budgetLabel: "€980,000",
    contractValueLabel: "€980,000",
    deliveryStatus: "Watch",
    billingStatus: "Retainer current · T&M overage pending PO",
    customerContacts: ["Joost van Dijk (COO)", "Anika Berg (Transformation Lead)"],
    notes:
      "End-to-end digital ops: TMS integration, yard visibility, customer portal and KPI control tower.",
    milestones: [
      { id: "m1", name: "Operating model design", dueDate: "2026-03-06", status: "done" },
      { id: "m2", name: "TMS interface live", dueDate: "2026-06-12", status: "at-risk" },
      { id: "m3", name: "Customer portal beta", dueDate: "2026-09-04", status: "upcoming" },
      { id: "m4", name: "Control tower GA", dueDate: "2026-11-20", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Legacy TMS vendor API undocumented",
        severity: "high",
        owner: "Maya Lindström",
      },
      {
        id: "r2",
        title: "Depot Wi-Fi upgrades delayed by landlord",
        severity: "medium",
        owner: "Greg Palmer",
      },
    ],
  }),
  project({
    id: "ext-city-m365",
    kind: "external",
    name: "Microsoft 365 Migration for City Council",
    clientId: "client-city-council",
    clientName: "City Council of Bristol",
    site: "Civic offices · Hybrid estate",
    region: "South West England",
    operator: "Harriet Quinn",
    projectManager: "Harriet Quinn",
    accountManager: "Ben Cartwright",
    phase: "live",
    startDate: "2026-02-09",
    endDate: "2026-08-21",
    progressPct: 74,
    budgetLabel: "£412,000",
    contractValueLabel: "£412,000",
    deliveryStatus: "On track",
    billingStatus: "Monthly schedule · 72% billed",
    customerContacts: ["Olivia Grant (CIO)", "Paul Meade (Service Desk Manager)"],
    notes:
      "Exchange, SharePoint and Teams migration for 4,800 seats with retention and eDiscovery controls.",
    milestones: [
      { id: "m1", name: "Pilot wave complete", dueDate: "2026-03-20", status: "done" },
      { id: "m2", name: "Wave 3 departments", dueDate: "2026-05-29", status: "done" },
      { id: "m3", name: "Legacy mail decommission", dueDate: "2026-07-24", status: "upcoming" },
      { id: "m4", name: "Service acceptance", dueDate: "2026-08-21", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Public records retention holdouts",
        severity: "medium",
        owner: "Harriet Quinn",
      },
      {
        id: "r2",
        title: "Councillor mailbox exceptions",
        severity: "low",
        owner: "Ben Cartwright",
      },
    ],
  }),
  project({
    id: "ext-global-warehouse",
    kind: "external",
    name: "Warehouse Automation for Global Distribution",
    clientId: "client-global-dist",
    clientName: "Global Distribution PLC",
    site: "Midlands DC · Automation hall",
    region: "United Kingdom",
    operator: "Viktor Novak",
    projectManager: "Viktor Novak",
    accountManager: "Laura Mendes",
    phase: "live",
    startDate: "2025-09-15",
    endDate: "2026-12-11",
    progressPct: 52,
    budgetLabel: "£2.05m",
    contractValueLabel: "£2.05m",
    deliveryStatus: "At risk",
    billingStatus: "Equipment milestone held · 41% billed",
    customerContacts: ["Steve Nolan (Supply Chain Dir.)", "Kim Adeyemi (Programme Sponsor)"],
    notes:
      "AS/RS, WMS integration and conveyor controls for the Midlands fulfilment centre.",
    milestones: [
      { id: "m1", name: "Equipment FAT", dueDate: "2026-01-30", status: "done" },
      { id: "m2", name: "WMS interface freeze", dueDate: "2026-04-10", status: "done" },
      { id: "m3", name: "Live putaway automation", dueDate: "2026-09-04", status: "at-risk" },
      { id: "m4", name: "Throughput acceptance", dueDate: "2026-12-11", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Conveyor OEM commissioning delay",
        severity: "high",
        owner: "Viktor Novak",
      },
      {
        id: "r2",
        title: "Peak-season blackout window",
        severity: "high",
        owner: "Laura Mendes",
      },
    ],
  }),
  project({
    id: "ext-freshmart-pos",
    kind: "external",
    name: "Retail POS Rollout for FreshMart",
    clientId: "client-freshmart",
    clientName: "FreshMart Retail Group",
    site: "148 stores · National estate",
    region: "Iberia",
    operator: "Inês Carvalho",
    projectManager: "Inês Carvalho",
    accountManager: "Marco Silva",
    phase: "live",
    startDate: "2026-03-09",
    endDate: "2026-09-18",
    progressPct: 46,
    budgetLabel: "€635,000",
    contractValueLabel: "€635,000",
    deliveryStatus: "On track",
    billingStatus: "Per-store milestone · 44% billed",
    customerContacts: ["Carla Dominguez (Retail Ops)", "Hugo Reis (IT Retail)"],
    notes:
      "New POS, payments and store inventory sync across FreshMart's Iberian store network.",
    milestones: [
      { id: "m1", name: "Reference store live", dueDate: "2026-04-03", status: "done" },
      { id: "m2", name: "Region North complete", dueDate: "2026-06-19", status: "done" },
      { id: "m3", name: "Region South complete", dueDate: "2026-08-14", status: "upcoming" },
      { id: "m4", name: "Legacy POS sunset", dueDate: "2026-09-18", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Card scheme certification backlog",
        severity: "medium",
        owner: "Inês Carvalho",
      },
      {
        id: "r2",
        title: "Store fit-out labour shortages",
        severity: "low",
        owner: "Marco Silva",
      },
    ],
  }),
  project({
    id: "ext-healthcare-analytics",
    kind: "external",
    name: "Healthcare Analytics Platform",
    clientId: "client-mediscope",
    clientName: "MediScope Health Network",
    site: "Clinical analytics centre",
    region: "Nordics",
    operator: "Sigrid Holm",
    projectManager: "Sigrid Holm",
    accountManager: "Peter Walsh",
    phase: "live",
    startDate: "2026-01-06",
    endDate: "2026-10-09",
    progressPct: 36,
    budgetLabel: "€720,000",
    contractValueLabel: "€720,000",
    deliveryStatus: "Watch",
    billingStatus: "Fixed fee · 35% recognised",
    customerContacts: ["Dr. Erik Lund (CMO)", "Annika Sørensen (Data Lead)"],
    notes:
      "Population health analytics platform with governed clinical datasets and clinician dashboards.",
    milestones: [
      { id: "m1", name: "Data sharing agreements", dueDate: "2026-02-20", status: "done" },
      { id: "m2", name: "Secure lakehouse", dueDate: "2026-05-15", status: "done" },
      { id: "m3", name: "Clinical KPI pack", dueDate: "2026-08-07", status: "at-risk" },
      { id: "m4", name: "Clinical acceptance", dueDate: "2026-10-09", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Ethics board review schedule slip",
        severity: "high",
        owner: "Sigrid Holm",
      },
      {
        id: "r2",
        title: "Source EHR API throttling",
        severity: "medium",
        owner: "Peter Walsh",
      },
    ],
  }),
  project({
    id: "ext-financial-reporting-platform",
    kind: "external",
    name: "Financial Reporting Platform",
    clientId: "client-argentum",
    clientName: "Argentum Capital Partners",
    site: "London · Portfolio reporting",
    region: "United Kingdom",
    operator: "Nathan Pierce",
    projectManager: "Nathan Pierce",
    accountManager: "Chloe Avery",
    phase: "upcoming",
    startDate: "2026-08-17",
    endDate: "2027-02-27",
    progressPct: 0,
    budgetLabel: "£545,000",
    contractValueLabel: "£545,000",
    deliveryStatus: "Mobilising",
    billingStatus: "Kick-off invoice scheduled",
    customerContacts: ["Julian Crowe (COO)", "Emma Price (FP&A)"],
    notes:
      "Fund and portfolio reporting platform with automated investor packs and audit-ready ledgers.",
    milestones: [
      { id: "m1", name: "Kick-off & data rooms", dueDate: "2026-08-28", status: "upcoming" },
      { id: "m2", name: "Chart mapping workshops", dueDate: "2026-10-09", status: "upcoming" },
      { id: "m3", name: "Investor pack pilot", dueDate: "2026-12-11", status: "upcoming" },
      { id: "m4", name: "Year-end parallel run", dueDate: "2027-02-27", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Administrator data feeds not contracted",
        severity: "medium",
        owner: "Nathan Pierce",
      },
      {
        id: "r2",
        title: "Year-end blackout compresses UAT",
        severity: "low",
        owner: "Chloe Avery",
      },
    ],
  }),
  project({
    id: "ext-ai-customer-support",
    kind: "external",
    name: "AI Customer Support Implementation",
    clientId: "client-brightline",
    clientName: "Brightline Consumer Services",
    site: "Contact centre · Multichannel",
    region: "Germany & Austria",
    operator: "Yara Hassan",
    projectManager: "Yara Hassan",
    accountManager: "Felix Braun",
    phase: "live",
    startDate: "2026-04-01",
    endDate: "2026-09-30",
    progressPct: 29,
    budgetLabel: "€390,000",
    contractValueLabel: "€390,000",
    deliveryStatus: "On track",
    billingStatus: "Sprint billing · 28% billed",
    customerContacts: ["Lena Vogt (CX Director)", "Markus Engel (IT)"],
    notes:
      "AI-assisted support for chat and email with agent assist, knowledge grounding and QA sampling.",
    milestones: [
      { id: "m1", name: "Knowledge base cleanse", dueDate: "2026-04-25", status: "done" },
      { id: "m2", name: "Agent assist pilot", dueDate: "2026-06-19", status: "upcoming" },
      { id: "m3", name: "Chat deflection target", dueDate: "2026-08-14", status: "upcoming" },
      { id: "m4", name: "Full channel GA", dueDate: "2026-09-30", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Brand tone guardrails not approved",
        severity: "medium",
        owner: "Yara Hassan",
      },
      {
        id: "r2",
        title: "Works council consultation pending",
        severity: "high",
        owner: "Felix Braun",
      },
    ],
  }),
  project({
    id: "ext-multisite-network",
    kind: "external",
    name: "Multi-site Network Deployment",
    clientId: "client-helix",
    clientName: "Helix Industrial Group",
    site: "22 industrial sites · EMEA",
    region: "EMEA",
    operator: "Andrej Petrov",
    projectManager: "Andrej Petrov",
    accountManager: "Nicola West",
    phase: "live",
    startDate: "2025-11-10",
    endDate: "2026-11-28",
    progressPct: 67,
    budgetLabel: "€1.12m",
    contractValueLabel: "€1.12m",
    deliveryStatus: "On track",
    billingStatus: "Site acceptance billing · 63% billed",
    customerContacts: ["Karl Meier (Infra Dir.)", "Sabine Roth (PMO)"],
    notes:
      "Standardised WAN, Wi-Fi and secure remote access rollout across Helix's EMEA industrial footprint.",
    milestones: [
      { id: "m1", name: "Reference architecture", dueDate: "2025-12-19", status: "done" },
      { id: "m2", name: "Wave A sites (8)", dueDate: "2026-04-03", status: "done" },
      { id: "m3", name: "Wave B sites (8)", dueDate: "2026-08-21", status: "upcoming" },
      { id: "m4", name: "Wave C + NOC handover", dueDate: "2026-11-28", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Local carrier lead times in Eastern Europe",
        severity: "medium",
        owner: "Andrej Petrov",
      },
      {
        id: "r2",
        title: "OT network segregation exceptions",
        severity: "low",
        owner: "Nicola West",
      },
    ],
  }),
  project({
    id: "ext-cloud-migration",
    kind: "external",
    name: "Cloud Migration Programme",
    clientId: "client-orion",
    clientName: "Orion Media Holdings",
    site: "Hybrid · AWS landing zone",
    region: "United Kingdom & Ireland",
    operator: "Rebecca Shaw",
    projectManager: "Rebecca Shaw",
    accountManager: "Chris Donnelly",
    phase: "upcoming",
    startDate: "2026-09-14",
    endDate: "2027-04-30",
    progressPct: 3,
    budgetLabel: "£890,000",
    contractValueLabel: "£890,000",
    deliveryStatus: "Mobilising",
    billingStatus: "Discovery SOW signed · not yet billed",
    customerContacts: ["Aisha Khan (CTO)", "Neil Byrne (Infrastructure)"],
    notes:
      "Migrate 140 applications to AWS with landing zone, FinOps guardrails and DR runbooks.",
    milestones: [
      { id: "m1", name: "Discovery & 6R scoring", dueDate: "2026-10-23", status: "upcoming" },
      { id: "m2", name: "Landing zone ready", dueDate: "2026-12-11", status: "upcoming" },
      { id: "m3", name: "Wave 1 production moves", dueDate: "2027-02-20", status: "upcoming" },
      { id: "m4", name: "DR & FinOps handover", dueDate: "2027-04-30", status: "upcoming" },
    ],
    risks: [
      {
        id: "r1",
        title: "Mainframe dependency not fully inventoried",
        severity: "high",
        owner: "Rebecca Shaw",
      },
      {
        id: "r2",
        title: "Licence mobility constraints on key suites",
        severity: "medium",
        owner: "Chris Donnelly",
      },
    ],
  }),
];

const BY_ID = new Map<string, PortfolioProject>(
  [...INTERNAL_PROJECT_PORTFOLIO, ...EXTERNAL_PROJECT_PORTFOLIO].map((entry) => [
    entry.id,
    entry,
  ]),
);

export function getPortfolioProject(id: string): PortfolioProject | null {
  return BY_ID.get(id) ?? null;
}

export function getProjectsForScope(scope: ProjectPortfolioScope): PortfolioProject[] {
  if (scope === "internal") return INTERNAL_PROJECT_PORTFOLIO.map((entry) => ({ ...entry }));
  if (scope === "external") return EXTERNAL_PROJECT_PORTFOLIO.map((entry) => ({ ...entry }));
  return [...INTERNAL_PROJECT_PORTFOLIO, ...EXTERNAL_PROJECT_PORTFOLIO].map((entry) => ({
    ...entry,
  }));
}

export function isPortfolioProjectId(id: string): boolean {
  return BY_ID.has(id);
}

export function portfolioPhaseLabel(phase: ProjectPhase) {
  return phase === "live" ? "Live" : "Upcoming";
}

export function nextPortfolioMilestone(project: PortfolioProject): PortfolioMilestone | null {
  return (
    project.milestones.find((milestone) => milestone.status !== "done") ??
    project.milestones[project.milestones.length - 1] ??
    null
  );
}

export function topPortfolioRisk(project: PortfolioProject): PortfolioRisk | null {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return [...project.risks].sort((a, b) => rank[a.severity] - rank[b.severity])[0] ?? null;
}

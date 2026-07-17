export type OnboardingModuleId =
  | "clients"
  | "crm"
  | "projects"
  | "financials"
  | "quality-management"
  | "hr"
  | "assets-inventory"
  | "file-explorer"
  | "email-calendar-messaging"
  | "executive-assistant"
  | "logistics"
  | "social"
  | "careers"
  | "support"
  | "engineering-rnd"
  | "strategy"
  | "training"
  | "users"
  | "testing"
  | "website-management"
  | "profiles";

export type OnboardingModuleGroup = {
  id: string;
  label: string;
  presentation?: "section";
};

export type OnboardingModule = {
  id: OnboardingModuleId;
  label: string;
  groupId: string;
  description: string;
};

export const ONBOARDING_MODULE_GROUPS: readonly OnboardingModuleGroup[] = [
  { id: "business-central", label: "Business Central", presentation: "section" },
  { id: "assets", label: "Asset & Inventory Management", presentation: "section" },
  { id: "productivity", label: "Business Productivity", presentation: "section" },
  { id: "engineering", label: "Engineering and R&D", presentation: "section" },
  { id: "strategy", label: "Strategy", presentation: "section" },
  { id: "training", label: "Training", presentation: "section" },
  { id: "tools", label: "Tools", presentation: "section" },
];

export const ONBOARDING_MODULES: readonly OnboardingModule[] = [
  {
    id: "clients",
    label: "Clients",
    groupId: "business-central",
    description:
      "Central client directory with contacts, contracts, and account health — the hub for every customer relationship.",
  },
  {
    id: "crm",
    label: "CRM",
    groupId: "business-central",
    description:
      "Pipeline, leads, and opportunity tracking so sales and account teams stay aligned from first touch to close.",
  },
  {
    id: "projects",
    label: "Projects",
    groupId: "business-central",
    description:
      "Plan, track, and deliver work across teams with milestones, deliverables, and project-level reporting.",
  },
  {
    id: "financials",
    label: "Financials",
    groupId: "business-central",
    description:
      "Debtors, creditors, expenses, and financial overview — operational finance without leaving the platform.",
  },
  {
    id: "quality-management",
    label: "Quality Management",
    groupId: "business-central",
    description:
      "Document control, CAPA, audits, and supplier quality aligned with ISO and regulatory expectations.",
  },
  {
    id: "hr",
    label: "HR",
    groupId: "business-central",
    description:
      "Employee records, roles, and HR workflows for growing teams that need structure without enterprise overhead.",
  },
  {
    id: "assets-inventory",
    label: "Asset & Inventory Management",
    groupId: "assets",
    description:
      "Asset registry, fleet tracking, and inventory visibility across sites and field operations.",
  },
  {
    id: "file-explorer",
    label: "File Explorer",
    groupId: "productivity",
    description:
      "Internal, client, and shared file spaces with folder structure your teams already understand.",
  },
  {
    id: "email-calendar-messaging",
    label: "Email, Calendar and Messaging",
    groupId: "productivity",
    description:
      "Shared inbox, scheduling, and team messaging so coordination stays inside Unit311 Central.",
  },
  {
    id: "executive-assistant",
    label: "Executive Assistant",
    groupId: "productivity",
    description:
      "AI-assisted briefings, priorities, and executive summaries drawn from live operational data.",
  },
  {
    id: "logistics",
    label: "Logistics",
    groupId: "productivity",
    description:
      "Shipments, routes, and fulfilment tracking for teams managing physical goods and field logistics.",
  },
  {
    id: "social",
    label: "Social",
    groupId: "productivity",
    description:
      "Plan, draft, and schedule social content tied to campaigns and brand activity.",
  },
  {
    id: "careers",
    label: "Careers",
    groupId: "productivity",
    description:
      "Job postings, applicant tracking, and hiring workflows for growing organisations.",
  },
  {
    id: "support",
    label: "Support",
    groupId: "productivity",
    description:
      "Support desk, tickets, and customer issue resolution with optional WhatsApp intake.",
  },
  {
    id: "engineering-rnd",
    label: "Engineering and R&D",
    groupId: "engineering",
    description:
      "R&D programmes, prototypes, and engineering documentation in one workspace.",
  },
  {
    id: "strategy",
    label: "Strategy",
    groupId: "strategy",
    description:
      "Board packs, competitive intelligence, whiteboard planning, and long-range strategic views.",
  },
  {
    id: "training",
    label: "Training",
    groupId: "training",
    description:
      "Staff, QMS, and representative training modules with progress tracking and readiness views.",
  },
  {
    id: "users",
    label: "Users",
    groupId: "tools",
    description:
      "Internal and external user management, roles, and access control across your organisation.",
  },
  {
    id: "testing",
    label: "Testing",
    groupId: "tools",
    description:
      "Flight simulator, telemetry, and operational testing tools for field and lab teams.",
  },
  {
    id: "website-management",
    label: "Website Management",
    groupId: "tools",
    description:
      "Manage public website content, pages, and brand assets from the same platform.",
  },
  {
    id: "profiles",
    label: "Profiles",
    groupId: "tools",
    description:
      "User profiles, preferences, and personal settings for every team member.",
  },
];

export const ALL_ONBOARDING_MODULE_IDS = ONBOARDING_MODULES.map((module) => module.id);

export const LOGO_SUGGESTED_DIMENSIONS = "400 × 120 px (PNG or SVG, transparent background)";

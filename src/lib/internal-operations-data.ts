import type { SurveyOperationsBasePath } from "@/lib/survey-operations-mock-data";
import { EXECUTIVE_ASSISTANT_VISIBLE } from "@/lib/product-surface-flags";

export type InternalOperationsView =
  | "home"
  | "clients"
  | "clients-dashboard"
  | "crm"
  | "crm-meetings"
  | "crm-questions-test"
  | "connections"
  | "representatives"
  | "office-locations"
  | "corporate-dashboard"
  | "corporate-information"
  | "corporate-company-details"
  | "corporate-cap-table"
  | "corporate-bank-accounts"
  | "corporate-advisers"
  | "corporate-insurance"
  | "corporate-software"
  | "corporate-contracts"
  | "financials"
  | "general-ledger"
  | "accounts-receivable"
  | "accounts-payable"
  | "financial-reports"
  | "opex"
  | "wise"
  | "board-pack"
  | "debtors"
  | "creditors"
  | "expenses"
  | "hr"
  | "hr-dashboard"
  | "hr-recruitment"
  | "hr-leave"
  | "hr-performance"
  | "hr-reports"
  | "hr-payroll"
  | "strategy"
  | "potential-clients"
  | "whiteboard"
  | "competitors"
  | "assets"
  | "inventory-management"
  | "procurement"
  | "fleet"
  | "testing"
  | "projects"
  | "projects-dashboard"
  | "projects-internal"
  | "projects-external"
  | "grants"
  | "recent-missions"
  | "webodm"
  | "messaging"
  | "communications"
  | "social"
  | "settings"
  | "billing"
  | "calendar"
  | "info-email"
  | "files"
  | "files-internal"
  | "files-external"
  | "files-client"
  | "productivity-dashboard"
  | "unit311-details"
  | "module-go-live"
  | "users"
  | "users-external"
  | "external-client-access"
  | "support"
  | "telemetry"
  | "media-example"
  | "design-mockups"
  | "sector"
  | "training"
  | "training-dashboard"
  | "logistics"
  | "client-onboarding"
  | "quality-management"
  | "qms-training"
  | "qms-document-control"
  | "qms-capa"
  | "qms-internal-audits"
  | "qms-management-review"
  | "qms-reports"
  | "profile"
  | "appearance"
  | "executive-assistant"
  | "website-management"
  | "engineering"
  | "engineering-dashboard"
  | "engineering-resources"
  | "engineering-capacity"
  | "technology"
  | "technology-dashboard"
  | "technology-devices"
  | "technology-software"
  | "technology-telecommunications"
  | "technology-infrastructure"
  | "technology-reports"
  | "technology-settings";

/** App Router folder path (middleware may rewrite `/` → this on the internal host). */
export const INTERNAL_OPERATIONS_APP_PATH = "/internaldashboard";

/**
 * Browser URL base for the internal app.
 * On internal.unit311central.com this is `/`; locally it stays `/internaldashboard`.
 */
export const INTERNAL_OPERATIONS_BASE_PATH: SurveyOperationsBasePath =
  "/internaldashboard";

export const INTERNAL_GRANTS_OPERATIONS_BASE_PATH: SurveyOperationsBasePath =
  "/internaldashboard_grants";

export function resolveInternalOperationsBasePath(
  hostname?: string | null,
): SurveyOperationsBasePath {
  const host = (hostname ?? "").split(":")[0].trim().toLowerCase();
  if (
    host === "internal.unit311central.com" ||
    host === "internal.localhost" ||
    host === "demo.unit311central.com" ||
    host === "demo.localhost"
  ) {
    return "/";
  }
  // Customer workspace hosts use /dashboard as the public app URL.
  if (
    host.endsWith(".unit311central.com") &&
    host !== "unit311central.com" &&
    host !== "www.unit311central.com" &&
    host !== "internal.unit311central.com" &&
    host !== "demo.unit311central.com"
  ) {
    return "/dashboard";
  }
  if (
    host.endsWith(".localhost") &&
    host !== "localhost" &&
    host !== "internal.localhost" &&
    host !== "demo.localhost"
  ) {
    return "/dashboard";
  }
  return INTERNAL_OPERATIONS_BASE_PATH;
}

export const internalOperationsViews: InternalOperationsView[] = [
  "home",
  "clients",
  "clients-dashboard",
  "crm",
  "crm-meetings",
  "crm-questions-test",
  "connections",
  "representatives",
  "office-locations",
  "corporate-dashboard",
  "corporate-information",
  "corporate-company-details",
  "corporate-cap-table",
  "corporate-bank-accounts",
  "corporate-advisers",
  "corporate-insurance",
  "corporate-software",
  "corporate-contracts",
  "financials",
  "general-ledger",
  "accounts-receivable",
  "accounts-payable",
  "financial-reports",
  "opex",
  "wise",
  "board-pack",
  "debtors",
  "creditors",
  "expenses",
  "hr",
  "hr-dashboard",
  "hr-recruitment",
  "hr-leave",
  "hr-performance",
  "hr-reports",
  "hr-payroll",
  "strategy",
  "potential-clients",
  "whiteboard",
  "competitors",
  "assets",
  "inventory-management",
  "procurement",
  "fleet",
  "testing",
  "projects",
  "projects-dashboard",
  "projects-internal",
  "projects-external",
  "grants",
  "recent-missions",
  "webodm",
  "messaging",
  "communications",
  "social",
  "settings",
  "billing",
  "calendar",
  "info-email",
  "files",
  "files-internal",
  "files-external",
  "files-client",
  "productivity-dashboard",
  "unit311-details",
  "module-go-live",
  "users",
  "users-external",
  "external-client-access",
  "support",
  "telemetry",
  "media-example",
  "design-mockups",
  "sector",
  "training",
  "training-dashboard",
  "logistics",
  "client-onboarding",
  "quality-management",
  "qms-training",
  "qms-document-control",
  "qms-capa",
  "qms-internal-audits",
  "qms-management-review",
  "qms-reports",
  "profile",
  "appearance",
  "executive-assistant",
  "website-management",
  "engineering",
  "engineering-dashboard",
  "engineering-resources",
  "engineering-capacity",
  "technology",
  "technology-dashboard",
  "technology-devices",
  "technology-software",
  "technology-telecommunications",
  "technology-infrastructure",
  "technology-reports",
  "technology-settings",
];

/** Nav aliases that share one implementation until modules are redesigned. */
export const PROJECTS_NAV_VIEWS = [
  "projects",
  "projects-dashboard",
  "projects-internal",
  "projects-external",
] as const satisfies readonly InternalOperationsView[];

export const ENGINEERING_NAV_VIEWS = [
  "engineering",
  "engineering-dashboard",
  "engineering-resources",
  "engineering-capacity",
] as const satisfies readonly InternalOperationsView[];

export const TECHNOLOGY_NAV_VIEWS = [
  "technology",
  "technology-dashboard",
  "technology-devices",
  "technology-software",
  "technology-telecommunications",
  "technology-infrastructure",
  "technology-reports",
  "technology-settings",
] as const satisfies readonly InternalOperationsView[];

export const ASSETS_NAV_VIEWS = [
  "assets",
  "inventory-management",
  "procurement",
  "logistics",
] as const satisfies readonly InternalOperationsView[];

export function isProjectsNavView(view: InternalOperationsView): boolean {
  return (PROJECTS_NAV_VIEWS as readonly string[]).includes(view);
}

export function isEngineeringNavView(view: InternalOperationsView): boolean {
  return (ENGINEERING_NAV_VIEWS as readonly string[]).includes(view);
}

export function isTechnologyNavView(view: InternalOperationsView): boolean {
  return (TECHNOLOGY_NAV_VIEWS as readonly string[]).includes(view);
}

export function isAssetsNavView(view: InternalOperationsView): boolean {
  return (ASSETS_NAV_VIEWS as readonly string[]).includes(view);
}

export function isInternalOperationsView(value: string | null): value is InternalOperationsView {
  return internalOperationsViews.includes(value as InternalOperationsView);
}

/** Corporate Information workspace tabs (UI shell only — APIs remain per capability). */
export const CORPORATE_INFORMATION_TABS = [
  { key: "company-details", label: "Company Details" },
  { key: "cap-table", label: "Cap Table" },
  { key: "office-locations", label: "Office Locations" },
  { key: "bank-accounts", label: "Bank Accounts" },
  { key: "professional-advisors", label: "Professional Advisors" },
  { key: "contracts", label: "Contracts" },
] as const;

export type CorporateInformationTab = (typeof CORPORATE_INFORMATION_TABS)[number]["key"];

export function isCorporateInformationTab(value: string | null): value is CorporateInformationTab {
  return CORPORATE_INFORMATION_TABS.some((tab) => tab.key === value);
}

/** Legacy leaf views that now open the tabbed Corporate Information workspace. */
export function legacyCorporateViewToTab(
  view: string | null,
): CorporateInformationTab | null {
  switch (view) {
    case "corporate-company-details":
      return "company-details";
    case "office-locations":
      return "office-locations";
    case "corporate-bank-accounts":
      return "bank-accounts";
    case "corporate-advisers":
      return "professional-advisors";
    case "corporate-contracts":
      return "contracts";
    default:
      return null;
  }
}

export function normalizeInternalOperationsView(value: string | null): InternalOperationsView {
  if (value === "live-projects") return "projects";
  if (value === "sector-mining") return "sector";
  if (value === "files") return "productivity-dashboard";
  if (value === "debtors") return "accounts-receivable";
  if (value === "creditors") return "accounts-payable";
  if (value === "opex") return "financials";
  if (value === "voice-video" || value === "voice-and-video") {
    return "communications";
  }
  // Software Licences moved from Corporate Information → Technology Management.
  if (value === "corporate-software" || value === "software-licences") {
    return "technology-software";
  }
  if (value === "technology") return "technology-dashboard";
  if (legacyCorporateViewToTab(value)) return "corporate-information";
  return isInternalOperationsView(value) ? value : "home";
}

/** Banner for nav leaves that reuse an existing module. */
export function getNavImplementationNotice(
  view: InternalOperationsView,
): "uses-current" | "coming-soon" | null {
  if (
    view === "projects-dashboard" ||
    view === "projects-internal" ||
    view === "projects-external"
  ) {
    return "uses-current";
  }
  return null;
}

export type InternalNavChildItem = {
  readonly label: string;
  readonly view?: InternalOperationsView;
  readonly href?: string;
  readonly query?: Record<string, string>;
  /** Nested groups (e.g. Clients → Dashboard). */
  readonly children?: readonly InternalNavChildItem[];
};

export type InternalNavItem = {
  readonly label: string;
  readonly icon: string;
  readonly view?: InternalOperationsView;
  readonly href?: string;
  readonly indented?: boolean;
  readonly children?: readonly InternalNavChildItem[];
};

export type InternalNavSection = {
  readonly label: string | null;
  /** Pin items sit above workspace cards (Home, Executive Assistant). */
  readonly kind?: "pin" | "workspace";
  /** Workspace card accent colour. */
  readonly color?: string;
  /** Workspace card header icon (Lucide name). */
  readonly icon?: string;
  readonly items: readonly InternalNavItem[];
};

export const internalSurveyNavSections: readonly InternalNavSection[] = [
  {
    kind: "pin",
    label: null,
    items: [{ label: "Home", icon: "LayoutDashboard", view: "home" as const }],
  },
  ...(EXECUTIVE_ASSISTANT_VISIBLE
    ? [
        {
          kind: "pin" as const,
          label: null,
          items: [
            {
              label: "Executive Assistant",
              icon: "Bot",
              view: "executive-assistant" as const,
            },
          ],
        } satisfies InternalNavSection,
      ]
    : []),
  {
    kind: "workspace",
    label: "Business Central",
    icon: "Briefcase",
    color: "#2F80ED",
    items: [
      {
        label: "Clients",
        icon: "Building2",
        children: [
          { label: "Dashboard", view: "clients-dashboard" as const },
          { label: "Client Directory", view: "clients" as const },
        ],
      },
      {
        label: "Customer Management",
        icon: "ContactRound",
        children: [
          { label: "Pipeline", view: "crm" as const },
          { label: "Discovery & Demo", view: "crm-meetings" as const },
          { label: "Client Onboarding", view: "client-onboarding" as const },
          { label: "Potential Clients", view: "potential-clients" as const },
        ],
      },
      {
        label: "Projects",
        icon: "FolderKanban",
        children: [
          { label: "Dashboard", view: "projects-dashboard" as const },
          { label: "Internal Projects", view: "projects-internal" as const },
          { label: "External Projects", view: "projects-external" as const },
          { label: "Grants", view: "grants" as const },
        ],
      },
    ],
  },
  {
    kind: "workspace",
    label: "Financials",
    icon: "Wallet",
    color: "#27AE60",
    items: [
      { label: "Dashboard", icon: "LayoutDashboard", view: "financials" as const },
      { label: "General Ledger", icon: "ScrollText", view: "general-ledger" as const },
      { label: "Accounts Receivable", icon: "ArrowDownLeft", view: "accounts-receivable" as const },
      { label: "Accounts Payable", icon: "ArrowUpRight", view: "accounts-payable" as const },
      { label: "Expenses", icon: "Receipt", view: "expenses" as const },
      { label: "Bank", icon: "Landmark", view: "wise" as const },
      { label: "Financial Reports", icon: "ScrollText", view: "financial-reports" as const },
    ],
  },
  {
    kind: "workspace",
    label: "Human Resources",
    icon: "Users",
    color: "#9B51E0",
    items: [
      { label: "Dashboard", icon: "LayoutDashboard", view: "hr-dashboard" as const },
      { label: "Employees", icon: "Users", view: "hr" as const },
      { label: "Recruitment", icon: "ContactRound", view: "hr-recruitment" as const },
      { label: "Time & Attendance", icon: "CalendarDays", view: "hr-leave" as const },
      { label: "Payroll", icon: "Wallet", view: "hr-payroll" as const },
      { label: "Performance", icon: "Target", view: "hr-performance" as const },
      { label: "HR Reports", icon: "ScrollText", view: "hr-reports" as const },
    ],
  },
  {
    kind: "workspace",
    label: "Corporate Information",
    icon: "Building2",
    color: "#F2A900",
    items: [
      { label: "Dashboard", icon: "LayoutDashboard", view: "corporate-dashboard" as const },
      { label: "Cap Table Management", icon: "Layers", view: "corporate-cap-table" as const },
      { label: "Company Details", icon: "Building2", view: "corporate-company-details" as const },
      { label: "Office Locations", icon: "MapPin", view: "office-locations" as const },
      { label: "Bank Accounts", icon: "Landmark", view: "corporate-bank-accounts" as const },
      { label: "Professional Advisors", icon: "Handshake", view: "corporate-advisers" as const },
      { label: "Contracts", icon: "ScrollText", view: "corporate-contracts" as const },
      {
        label: "Unit311 Details",
        icon: "ShieldCheck",
        children: [
          { label: "Dashboard", view: "unit311-details" as const },
          { label: "Module Go-Live", view: "module-go-live" as const },
        ],
      },
    ],
  },
  {
    kind: "workspace",
    label: "Technology Management",
    icon: "Cpu",
    color: "#38BDF8",
    items: [
      { label: "Dashboard", icon: "LayoutDashboard", view: "technology-dashboard" as const },
      { label: "Devices", icon: "Laptop", view: "technology-devices" as const },
      { label: "Software & SaaS", icon: "KeyRound", view: "technology-software" as const },
      { label: "Telecommunications", icon: "Radio", view: "technology-telecommunications" as const },
      { label: "Infrastructure & Cloud", icon: "Server", view: "technology-infrastructure" as const },
      { label: "Networks & Domains", icon: "Globe", view: "technology-infrastructure" as const },
      { label: "Certificates & Identity", icon: "ShieldCheck", view: "technology-infrastructure" as const },
      { label: "Security", icon: "ShieldCheck", view: "technology-reports" as const },
      { label: "Technology Assets", icon: "HardDrive", view: "technology-devices" as const },
      { label: "Reports", icon: "ScrollText", view: "technology-reports" as const },
      { label: "Settings", icon: "Settings", view: "technology-settings" as const },
    ],
  },
  {
    kind: "workspace",
    label: "Business Productivity",
    icon: "MessageSquare",
    color: "#00B8D9",
    items: [
      { label: "Dashboard", icon: "LayoutDashboard", view: "productivity-dashboard" as const },
      {
        label: "File Explorer",
        icon: "FolderOpen",
        children: [
          { label: "Internal Files", view: "files-internal" as const },
          { label: "External Files", view: "files-external" as const },
          { label: "Client Explorer", view: "files-client" as const },
        ],
      },
      { label: "Email", icon: "Mail", view: "info-email" as const },
      { label: "Calendar", icon: "CalendarDays", view: "calendar" as const },
      { label: "Messaging", icon: "MessageSquare", view: "messaging" as const },
      { label: "Communications", icon: "Video", view: "communications" as const },
      { label: "Social", icon: "Share2", view: "social" as const },
      {
        label: "Support Desk",
        icon: "LifeBuoy",
        children: [
          { label: "Tickets", view: "support" as const },
          { label: "WhatsApp Integration", href: "/whatsapp/support-flow" },
        ],
      },
    ],
  },
  {
    kind: "workspace",
    label: "Operations",
    icon: "Package",
    color: "#00D4C7",
    items: [
      { label: "Assets", icon: "Package", view: "assets" as const },
      { label: "Inventory", icon: "Layers", view: "inventory-management" as const },
      { label: "Procurement", icon: "Receipt", view: "procurement" as const },
      { label: "Logistics", icon: "Truck", view: "logistics" as const },
    ],
  },
  {
    kind: "workspace",
    label: "Training",
    icon: "GraduationCap",
    color: "#F2994A",
    items: [
      { label: "Dashboard", icon: "LayoutDashboard", view: "training-dashboard" as const },
      {
        label: "Courses",
        icon: "GraduationCap",
        children: [
          { label: "Staff Courses", view: "training" as const },
          { label: "QMS Courses", view: "qms-training" as const },
        ],
      },
    ],
  },
  {
    kind: "workspace",
    label: "QMS",
    icon: "ShieldCheck",
    color: "#7ED321",
    items: [
      { label: "Dashboard", icon: "LayoutDashboard", view: "quality-management" as const },
      { label: "Document Control", icon: "ScrollText", view: "qms-document-control" as const },
      { label: "CAPA", icon: "Target", view: "qms-capa" as const },
      { label: "Internal Audits", icon: "ClipboardCheck", view: "qms-internal-audits" as const },
      { label: "Management Review", icon: "Users", view: "qms-management-review" as const },
      { label: "Reporting", icon: "ScrollText", view: "qms-reports" as const },
    ],
  },
  {
    kind: "workspace",
    label: "Tools",
    icon: "FlaskConical",
    color: "#6C63FF",
    items: [
      { label: "Website Management", icon: "Globe", view: "website-management" as const },
      { label: "Media Library", icon: "Film", view: "media-example" as const },
      { label: "Testing", icon: "FlaskConical", view: "testing" as const },
      { label: "Telemetry", icon: "Radio", view: "telemetry" as const },
      { label: "Users", icon: "Users", view: "users" as const },
    ],
  },
  {
    kind: "workspace",
    label: "External Client Access",
    icon: "KeyRound",
    color: "#8B7CFF",
    items: [
      { label: "Dashboard", icon: "LayoutDashboard", view: "external-client-access" as const },
      { label: "External Users", icon: "Users", view: "users-external" as const },
    ],
  },
  {
    kind: "workspace",
    label: "Settings",
    icon: "Settings",
    color: "#7AA2FF",
    items: [
      { label: "Profile", icon: "Users", view: "profile" as const },
      { label: "General", icon: "Settings", view: "settings" as const },
      { label: "Billing", icon: "Wallet", view: "billing" as const },
      { label: "Appearance", icon: "Layers", view: "appearance" as const },
    ],
  },
];

export const internalSurveyNavItems: InternalNavItem[] = internalSurveyNavSections.flatMap(
  (section) => [...section.items],
);

export const internalViewTitles: Record<
  InternalOperationsView,
  { title: string; subtitle: string }
> = {
  home: { title: "Home", subtitle: "Executive Dashboard" },
  clients: { title: "Client Directory", subtitle: "Clients" },
  "clients-dashboard": { title: "Dashboard", subtitle: "Clients" },
  crm: { title: "Pipeline", subtitle: "Customer Management" },
  "crm-meetings": {
    title: "Discovery & Demo",
    subtitle: "Customer Management",
  },
  "crm-questions-test": {
    title: "CRM Discovery Questions (Test)",
    subtitle: "Internal test workspace",
  },
  connections: { title: "Connections", subtitle: "Internal Operations" },
  representatives: { title: "Partners", subtitle: "Business Central" },
  "office-locations": { title: "Office Locations", subtitle: "Corporate Information" },
  "corporate-dashboard": { title: "Dashboard", subtitle: "Corporate Information" },
  "corporate-information": { title: "Corporate Information", subtitle: "Corporate Information" },
  "corporate-company-details": { title: "Company Details", subtitle: "Corporate Information" },
  "corporate-cap-table": { title: "Cap Table Management", subtitle: "Corporate Information" },
  "corporate-bank-accounts": { title: "Bank Accounts", subtitle: "Corporate Information" },
  "corporate-advisers": { title: "Professional Advisors", subtitle: "Corporate Information" },
  "corporate-insurance": { title: "Insurance", subtitle: "Corporate Information" },
  "corporate-software": { title: "Software", subtitle: "Technology Management" },
  "corporate-contracts": { title: "Contracts", subtitle: "Corporate Information" },
  financials: { title: "Dashboard", subtitle: "Financials" },
  "general-ledger": { title: "General Ledger", subtitle: "Financials" },
  "accounts-receivable": { title: "Accounts Receivable", subtitle: "Financials" },
  "accounts-payable": { title: "Accounts Payable", subtitle: "Financials" },
  "financial-reports": { title: "Financial Reports", subtitle: "Financials" },
  opex: { title: "Opex", subtitle: "Financials" },
  wise: { title: "Bank", subtitle: "Financials" },
  "board-pack": { title: "Board deck", subtitle: "Strategy" },
  debtors: { title: "Accounts Receivable", subtitle: "Financials" },
  creditors: { title: "Accounts Payable", subtitle: "Financials" },
  expenses: { title: "Expenses", subtitle: "Financials" },
  hr: { title: "Employees", subtitle: "Human Resources" },
  "hr-dashboard": { title: "Dashboard", subtitle: "Human Resources" },
  "hr-recruitment": { title: "Recruitment", subtitle: "Human Resources" },
  "hr-leave": { title: "Time & Attendance", subtitle: "Human Resources" },
  "hr-performance": { title: "Performance", subtitle: "Human Resources" },
  "hr-reports": { title: "HR Reports", subtitle: "Human Resources" },
  "hr-payroll": { title: "Payroll", subtitle: "Human Resources" },
  strategy: { title: "Strategy", subtitle: "Strategy" },
  "potential-clients": { title: "Potential Clients", subtitle: "CRM" },
  whiteboard: { title: "Whiteboard", subtitle: "Strategy" },
  competitors: { title: "Competitors", subtitle: "Strategy" },
  assets: { title: "Assets", subtitle: "Operations" },
  "inventory-management": { title: "Inventory", subtitle: "Operations" },
  procurement: { title: "Procurement", subtitle: "Operations" },
  fleet: { title: "Fleet", subtitle: "Internal Operations" },
  testing: { title: "Flight Simulator Testing", subtitle: "Tools" },
  projects: { title: "Projects", subtitle: "Projects" },
  "projects-dashboard": { title: "Projects Dashboard", subtitle: "Projects" },
  "projects-internal": { title: "Internal Projects", subtitle: "Projects" },
  "projects-external": { title: "External Projects", subtitle: "Projects" },
  grants: { title: "Grants", subtitle: "Projects" },
  "recent-missions": { title: "Recent Missions", subtitle: "Internal Operations" },
  webodm: { title: "WebODM Processing", subtitle: "Internal Operations" },
  messaging: { title: "Messaging", subtitle: "Business Productivity" },
  communications: { title: "Communications", subtitle: "Business Productivity" },
  social: { title: "Social", subtitle: "Business Productivity" },
  settings: { title: "General", subtitle: "Settings" },
  billing: { title: "Billing", subtitle: "Settings" },
  calendar: { title: "Calendar", subtitle: "Business Productivity" },
  "info-email": { title: "Email", subtitle: "Business Productivity" },
  files: { title: "Dashboard", subtitle: "Business Productivity" },
  "productivity-dashboard": { title: "Dashboard", subtitle: "Business Productivity" },
  "files-internal": { title: "Internal Files", subtitle: "File Explorer" },
  "unit311-details": { title: "Dashboard", subtitle: "Unit311 Details" },
  "module-go-live": {
    title: "Module Go-Live",
    subtitle: "Unit311 Details",
  },
  "files-external": { title: "External Files", subtitle: "File Explorer" },
  "files-client": { title: "Client Explorer", subtitle: "File Explorer" },
  users: { title: "Internal Users", subtitle: "Tools" },
  "users-external": { title: "External Users", subtitle: "External Client Access" },
  "external-client-access": {
    title: "External Client Access",
    subtitle: "External Client Access",
  },
  support: { title: "Support Desk", subtitle: "Business Productivity" },
  telemetry: { title: "Live Telemetry", subtitle: "Tools" },
  "media-example": { title: "Media Library", subtitle: "Tools" },
  "design-mockups": { title: "Design Concepts", subtitle: "Internal Operations" },
  sector: { title: "Sector Intelligence", subtitle: "Unit311" },
  training: { title: "Staff Courses", subtitle: "Training" },
  "training-dashboard": { title: "Training Dashboard", subtitle: "Training" },
  logistics: { title: "Logistics", subtitle: "Operations" },
  "client-onboarding": { title: "Client Onboarding", subtitle: "Customer Management" },
  "quality-management": { title: "Quality Management System", subtitle: "QMS" },
  "qms-training": { title: "QMS Courses", subtitle: "Training" },
  "qms-document-control": { title: "Document Control", subtitle: "QMS" },
  "qms-capa": { title: "CAPA", subtitle: "QMS" },
  "qms-internal-audits": { title: "Internal Audits", subtitle: "QMS" },
  "qms-management-review": { title: "Management Review", subtitle: "QMS" },
  "qms-reports": { title: "Reporting", subtitle: "Training & QMS" },
  profile: { title: "Profile", subtitle: "Settings" },
  appearance: { title: "Appearance", subtitle: "Settings" },
  "executive-assistant": { title: "Executive Assistant", subtitle: "Executive" },
  "website-management": { title: "Website Management", subtitle: "Tools" },
  engineering: { title: "Technology Overview", subtitle: "Technology Management" },
  "engineering-dashboard": { title: "Technology Dashboard", subtitle: "Technology Management" },
  "engineering-resources": {
    title: "Technology Resourcing",
    subtitle: "Technology Management",
  },
  "engineering-capacity": { title: "Capacity Planning", subtitle: "Technology Management" },
  technology: { title: "Technology Management", subtitle: "Technology Management" },
  "technology-dashboard": { title: "Dashboard", subtitle: "Technology Management" },
  "technology-devices": { title: "Devices", subtitle: "Technology Management" },
  "technology-software": { title: "Software", subtitle: "Technology Management" },
  "technology-telecommunications": {
    title: "Telecommunications",
    subtitle: "Technology Management",
  },
  "technology-infrastructure": {
    title: "Infrastructure",
    subtitle: "Technology Management",
  },
  "technology-reports": { title: "Reports", subtitle: "Technology Management" },
  "technology-settings": { title: "Settings", subtitle: "Technology Management" },
};

/** Breadcrumb labels for the active internal leaf (section → … → page).
 * Uses navigation labels only — never appends the page title (h1 owns that).
 */
export function getInternalNavBreadcrumb(
  activeView: InternalOperationsView,
): readonly string[] {
  const titles = internalViewTitles[activeView];

  for (const section of internalSurveyNavSections) {
    for (const item of section.items) {
      const trail = findNavTrailLabels(item, activeView, []);
      if (trail) {
        return section.label != null ? [section.label, ...trail] : [...trail];
      }
    }
  }

  const pageTitle = titles?.title ?? activeView;
  return titles?.subtitle ? [titles.subtitle, pageTitle] : [pageTitle];
}

function findNavTrailLabels(
  item: InternalNavItem | InternalNavChildItem,
  activeView: InternalOperationsView,
  ancestors: string[],
): string[] | null {
  const nextAncestors = [...ancestors, item.label];

  if (item.view === activeView) {
    return nextAncestors;
  }

  if (item.children?.length) {
    for (const child of item.children) {
      const found = findNavTrailLabels(child, activeView, nextAncestors);
      if (found) return found;
    }
  }

  return null;
}

export const internalHomeTileRows = [
  [
    {
      id: "clients",
      view: "clients" as const,
      icon: "clients" as const,
      title: "Clients",
      description: "Client accounts, contracts, and contacts.",
      accent: "from-sky-500/20 to-blue-600/10 border-sky-400/30",
    },
    {
      id: "projects",
      view: "projects" as const,
      icon: "projects" as const,
      title: "Projects",
      description: "Live and upcoming client mobilisations.",
      accent: "from-amber-500/20 to-orange-600/10 border-amber-400/30",
    },
    {
      id: "recent-missions",
      view: "recent-missions" as const,
      icon: "recent-missions" as const,
      title: "Recent Missions",
      description: "Mission history by region.",
      accent: "from-cyan-500/20 to-sky-600/10 border-cyan-400/30",
    },
  ],
  [
    {
      id: "crm",
      view: "crm" as const,
      icon: "crm" as const,
      title: "CRM",
      description: "Lead pipeline, status, and next actions.",
      accent: "from-indigo-500/20 to-blue-600/10 border-indigo-400/30",
    },
    {
      id: "assets",
      view: "assets" as const,
      icon: "assets" as const,
      title: "Assets",
      description: "Matrice 4T fleet registry.",
      accent: "from-violet-500/20 to-indigo-600/10 border-violet-400/30",
    },
    {
      id: "testing",
      view: "testing" as const,
      icon: "testing" as const,
      title: "Testing",
      description: "FlightHub simulator testing.",
      accent: "from-emerald-500/20 to-teal-600/10 border-emerald-400/30",
    },
  ],
  [
    {
      id: "messaging",
      view: "messaging" as const,
      icon: "messaging" as const,
      title: "Messaging",
      description: "Channels, DMs, and chat history.",
      accent: "from-blue-500/20 to-sky-600/10 border-blue-400/30",
    },
    {
      id: "communications",
      view: "communications" as const,
      icon: "testing" as const,
      title: "Communications",
      description: "Voice, video, and live meetings.",
      accent: "from-emerald-500/20 to-teal-600/10 border-emerald-400/30",
    },
    {
      id: "files",
      view: "files-internal" as const,
      icon: "files" as const,
      title: "File Explorer",
      description: "Document repository.",
      accent: "from-slate-500/20 to-zinc-600/10 border-slate-400/30",
    },
    {
      id: "users",
      view: "users" as const,
      icon: "users" as const,
      title: "Users",
      description: "Operator roster and roles.",
      accent: "from-orange-500/20 to-amber-600/10 border-orange-400/30",
    },
  ],
  [
    {
      id: "telemetry",
      view: "telemetry" as const,
      icon: "telemetry" as const,
      title: "Live Telemetry",
      description: "Live drone OSD feed.",
      accent: "from-rose-500/20 to-red-600/10 border-rose-400/30",
    },
    {
      id: "webodm",
      view: "webodm" as const,
      icon: "webodm" as const,
      title: "WebODM",
      description: "Orthophotos and 3D models.",
      accent: "from-fuchsia-500/20 to-purple-600/10 border-fuchsia-400/30",
    },
    {
      id: "strategy",
      view: "strategy" as const,
      icon: "strategy" as const,
      title: "Strategy",
      description: "Capability matrix, notes, and priorities.",
      accent: "from-teal-500/20 to-emerald-600/10 border-teal-400/30",
    },
  ],
] as const;

export type InternalHomeTile = (typeof internalHomeTileRows)[number][number];

export function getInternalNavHref(
  view: InternalOperationsView | null,
  basePath: SurveyOperationsBasePath = INTERNAL_OPERATIONS_BASE_PATH,
  query?: Record<string, string>,
) {
  if (view === "corporate-information") {
    const params = new URLSearchParams({
      view: "corporate-information",
      tab: query?.tab && isCorporateInformationTab(query.tab) ? query.tab : "company-details",
    });
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (key === "view" || key === "tab") continue;
        params.set(key, value);
      }
    }
    return `${basePath === "/" ? "/" : basePath}?${params.toString()}`;
  }

  if (!view || view === "home") {
    if (!query || Object.keys(query).length === 0) {
      return basePath;
    }
    const params = new URLSearchParams(query);
    return `${basePath === "/" ? "/" : basePath}?${params.toString()}`;
  }

  const params = new URLSearchParams({ view });
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      params.set(key, value);
    }
  }
  return `${basePath === "/" ? "/" : basePath}?${params.toString()}`;
}

function internalNavQueryMatches(
  expectedQuery: Record<string, string>,
  searchParams: URLSearchParams | null | undefined,
) {
  if (!searchParams) return false;
  return Object.entries(expectedQuery).every(([key, value]) => searchParams.get(key) === value);
}

export function isInternalNavChildActive(
  item: InternalNavChildItem,
  activeView: InternalOperationsView = "home",
  pathname = "",
  basePath: SurveyOperationsBasePath = INTERNAL_OPERATIONS_BASE_PATH,
  searchParams?: URLSearchParams | null,
): boolean {
  if (item.children?.length) {
    return item.children.some((child) =>
      isInternalNavChildActive(child, activeView, pathname, basePath, searchParams),
    );
  }

  if (item.href) {
    if (item.href.includes("?")) {
      const [hrefPath, hrefQuery] = item.href.split("?", 2);
      if (pathname !== hrefPath && !pathname.startsWith(`${hrefPath}/`)) {
        return false;
      }
      const expected = Object.fromEntries(new URLSearchParams(hrefQuery).entries());
      return internalNavQueryMatches(expected, searchParams);
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  if (item.view && item.query) {
    return item.view === activeView && internalNavQueryMatches(item.query, searchParams);
  }
  // Shared implementations (Projects / Engineering / Assets) must highlight only the
  // selected leaf. Parent expansion still works via children.some(...) above.
  return item.view === activeView;
}

export function isInternalNavItemActive(
  pathname: string,
  item: InternalNavItem,
  activeView: InternalOperationsView = "home",
  basePath: SurveyOperationsBasePath = INTERNAL_OPERATIONS_BASE_PATH,
  searchParams?: URLSearchParams | null,
) {
  if (item.href) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  const childHrefActive =
    item.children?.some((child) =>
      isInternalNavChildActive(child, activeView, pathname, basePath, searchParams),
    ) ?? false;

  if (pathname !== basePath) {
    return childHrefActive;
  }

  if (item.view) {
    return item.view === activeView;
  }

  return childHrefActive || (item.children?.some((child) => child.view === activeView) ?? false);
}

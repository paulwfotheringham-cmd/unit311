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
  | "strategy"
  | "potential-clients"
  | "whiteboard"
  | "competitors"
  | "assets"
  | "inventory-management"
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
  | "social"
  | "settings"
  | "billing"
  | "calendar"
  | "info-email"
  | "files"
  | "files-internal"
  | "files-external"
  | "files-client"
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
  | "profile"
  | "executive-assistant"
  | "website-management"
  | "engineering"
  | "engineering-dashboard"
  | "engineering-resources";

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
  if (host === "internal.unit311central.com" || host === "internal.localhost") {
    return "/";
  }
  // Customer workspace hosts use /dashboard as the public app URL.
  if (
    host.endsWith(".unit311central.com") &&
    host !== "unit311central.com" &&
    host !== "www.unit311central.com" &&
    host !== "internal.unit311central.com"
  ) {
    return "/dashboard";
  }
  if (host.endsWith(".localhost") && host !== "localhost" && host !== "internal.localhost") {
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
  "strategy",
  "potential-clients",
  "whiteboard",
  "competitors",
  "assets",
  "inventory-management",
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
  "social",
  "settings",
  "billing",
  "calendar",
  "info-email",
  "files",
  "files-internal",
  "files-external",
  "files-client",
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
  "profile",
  "executive-assistant",
  "website-management",
  "engineering",
  "engineering-dashboard",
  "engineering-resources",
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
] as const satisfies readonly InternalOperationsView[];

export const ASSETS_NAV_VIEWS = [
  "assets",
  "inventory-management",
] as const satisfies readonly InternalOperationsView[];

export function isProjectsNavView(view: InternalOperationsView): boolean {
  return (PROJECTS_NAV_VIEWS as readonly string[]).includes(view);
}

export function isEngineeringNavView(view: InternalOperationsView): boolean {
  return (ENGINEERING_NAV_VIEWS as readonly string[]).includes(view);
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
  { key: "software-licences", label: "Software & Licences" },
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
    case "corporate-software":
      return "software-licences";
    case "corporate-contracts":
      return "contracts";
    default:
      return null;
  }
}

export function normalizeInternalOperationsView(value: string | null): InternalOperationsView {
  if (value === "live-projects") return "projects";
  if (value === "sector-mining") return "sector";
  if (value === "files") return "files-internal";
  if (value === "debtors") return "accounts-receivable";
  if (value === "creditors") return "accounts-payable";
  if (value === "opex") return "financials";
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
    view === "projects-external" ||
    view === "inventory-management" ||
    view === "engineering-dashboard" ||
    view === "engineering-resources"
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
  /** One nested level only (e.g. Unit311 Details → Module Go-Live). */
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
  readonly items: readonly InternalNavItem[];
};

export const internalSurveyNavSections: readonly InternalNavSection[] = [
  {
    label: "Home",
    items: [{ label: "Dashboard", icon: "LayoutDashboard", view: "home" as const }],
  },
  ...(EXECUTIVE_ASSISTANT_VISIBLE
    ? [
        {
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
    label: "Business Central",
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
        label: "CRM",
        icon: "ContactRound",
        children: [
          { label: "Pipeline", view: "crm" as const },
          { label: "Discovery & Demo Sessions", view: "crm-meetings" as const },
          { label: "Client Onboarding", view: "client-onboarding" as const },
          { label: "Potential Clients", view: "potential-clients" as const },
        ],
      },
      { label: "Partners", icon: "Handshake", view: "representatives" as const },
      {
        label: "Projects",
        icon: "FolderKanban",
        children: [
          { label: "Dashboard", view: "projects-dashboard" as const },
          { label: "Internal Projects", view: "projects-internal" as const },
          { label: "External Projects", view: "projects-external" as const },
        ],
      },
      { label: "Grants", icon: "Landmark", view: "grants" as const },
    ],
  },
  {
    label: "Financials",
    items: [
      {
        label: "Financials",
        icon: "Wallet",
        children: [
          { label: "Overview", view: "financials" as const },
          { label: "General Ledger", view: "general-ledger" as const },
          { label: "Accounts Receivable", view: "accounts-receivable" as const },
          { label: "Accounts Payable", view: "accounts-payable" as const },
          { label: "Expenses", view: "expenses" as const },
          { label: "Bank", view: "wise" as const },
          { label: "Reports", view: "financial-reports" as const },
        ],
      },
    ],
  },
  {
    label: "Human Resources",
    items: [
      {
        label: "Human Resources",
        icon: "Briefcase",
        children: [
          { label: "Dashboard", view: "hr-dashboard" as const },
          { label: "Employees", view: "hr" as const },
          { label: "Leave", view: "hr-leave" as const },
          { label: "Performance", view: "hr-performance" as const },
          { label: "Recruitment", view: "hr-recruitment" as const },
        ],
      },
    ],
  },
  {
    label: "Corporate Information",
    items: [
      {
        label: "Corporate Information",
        icon: "MapPin",
        children: [
          { label: "Dashboard", view: "corporate-dashboard" as const },
          { label: "Company Details", view: "corporate-company-details" as const },
          { label: "Cap Table", view: "corporate-cap-table" as const },
          { label: "Office Locations", view: "office-locations" as const },
          { label: "Bank Accounts", view: "corporate-bank-accounts" as const },
          { label: "Professional Advisors", view: "corporate-advisers" as const },
          { label: "Software & Licences", view: "corporate-software" as const },
          { label: "Contracts", view: "corporate-contracts" as const },
          {
            label: "Unit311 Details",
            children: [
              { label: "Overview", view: "unit311-details" as const },
              { label: "Module Go-Live", view: "module-go-live" as const },
            ],
          },
        ],
      },
    ],
  },
  {
    label: "Assets",
    items: [
      {
        label: "Assets",
        icon: "Package",
        children: [
          { label: "Assets", view: "assets" as const },
          { label: "Inventory Management", view: "inventory-management" as const },
          { label: "Logistics", view: "logistics" as const },
        ],
      },
    ],
  },
  {
    label: "Business Productivity",
    items: [
      {
        label: "File Explorer",
        icon: "FolderOpen",
        children: [
          { label: "Internal Files", view: "files-internal" as const },
          { label: "External Files", view: "files-external" as const },
          { label: "Client Explorer", view: "files-client" as const },
        ],
      },
      { label: "Calendar", icon: "CalendarDays", view: "calendar" as const },
      { label: "Email", icon: "Mail", view: "info-email" as const },
      { label: "Messaging", icon: "MessageSquare", view: "messaging" as const },
      { label: "Social", icon: "Share2", view: "social" as const },
      { label: "Support Desk", icon: "LifeBuoy", view: "support" as const },
    ],
  },
  {
    label: "Training",
    items: [
      {
        label: "Training",
        icon: "GraduationCap",
        children: [
          { label: "Dashboard", view: "training-dashboard" as const },
          { label: "Staff Training", view: "training" as const },
          { label: "QMS Training", view: "qms-training" as const },
        ],
      },
    ],
  },
  {
    label: "QMS",
    items: [
      {
        label: "Quality Management System",
        icon: "ShieldCheck",
        view: "quality-management" as const,
      },
    ],
  },
  {
    label: "Engineering",
    items: [
      {
        label: "Engineering",
        icon: "Wrench",
        children: [
          { label: "Dashboard", view: "engineering-dashboard" as const },
          { label: "Engineer / Resource Breakdown", view: "engineering-resources" as const },
        ],
      },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Website Management", icon: "Globe", view: "website-management" as const },
      { label: "Testing", icon: "FlaskConical", view: "testing" as const },
      { label: "Telemetry", icon: "Radio", view: "telemetry" as const },
      { label: "Users", icon: "Users", view: "users" as const },
    ],
  },
  {
    label: "External Client Access",
    items: [
      {
        label: "External Client Access",
        icon: "KeyRound",
        children: [
          { label: "Dashboard", view: "external-client-access" as const },
          { label: "External Users", view: "users-external" as const },
        ],
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Settings",
        icon: "Settings",
        children: [
          { label: "Profile", view: "profile" as const },
          { label: "General", view: "settings" as const },
          { label: "Platform Billing", view: "billing" as const },
        ],
      },
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
  home: { title: "Dashboard", subtitle: "Home" },
  clients: { title: "Client Directory", subtitle: "Clients" },
  "clients-dashboard": { title: "Clients Dashboard", subtitle: "Clients" },
  crm: { title: "CRM Pipeline", subtitle: "CRM" },
  "crm-meetings": {
    title: "Discovery & Demo Sessions",
    subtitle: "CRM",
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
  "corporate-cap-table": { title: "Cap Table", subtitle: "Corporate Information" },
  "corporate-bank-accounts": { title: "Bank Accounts", subtitle: "Corporate Information" },
  "corporate-advisers": { title: "Professional Advisors", subtitle: "Corporate Information" },
  "corporate-insurance": { title: "Insurance", subtitle: "Corporate Information" },
  "corporate-software": { title: "Software & Licences", subtitle: "Corporate Information" },
  "corporate-contracts": { title: "Contracts", subtitle: "Corporate Information" },
  financials: { title: "Financial Overview", subtitle: "Financials" },
  "general-ledger": { title: "General Ledger", subtitle: "Financials" },
  "accounts-receivable": { title: "Accounts Receivable", subtitle: "Financials" },
  "accounts-payable": { title: "Accounts Payable", subtitle: "Financials" },
  "financial-reports": { title: "Reports", subtitle: "Financials" },
  opex: { title: "Opex", subtitle: "Financials" },
  wise: { title: "Bank", subtitle: "Financials" },
  "board-pack": { title: "Board deck", subtitle: "Strategy" },
  debtors: { title: "Accounts Receivable", subtitle: "Financials" },
  creditors: { title: "Accounts Payable", subtitle: "Financials" },
  expenses: { title: "Expenses", subtitle: "Financials" },
  hr: { title: "Employees", subtitle: "Human Resources" },
  "hr-dashboard": { title: "Dashboard", subtitle: "Human Resources" },
  "hr-recruitment": { title: "Recruitment", subtitle: "Human Resources" },
  "hr-leave": { title: "Leave", subtitle: "Human Resources" },
  "hr-performance": { title: "Performance", subtitle: "Human Resources" },
  strategy: { title: "Strategy", subtitle: "Strategy" },
  "potential-clients": { title: "Potential Clients", subtitle: "CRM" },
  whiteboard: { title: "Whiteboard", subtitle: "Strategy" },
  competitors: { title: "Competitors", subtitle: "Strategy" },
  assets: { title: "Assets", subtitle: "Assets" },
  "inventory-management": { title: "Inventory Management", subtitle: "Assets" },
  fleet: { title: "Fleet", subtitle: "Internal Operations" },
  testing: { title: "Flight Simulator Testing", subtitle: "Tools" },
  projects: { title: "Projects", subtitle: "Projects" },
  "projects-dashboard": { title: "Projects Dashboard", subtitle: "Projects" },
  "projects-internal": { title: "Internal Projects", subtitle: "Projects" },
  "projects-external": { title: "External Projects", subtitle: "Projects" },
  grants: { title: "Grants", subtitle: "Business Central" },
  "recent-missions": { title: "Recent Missions", subtitle: "Internal Operations" },
  webodm: { title: "WebODM Processing", subtitle: "Internal Operations" },
  messaging: { title: "Messaging", subtitle: "Business Productivity" },
  social: { title: "Social", subtitle: "Business Productivity" },
  settings: { title: "General", subtitle: "Settings" },
  billing: { title: "Platform Billing", subtitle: "Settings" },
  calendar: { title: "Calendar", subtitle: "Business Productivity" },
  "info-email": { title: "Email", subtitle: "Business Productivity" },
  files: { title: "File Explorer", subtitle: "Business Productivity" },
  "files-internal": { title: "Internal Files", subtitle: "File Explorer" },
  "unit311-details": { title: "Unit311 Details", subtitle: "Corporate Information" },
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
  "media-example": { title: "Media Example", subtitle: "Internal Operations" },
  "design-mockups": { title: "Design Concepts", subtitle: "Internal Operations" },
  sector: { title: "Sector Intelligence", subtitle: "Unit311" },
  training: { title: "Staff Training", subtitle: "Training" },
  "training-dashboard": { title: "Training Dashboard", subtitle: "Training" },
  logistics: { title: "Logistics", subtitle: "Assets" },
  "client-onboarding": { title: "Client Onboarding", subtitle: "CRM" },
  "quality-management": { title: "Quality Management System", subtitle: "QMS" },
  "qms-training": { title: "QMS Training", subtitle: "Training" },
  profile: { title: "Profile", subtitle: "Settings" },
  "executive-assistant": { title: "Executive Assistant", subtitle: "Executive" },
  "website-management": { title: "Website Management", subtitle: "Tools" },
  engineering: { title: "Engineering", subtitle: "Engineering" },
  "engineering-dashboard": { title: "Engineering Dashboard", subtitle: "Engineering" },
  "engineering-resources": {
    title: "Engineer / Resource Breakdown",
    subtitle: "Engineering",
  },
};

/** Breadcrumb labels for the active internal leaf (section → … → page). */
export function getInternalNavBreadcrumb(
  activeView: InternalOperationsView,
): readonly string[] {
  const titles = internalViewTitles[activeView];
  const pageTitle = titles?.title ?? activeView;

  for (const section of internalSurveyNavSections) {
    for (const item of section.items) {
      const trail = findNavTrailLabels(item, activeView, []);
      if (trail) {
        const crumbs =
          section.label != null ? [section.label, ...trail] : [...trail];
        if (crumbs[crumbs.length - 1] !== pageTitle) {
          crumbs.push(pageTitle);
        }
        return crumbs;
      }
    }
  }

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
      description: "Internal operator chat.",
      accent: "from-blue-500/20 to-sky-600/10 border-blue-400/30",
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

function joinBasePath(basePath: SurveyOperationsBasePath, suffix: string) {
  if (basePath === "/") {
    return suffix.startsWith("/") ? suffix : `/${suffix}`;
  }
  return `${basePath}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

export function getInternalNavHref(
  view: InternalOperationsView | null,
  basePath: SurveyOperationsBasePath = INTERNAL_OPERATIONS_BASE_PATH,
  query?: Record<string, string>,
) {
  if (view === "client-onboarding") {
    return joinBasePath(basePath, "/client-onboarding");
  }

  if (view === "executive-assistant") {
    return joinBasePath(basePath, "/executive-assistant");
  }

  if (view === "corporate-cap-table") {
    return joinBasePath(basePath, "/corporate-information/cap-table");
  }

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
  if (item.view === "client-onboarding") {
    const onboardingPath = joinBasePath(basePath, "/client-onboarding");
    return (
      activeView === "client-onboarding" ||
      pathname === onboardingPath ||
      pathname.startsWith(`${onboardingPath}/`)
    );
  }
  if (item.view === "executive-assistant") {
    const assistantPath = joinBasePath(basePath, "/executive-assistant");
    return (
      activeView === "executive-assistant" ||
      pathname === assistantPath ||
      pathname.startsWith(`${assistantPath}/`)
    );
  }
  if (item.view === "corporate-cap-table") {
    const capTablePath = joinBasePath(basePath, "/corporate-information/cap-table");
    return (
      activeView === "corporate-cap-table" ||
      pathname === capTablePath ||
      pathname.startsWith(`${capTablePath}/`) ||
      (activeView === "corporate-information" &&
        searchParams?.get("tab") === "cap-table")
    );
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

  if (item.view === "client-onboarding") {
    return (
      activeView === "client-onboarding" ||
      pathname === `${basePath}/client-onboarding` ||
      pathname.startsWith(`${basePath}/client-onboarding/`) ||
      childHrefActive
    );
  }

  if (item.view === "executive-assistant") {
    return (
      activeView === "executive-assistant" ||
      pathname === `${basePath}/executive-assistant` ||
      pathname.startsWith(`${basePath}/executive-assistant/`) ||
      childHrefActive
    );
  }

  if (pathname !== basePath) {
    return childHrefActive;
  }

  if (item.view) {
    return item.view === activeView;
  }

  return childHrefActive || (item.children?.some((child) => child.view === activeView) ?? false);
}

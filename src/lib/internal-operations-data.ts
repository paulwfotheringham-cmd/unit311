import type { SurveyOperationsBasePath } from "@/lib/survey-operations-mock-data";

export type InternalOperationsView =
  | "home"
  | "clients"
  | "crm"
  | "connections"
  | "representatives"
  | "office-locations"
  | "financials"
  | "debtors"
  | "creditors"
  | "expenses"
  | "hr"
  | "strategy"
  | "whiteboard"
  | "competitors"
  | "assets"
  | "fleet"
  | "testing"
  | "projects"
  | "recent-missions"
  | "webodm"
  | "messaging"
  | "social"
  | "settings"
  | "calendar"
  | "info-email"
  | "files"
  | "files-internal"
  | "files-external"
  | "files-client"
  | "users"
  | "users-external"
  | "support"
  | "telemetry"
  | "media-example"
  | "design-mockups"
  | "sector"
  | "training"
  | "logistics";

export const INTERNAL_OPERATIONS_BASE_PATH: SurveyOperationsBasePath = "/internaldashboard";

export const internalOperationsViews: InternalOperationsView[] = [
  "home",
  "clients",
  "crm",
  "connections",
  "representatives",
  "office-locations",
  "financials",
  "debtors",
  "creditors",
  "expenses",
  "hr",
  "strategy",
  "whiteboard",
  "competitors",
  "assets",
  "fleet",
  "testing",
  "projects",
  "recent-missions",
  "webodm",
  "messaging",
  "social",
  "settings",
  "calendar",
  "info-email",
  "files",
  "files-internal",
  "files-external",
  "files-client",
  "users",
  "users-external",
  "support",
  "telemetry",
  "media-example",
  "design-mockups",
  "sector",
  "training",
  "logistics",
];

export function isInternalOperationsView(value: string | null): value is InternalOperationsView {
  return internalOperationsViews.includes(value as InternalOperationsView);
}

export function normalizeInternalOperationsView(value: string | null): InternalOperationsView {
  if (value === "live-projects") return "projects";
  if (value === "sector-mining") return "sector";
  if (value === "files") return "files-internal";
  return isInternalOperationsView(value) ? value : "home";
}

export type InternalNavChildItem = {
  readonly label: string;
  readonly view?: InternalOperationsView;
  readonly href?: string;
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
    label: null,
    items: [{ label: "Home", icon: "LayoutDashboard", view: "home" as const }],
  },
  {
    label: "Business Central",
    items: [
      { label: "Clients", icon: "Building2", view: "clients" as const },
      { label: "CRM", icon: "ContactRound", view: "crm" as const },
      { label: "Representatives", icon: "Handshake", view: "representatives" as const },
      { label: "Office Locations", icon: "MapPin", view: "office-locations" as const },
      { label: "Projects", icon: "FolderKanban", view: "projects" as const },
      {
        label: "Financials",
        icon: "Wallet",
        children: [
          { label: "Overview", view: "financials" as const },
          { label: "Debtors", view: "debtors" as const },
          { label: "Creditors", view: "creditors" as const },
          { label: "Expenses", view: "expenses" as const },
        ],
      },
      { label: "HR", icon: "Briefcase", view: "hr" as const },
    ],
  },
  {
    label: "Inventory Management",
    items: [{ label: "Assets", icon: "Package", view: "assets" as const }],
  },
  {
    label: "Business Productivity",
    items: [
      {
        label: "File Explorer",
        icon: "FolderOpen",
        children: [
          { label: "Internal files", view: "files-internal" as const },
          { label: "External files", view: "files-external" as const },
          { label: "Client explorer", view: "files-client" as const },
        ],
      },
      { label: "Calendar", icon: "CalendarDays", view: "calendar" as const },
      { label: "Logistics", icon: "Truck", view: "logistics" as const },
      { label: "Email", icon: "Mail", view: "info-email" as const },
      { label: "Messaging", icon: "MessageSquare", view: "messaging" as const },
      { label: "Social", icon: "Share2", view: "social" as const },
      {
        label: "Support",
        icon: "LifeBuoy",
        children: [
          { label: "Support desk", view: "support" as const },
          { label: "Whatsapp Testing", href: "/whatsapp/support-flow" },
        ],
      },
    ],
  },
  {
    label: "Strategy",
    items: [
      { label: "Strategy", icon: "Compass", view: "strategy" as const },
      { label: "Competitors", icon: "Binoculars", view: "competitors" as const },
      { label: "Whiteboard", icon: "PenLine", view: "whiteboard" as const },
      { label: "Sector", icon: "Pickaxe", view: "sector" as const },
    ],
  },
  {
    label: "Training",
    items: [{ label: "Training", icon: "GraduationCap", view: "training" as const }],
  },
  {
    label: "Tools",
    items: [
      { label: "Testing", icon: "FlaskConical", view: "testing" as const },
      {
        label: "Users",
        icon: "Users",
        children: [
          { label: "Internal users", view: "users" as const },
          { label: "External users", view: "users-external" as const },
        ],
      },
    ],
  },
  {
    label: "Settings",
    items: [{ label: "Settings", icon: "Settings", view: "settings" as const }],
  },
];

export const internalSurveyNavItems: InternalNavItem[] = internalSurveyNavSections.flatMap(
  (section) => [...section.items],
);

export const internalViewTitles: Record<
  InternalOperationsView,
  { title: string; subtitle: string }
> = {
  home: { title: "Internal Operations", subtitle: "Unit311" },
  clients: { title: "Client Directory", subtitle: "Internal Operations" },
  crm: { title: "CRM", subtitle: "Internal Operations" },
  connections: { title: "Connections", subtitle: "Internal Operations" },
  representatives: { title: "Representatives", subtitle: "Internal Operations" },
  "office-locations": { title: "Office Locations", subtitle: "Business Central" },
  financials: { title: "Financials", subtitle: "Internal Operations" },
  debtors: { title: "Debtors", subtitle: "Accounts Receivable" },
  creditors: { title: "Creditors", subtitle: "Accounts Payable" },
  expenses: { title: "Expenses", subtitle: "Internal Operations" },
  hr: { title: "Human Resources", subtitle: "Unit311" },
  strategy: { title: "Strategy", subtitle: "Internal Operations" },
  whiteboard: { title: "Whiteboard", subtitle: "Internal Operations" },
  competitors: { title: "Competitors", subtitle: "Internal Operations" },
  assets: { title: "Asset Registry", subtitle: "Internal Operations" },
  fleet: { title: "Fleet", subtitle: "Internal Operations" },
  testing: { title: "Flight Simulator Testing", subtitle: "Internal Operations" },
  projects: { title: "Projects", subtitle: "Internal Operations" },
  "recent-missions": { title: "Recent Missions", subtitle: "Internal Operations" },
  webodm: { title: "WebODM Processing", subtitle: "Internal Operations" },
  messaging: { title: "Messaging", subtitle: "Internal Operations" },
  social: { title: "Social", subtitle: "Unit311" },
  settings: { title: "Settings", subtitle: "Unit311" },
  calendar: { title: "Calendar", subtitle: "Internal Operations" },
  "info-email": { title: "Email", subtitle: "Internal Operations" },
  files: { title: "File Explorer", subtitle: "Internal Operations" },
  "files-internal": { title: "Internal Files", subtitle: "Internal Operations" },
  "files-external": { title: "External Files", subtitle: "Internal Operations" },
  "files-client": { title: "Client File Explorer", subtitle: "Internal Operations" },
  users: { title: "Internal Users", subtitle: "Internal Operations" },
  "users-external": { title: "External Users", subtitle: "Client Portals" },
  support: { title: "Support", subtitle: "Internal Operations" },
  telemetry: { title: "Live Telemetry", subtitle: "Internal Operations" },
  "media-example": { title: "Media Example", subtitle: "Internal Operations" },
  "design-mockups": { title: "Design Concepts", subtitle: "Internal Operations" },
  sector: { title: "Sector Intelligence", subtitle: "Unit311" },
  training: { title: "Training Programmes", subtitle: "Unit311" },
  logistics: { title: "Logistics", subtitle: "Package tracking" },
};

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

export function getInternalNavHref(view: InternalOperationsView | null) {
  if (!view || view === "home") {
    return INTERNAL_OPERATIONS_BASE_PATH;
  }

  return `${INTERNAL_OPERATIONS_BASE_PATH}?view=${view}`;
}

export function isInternalNavChildActive(
  item: InternalNavChildItem,
  activeView: InternalOperationsView = "home",
  pathname = "",
) {
  if (item.href) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return item.view === activeView;
}

export function isInternalNavItemActive(
  pathname: string,
  item: InternalNavItem,
  activeView: InternalOperationsView = "home",
) {
  if (item.href) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  const childHrefActive =
    item.children?.some((child) => isInternalNavChildActive(child, activeView, pathname)) ??
    false;

  if (pathname !== INTERNAL_OPERATIONS_BASE_PATH) {
    return childHrefActive;
  }

  if (item.view) {
    return item.view === activeView;
  }

  return childHrefActive || (item.children?.some((child) => child.view === activeView) ?? false);
}

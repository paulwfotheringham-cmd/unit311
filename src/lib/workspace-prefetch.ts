import type { InternalOperationsView } from "@/lib/internal-operations-data";

type WorkspaceLoader = () => Promise<unknown>;

/** Chunk loaders keyed by internal ops view. */
export const WORKSPACE_CHUNK_LOADERS: Partial<
  Record<InternalOperationsView, WorkspaceLoader>
> = {
  home: () => import("@/components/testflighthub/ExecutiveHomeDashboard"),
  crm: () => import("@/components/testflighthub/CrmWorkspace"),
  "crm-meetings": () => import("@/components/testflighthub/MeetingsWorkspace"),
  messaging: () => import("@/components/testflighthub/CommunicationsWorkspace"),
  communications: () => import("@/components/testflighthub/CommunicationsWorkspace"),
  projects: () => import("@/components/testflighthub/ProjectsWorkspace"),
  "projects-dashboard": () => import("@/components/testflighthub/ProjectsWorkspace"),
  "projects-internal": () => import("@/components/testflighthub/ProjectsWorkspace"),
  "projects-external": () => import("@/components/testflighthub/ProjectsWorkspace"),
  calendar: () => import("@/components/testflighthub/CalendarWorkspace"),
  financials: () => import("@/components/testflighthub/FinancialsWorkspace"),
  "general-ledger": () => import("@/components/testflighthub/GeneralLedgerWorkspace"),
  "accounts-receivable": () => import("@/components/testflighthub/AccountsReceivableWorkspace"),
  "accounts-payable": () => import("@/components/testflighthub/AccountsPayableWorkspace"),
  expenses: () => import("@/components/testflighthub/ExpensesWorkspace"),
  "financial-reports": () => import("@/components/testflighthub/FinancialReportsWorkspace"),
  clients: () => import("@/components/testflighthub/ClientManagementWorkspace"),
  "clients-dashboard": () => import("@/components/testflighthub/ClientsDashboardWorkspace"),
  "client-onboarding": () => import("@/components/testflighthub/ClientOnboardingWorkspace"),
  "potential-clients": () => import("@/components/testflighthub/PotentialClientsWorkspace"),
  hr: () => import("@/components/testflighthub/HrWorkspace"),
  "hr-leave": () => import("@/components/testflighthub/LeaveManagementWorkspace"),
  "hr-performance": () => import("@/components/testflighthub/PerformanceHubWorkspace"),
  "hr-recruitment": () => import("@/components/testflighthub/RecruitmentWorkspace"),
  settings: () => import("@/components/testflighthub/SettingsWorkspace"),
  profile: () => import("@/components/testflighthub/ProfileWorkspace"),
  users: () => import("@/components/testflighthub/UserManagementWorkspace"),
  "info-email": () => import("@/components/testflighthub/InfoEmailWorkspace"),
  "files-internal": () => import("@/components/testflighthub/FileRepositoryWorkspace"),
  "files-external": () => import("@/components/testflighthub/FileRepositoryWorkspace"),
  "files-client": () => import("@/components/testflighthub/ClientFilesExplorerWorkspace"),
  "productivity-dashboard": () => import("@/components/testflighthub/ProductivityDashboardWorkspace"),
  appearance: () => import("@/components/testflighthub/AppearanceSettingsWorkspace"),
  fleet: () => import("@/components/testflighthub/FleetWorkspace"),
  assets: () => import("@/components/testflighthub/AssetManagementWorkspace"),
  "inventory-management": () => import("@/components/testflighthub/InventoryManagementWorkspace"),
  procurement: () => import("@/components/testflighthub/ProcurementWorkspace"),
  support: () => import("@/components/testflighthub/SupportWorkspace"),
  logistics: () => import("@/components/testflighthub/LogisticsWorkspace"),
};

/**
 * Predict likely next navigations from the current workspace.
 * Prefetch these quietly after the current view is stable.
 */
export const VIEW_NEIGHBOR_PREFETCH: Partial<
  Record<InternalOperationsView, InternalOperationsView[]>
> = {
  home: ["clients", "financials", "projects", "executive-assistant"],
  clients: ["crm", "clients-dashboard", "client-onboarding", "projects"],
  "clients-dashboard": ["clients", "crm", "projects"],
  "client-onboarding": ["clients", "crm"],
  crm: ["projects", "crm-meetings", "clients", "potential-clients"],
  "crm-meetings": ["calendar", "crm", "communications"],
  "potential-clients": ["crm", "clients"],
  projects: ["financials", "calendar", "clients", "communications"],
  "projects-dashboard": ["projects", "financials"],
  "projects-internal": ["projects", "financials"],
  "projects-external": ["projects", "clients"],
  financials: ["general-ledger", "accounts-receivable", "accounts-payable", "expenses"],
  "general-ledger": ["financials", "financial-reports"],
  "accounts-receivable": ["financials", "accounts-payable"],
  "accounts-payable": ["financials", "accounts-receivable"],
  expenses: ["financials"],
  calendar: ["crm-meetings", "communications", "projects"],
  messaging: ["calendar", "info-email", "support"],
  communications: ["calendar", "info-email", "support"],
  "info-email": ["communications", "crm", "productivity-dashboard"],
  "productivity-dashboard": ["files-internal", "info-email", "calendar", "communications", "support"],
  "files-internal": ["files-external", "files-client", "productivity-dashboard"],
  hr: ["hr-leave", "hr-performance", "hr-recruitment"],
  "hr-leave": ["hr", "hr-performance"],
  "hr-performance": ["hr", "hr-leave"],
  "hr-recruitment": ["hr"],
  fleet: ["assets", "logistics", "calendar"],
  assets: ["fleet", "inventory-management", "procurement"],
  "inventory-management": ["assets", "procurement", "logistics"],
  procurement: ["inventory-management", "assets", "logistics"],
  logistics: ["procurement", "inventory-management", "fleet"],
  settings: ["profile", "users"],
  profile: ["settings"],
  users: ["settings", "users-external"],
};

const warmed = new Set<string>();

export function prefetchWorkspaceChunks(views: InternalOperationsView[]) {
  if (typeof window === "undefined") return;
  for (const view of views) {
    const loader = WORKSPACE_CHUNK_LOADERS[view];
    if (!loader || warmed.has(view)) continue;
    warmed.add(view);
    void loader().catch(() => {
      warmed.delete(view);
    });
  }
}

export function prefetchNeighborsForView(view: InternalOperationsView) {
  const neighbors = VIEW_NEIGHBOR_PREFETCH[view] ?? [];
  if (neighbors.length === 0) return;
  const run = () => prefetchWorkspaceChunks(neighbors);
  const ric = window.requestIdleCallback?.(run, { timeout: 3500 });
  if (ric == null) window.setTimeout(run, 900);
}

export function prefetchViewOnIntent(view: InternalOperationsView | undefined | null) {
  if (!view) return;
  prefetchWorkspaceChunks([view]);
}

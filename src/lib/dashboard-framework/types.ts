/**
 * Unit311 Central — Universal Dashboard Framework
 *
 * Dashboards are composed from configuration + reusable widgets.
 * Role / company / user filtering is built into the model so future
 * role-based and personalised dashboards plug in without rewriting pages.
 */

/** Platform roles supported by the framework (filtering not enforced yet). */
export type DashboardRole =
  | "ceo"
  | "cfo"
  | "sales-director"
  | "hr-manager"
  | "engineer"
  | "project-manager"
  | "standard-user";

export type DashboardAudience = {
  /** Optional company / tenant scope. */
  companyId?: string;
  /** Workspace key e.g. business-central, financials, hr. */
  workspaceId?: string;
  /** Active role for resolution. */
  role?: DashboardRole;
  /** End-user id for personalisation hooks. */
  userId?: string;
};

export type DashboardWidgetType =
  | "header"
  | "ai-summary"
  | "kpi"
  | "kpi-row"
  | "alerts"
  | "recent-activity"
  | "analytics"
  | "work-queue"
  | "quick-actions"
  | "empty"
  | "loading";

/** Standard section slots every workspace dashboard inherits. */
export type DashboardSectionSlot =
  | "header"
  | "ai-summary"
  | "kpi-row"
  | "alerts-activity"
  | "analytics-queue"
  | "quick-actions";

export type DashboardKpiTone = "neutral" | "positive" | "warning" | "critical";

export type DashboardKpiItem = {
  id: string;
  label: string;
  value: string;
  delta?: string;
  tone?: DashboardKpiTone;
  hint?: string;
};

export type DashboardAlertItem = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  timeLabel?: string;
};

export type DashboardActivityItem = {
  id: string;
  title: string;
  meta: string;
  timeLabel: string;
  category?: string;
};

export type DashboardAnalyticsSeries = {
  id: string;
  label: string;
  values: number[];
};

export type DashboardWorkQueueItem = {
  id: string;
  title: string;
  meta: string;
  status: string;
  dueLabel?: string;
  priority?: "low" | "medium" | "high";
};

export type DashboardQuickAction = {
  id: string;
  label: string;
  /** Action id for handlers — not a navigation menu. */
  action: string;
  icon?: "mail" | "calendar" | "upload" | "video" | "ticket" | "plus" | "file" | "users";
};

export type DashboardWidgetVisibility = {
  /** If set, widget only resolves for these roles. Empty / omitted = all roles. */
  roles?: readonly DashboardRole[];
  /** Optional company allow-list. */
  companyIds?: readonly string[];
  /** Optional workspace allow-list. */
  workspaceIds?: readonly string[];
  /** Lower number = higher priority when trimming for a role. */
  priority?: number;
  /** Future user personalisation key (show/hide/reorder). */
  personalisationKey?: string;
};

export type DashboardWidgetBase = {
  id: string;
  type: DashboardWidgetType;
  title?: string;
  subtitle?: string;
  visibility?: DashboardWidgetVisibility;
};

export type DashboardHeaderWidget = DashboardWidgetBase & {
  type: "header";
  workspaceName: string;
  eyebrow?: string;
  description?: string;
};

export type DashboardAiSummaryWidget = DashboardWidgetBase & {
  type: "ai-summary";
  headline: string;
  summary: string;
  nextUp?: string;
  metrics?: readonly { label: string; value: string }[];
};

export type DashboardKpiWidget = DashboardWidgetBase & {
  type: "kpi";
  kpi: DashboardKpiItem;
};

export type DashboardKpiRowWidget = DashboardWidgetBase & {
  type: "kpi-row";
  /** Exactly four KPIs for the standard layout. */
  kpis: readonly [DashboardKpiItem, DashboardKpiItem, DashboardKpiItem, DashboardKpiItem];
};

export type DashboardAlertsWidget = DashboardWidgetBase & {
  type: "alerts";
  items: readonly DashboardAlertItem[];
};

export type DashboardRecentActivityWidget = DashboardWidgetBase & {
  type: "recent-activity";
  items: readonly DashboardActivityItem[];
};

export type DashboardAnalyticsWidget = DashboardWidgetBase & {
  type: "analytics";
  series: readonly DashboardAnalyticsSeries[];
  caption?: string;
};

export type DashboardWorkQueueWidget = DashboardWidgetBase & {
  type: "work-queue";
  items: readonly DashboardWorkQueueItem[];
};

export type DashboardQuickActionsWidget = DashboardWidgetBase & {
  type: "quick-actions";
  actions: readonly DashboardQuickAction[];
};

export type DashboardEmptyWidget = DashboardWidgetBase & {
  type: "empty";
  message: string;
};

export type DashboardLoadingWidget = DashboardWidgetBase & {
  type: "loading";
};

export type DashboardWidgetConfig =
  | DashboardHeaderWidget
  | DashboardAiSummaryWidget
  | DashboardKpiWidget
  | DashboardKpiRowWidget
  | DashboardAlertsWidget
  | DashboardRecentActivityWidget
  | DashboardAnalyticsWidget
  | DashboardWorkQueueWidget
  | DashboardQuickActionsWidget
  | DashboardEmptyWidget
  | DashboardLoadingWidget;

export type DashboardSectionConfig = {
  id: string;
  slot: DashboardSectionSlot;
  /** One or more widgets for the slot (e.g. alerts + activity side by side). */
  widgets: readonly DashboardWidgetConfig[];
  visibility?: DashboardWidgetVisibility;
};

export type WorkspaceDashboardConfig = {
  id: string;
  workspaceId: string;
  version: 1;
  audience?: DashboardAudience;
  sections: readonly DashboardSectionConfig[];
};

export type DashboardActionHandler = (action: string, widgetId: string) => void;

export type ResolveDashboardOptions = {
  audience?: DashboardAudience;
  /** When true, empty visibility means visible to everyone. Default true. */
  defaultVisible?: boolean;
};

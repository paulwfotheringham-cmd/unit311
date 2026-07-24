export type {
  DashboardActionHandler,
  DashboardActivityItem,
  DashboardAiSummaryWidget,
  DashboardAlertItem,
  DashboardAlertsWidget,
  DashboardAnalyticsSeries,
  DashboardAnalyticsWidget,
  DashboardAudience,
  DashboardEmptyWidget,
  DashboardHeaderWidget,
  DashboardKpiItem,
  DashboardKpiRowWidget,
  DashboardKpiTone,
  DashboardKpiWidget,
  DashboardLoadingWidget,
  DashboardQuickAction,
  DashboardQuickActionsWidget,
  DashboardRecentActivityWidget,
  DashboardRole,
  DashboardSectionConfig,
  DashboardSectionSlot,
  DashboardWidgetConfig,
  DashboardWidgetType,
  DashboardWidgetVisibility,
  DashboardWorkQueueItem,
  DashboardWorkQueueWidget,
  ResolveDashboardOptions,
  WorkspaceDashboardConfig,
} from "./types";

export {
  filterSections,
  filterWidgets,
  isVisibilityAllowed,
  normalizeKpiRow,
  resolveWorkspaceDashboard,
} from "./composition";

export {
  businessCentralDashboardConfig,
  DASHBOARD_CONFIG_REGISTRY,
  financialsDashboardConfig,
} from "./configs";

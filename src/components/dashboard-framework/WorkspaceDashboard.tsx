"use client";

import type {
  DashboardActionHandler,
  DashboardAudience,
  DashboardSectionConfig,
  DashboardWidgetConfig,
  WorkspaceDashboardConfig,
} from "@/lib/dashboard-framework";
import { resolveWorkspaceDashboard } from "@/lib/dashboard-framework";

import AiSummaryWidget from "./widgets/AiSummaryWidget";
import AlertWidget from "./widgets/AlertWidget";
import AnalyticsWidget from "./widgets/AnalyticsWidget";
import DashboardHeaderWidgetView from "./widgets/DashboardHeaderWidget";
import EmptyStateWidget from "./widgets/EmptyStateWidget";
import KpiRowWidget, { KpiWidget } from "./widgets/KpiWidget";
import LoadingStateWidget from "./widgets/LoadingStateWidget";
import QuickActionsWidget from "./widgets/QuickActionsWidget";
import RecentActivityWidget from "./widgets/RecentActivityWidget";
import WorkQueueWidget from "./widgets/WorkQueueWidget";

export function renderDashboardWidget(
  widget: DashboardWidgetConfig,
  onAction?: DashboardActionHandler,
) {
  switch (widget.type) {
    case "header":
      return <DashboardHeaderWidgetView key={widget.id} widget={widget} />;
    case "ai-summary":
      return <AiSummaryWidget key={widget.id} widget={widget} />;
    case "kpi":
      return <KpiWidget key={widget.id} kpi={widget.kpi} />;
    case "kpi-row":
      return <KpiRowWidget key={widget.id} widget={widget} />;
    case "alerts":
      return <AlertWidget key={widget.id} widget={widget} />;
    case "recent-activity":
      return <RecentActivityWidget key={widget.id} widget={widget} />;
    case "analytics":
      return <AnalyticsWidget key={widget.id} widget={widget} />;
    case "work-queue":
      return <WorkQueueWidget key={widget.id} widget={widget} />;
    case "quick-actions":
      return <QuickActionsWidget key={widget.id} widget={widget} onAction={onAction} />;
    case "empty":
      return <EmptyStateWidget key={widget.id} widget={widget} />;
    case "loading":
      return <LoadingStateWidget key={widget.id} widget={widget} />;
    default: {
      const _exhaustive: never = widget;
      return _exhaustive;
    }
  }
}

function Section({
  section,
  onAction,
}: {
  section: DashboardSectionConfig;
  onAction?: DashboardActionHandler;
}) {
  if (section.slot === "alerts-activity" || section.slot === "analytics-queue") {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {section.widgets.map((widget) => renderDashboardWidget(widget, onAction))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {section.widgets.map((widget) => renderDashboardWidget(widget, onAction))}
    </div>
  );
}

const SLOT_ORDER = [
  "header",
  "ai-summary",
  "kpi-row",
  "alerts-activity",
  "analytics-queue",
  "quick-actions",
] as const;

type WorkspaceDashboardProps = {
  config: WorkspaceDashboardConfig;
  audience?: DashboardAudience;
  loading?: boolean;
  onAction?: DashboardActionHandler;
  className?: string;
};

/**
 * Standard workspace dashboard shell.
 * Renders only from configuration — no hard-coded workspace content.
 */
export default function WorkspaceDashboard({
  config,
  audience,
  loading = false,
  onAction,
  className,
}: WorkspaceDashboardProps) {
  if (loading) {
    return (
      <div className={className ?? "mx-auto max-w-6xl space-y-4 pb-4"}>
        <LoadingStateWidget label="Loading workspace dashboard" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <LoadingStateWidget />
          <LoadingStateWidget />
          <LoadingStateWidget />
          <LoadingStateWidget />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <LoadingStateWidget />
          <LoadingStateWidget />
        </div>
      </div>
    );
  }

  const resolved = resolveWorkspaceDashboard(config, { audience });
  const sectionsBySlot = new Map(resolved.sections.map((section) => [section.slot, section]));

  return (
    <div className={className ?? "mx-auto max-w-6xl space-y-4 pb-4"}>
      {SLOT_ORDER.map((slot) => {
        const section = sectionsBySlot.get(slot);
        if (!section) return null;
        return <Section key={section.id} section={section} onAction={onAction} />;
      })}
    </div>
  );
}

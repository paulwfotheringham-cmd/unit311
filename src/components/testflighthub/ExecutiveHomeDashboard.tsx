"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { WorkspaceDashboard } from "@/components/dashboard-framework";
import ExecutiveQuickActionsBar, {
  type ExecutiveQuickAction,
} from "@/components/testflighthub/ExecutiveQuickActionsBar";
import { useInternalOperationsBasePath } from "@/components/testflighthub/InternalOperationsBasePathContext";
import { executiveHomeDashboardConfig } from "@/lib/executive-home-dashboard";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import type { WorkspaceDashboardConfig } from "@/lib/dashboard-framework";

const AUDIENCE = { workspaceId: "home", role: "ceo" as const };

function splitExecutiveHomeConfig(config: WorkspaceDashboardConfig): {
  top: WorkspaceDashboardConfig;
  body: WorkspaceDashboardConfig;
  actions: ExecutiveQuickAction[];
} {
  const topSections = config.sections.filter(
    (section) => section.slot === "header" || section.slot === "ai-summary",
  );
  const bodySections = config.sections.filter(
    (section) =>
      section.slot !== "header" &&
      section.slot !== "ai-summary" &&
      section.slot !== "quick-actions",
  );
  const actionsSection = config.sections.find((section) => section.slot === "quick-actions");
  const actionsWidget = actionsSection?.widgets.find((widget) => widget.type === "quick-actions");
  const actions: ExecutiveQuickAction[] =
    actionsWidget && actionsWidget.type === "quick-actions"
      ? actionsWidget.actions.map((action) => ({
          id: action.id,
          label: action.label,
          action: action.action,
          icon:
            action.icon === "mail" ||
            action.icon === "upload" ||
            action.icon === "plus" ||
            action.icon === "file" ||
            action.icon === "users"
              ? action.icon
              : undefined,
        }))
      : [];

  return {
    top: { ...config, id: `${config.id}-top`, sections: topSections },
    body: { ...config, id: `${config.id}-body`, sections: bodySections },
    actions,
  };
}

/**
 * Flagship Home experience — Executive Operating Centre.
 * Framework widgets for content; Quick Actions are sticky page chrome.
 */
export default function ExecutiveHomeDashboard() {
  const router = useRouter();
  const basePath = useInternalOperationsBasePath();
  const { top, body, actions } = useMemo(
    () => splitExecutiveHomeConfig(executiveHomeDashboardConfig),
    [],
  );

  function handleAction(action: string) {
    switch (action) {
      case "create-client":
        router.push(getInternalNavHref("clients", basePath));
        break;
      case "create-project":
        router.push(getInternalNavHref("projects", basePath));
        break;
      case "generate-board-report":
        router.push(getInternalNavHref("board-pack", basePath));
        break;
      case "open-executive-assistant":
        router.push(getInternalNavHref("executive-assistant", basePath));
        break;
      case "export-dashboard":
        break;
      default:
        break;
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-4">
      <WorkspaceDashboard config={top} audience={AUDIENCE} className="max-w-none space-y-4" />
      <ExecutiveQuickActionsBar actions={actions} onAction={handleAction} />
      <WorkspaceDashboard config={body} audience={AUDIENCE} className="max-w-none space-y-4" />
    </div>
  );
}

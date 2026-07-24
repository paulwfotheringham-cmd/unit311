"use client";

import { useRouter } from "next/navigation";

import { WorkspaceDashboard } from "@/components/dashboard-framework";
import { useInternalOperationsBasePath } from "@/components/testflighthub/InternalOperationsBasePathContext";
import { executiveHomeDashboardConfig } from "@/lib/executive-home-dashboard";
import { getInternalNavHref } from "@/lib/internal-operations-data";

/**
 * Flagship Home experience — Executive Operating Centre.
 * Assembled only from the universal dashboard framework.
 */
export default function ExecutiveHomeDashboard() {
  const router = useRouter();
  const basePath = useInternalOperationsBasePath();

  return (
    <WorkspaceDashboard
      config={executiveHomeDashboardConfig}
      audience={{ workspaceId: "home", role: "ceo" }}
      onAction={(action) => {
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
            // Placeholder — export wiring arrives with live data feeds.
            break;
          default:
            break;
        }
      }}
    />
  );
}

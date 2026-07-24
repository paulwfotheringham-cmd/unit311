"use client";

import { useRouter } from "next/navigation";

import { WorkspaceDashboard } from "@/components/dashboard-framework";
import { useInternalOperationsBasePath } from "@/components/testflighthub/InternalOperationsBasePathContext";
import { getInternalNavHref, type InternalOperationsView } from "@/lib/internal-operations-data";
import { technologyManagementDashboardConfig } from "@/lib/technology-management-dashboard";

/**
 * Technology Management — Dashboard
 * Composed entirely from the Universal Dashboard Framework.
 */
export default function TechnologyDashboardWorkspace() {
  const router = useRouter();
  const basePath = useInternalOperationsBasePath();

  return (
    <WorkspaceDashboard
      config={technologyManagementDashboardConfig}
      audience={{ workspaceId: "technology", role: "standard-user" }}
      onAction={(action) => {
        const map: Record<string, InternalOperationsView> = {
          "open-devices": "technology-devices",
          "open-software": "technology-software",
          "open-telecom": "technology-telecommunications",
          "open-infra": "technology-infrastructure",
        };
        const view = map[action];
        if (view) router.push(getInternalNavHref(view, basePath));
      }}
    />
  );
}

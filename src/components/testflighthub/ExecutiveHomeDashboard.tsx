"use client";

import { WorkspaceDashboard } from "@/components/dashboard-framework";
import { executiveHomeDashboardConfig } from "@/lib/executive-home-dashboard";

/**
 * Flagship Home experience — Executive Operating Centre.
 * Quick Actions live in the application page header, not the dashboard body.
 */
export default function ExecutiveHomeDashboard() {
  return (
    <WorkspaceDashboard
      config={executiveHomeDashboardConfig}
      audience={{ workspaceId: "home", role: "ceo" }}
    />
  );
}

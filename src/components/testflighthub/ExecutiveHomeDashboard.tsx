"use client";

import { WorkspaceDashboard } from "@/components/dashboard-framework";
import { executiveHomeDashboardConfig } from "@/lib/executive-home-dashboard";

/** Flagship Home experience — Executive Operating Centre. */
export default function ExecutiveHomeDashboard() {
  return (
    <WorkspaceDashboard
      config={executiveHomeDashboardConfig}
      audience={{ workspaceId: "home", role: "ceo" }}
    />
  );
}

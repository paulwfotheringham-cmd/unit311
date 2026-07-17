import { NextResponse } from "next/server";

import { getFinancialOverview } from "@/lib/accounting/overview-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const overview = await getFinancialOverview({ workspaceId: workspace.id });
    return NextResponse.json({ overview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load overview.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from "next/server";

import { listFinancialActivity } from "@/lib/accounting/activity";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const activity = await listFinancialActivity(undefined, { workspaceId: workspace.id });
    return NextResponse.json({ activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load activity.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

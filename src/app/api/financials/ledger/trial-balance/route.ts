import { NextResponse } from "next/server";

import { getTrialBalance, getTypeTotals } from "@/lib/accounting/balances";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };
    const [trialBalance, totals] = await Promise.all([
      getTrialBalance(scope),
      getTypeTotals(scope),
    ]);
    return NextResponse.json({ trialBalance, totals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load trial balance.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

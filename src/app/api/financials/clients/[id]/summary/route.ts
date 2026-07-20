import { NextResponse } from "next/server";

import { getClientFinanceSummary } from "@/lib/accounting/client-finance";
import { apiErrorStatus } from "@/lib/api-error-status";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const summary = await getClientFinanceSummary(id, { workspaceId: workspace.id });
    if (!summary) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }
    return NextResponse.json({ summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load client finance summary.";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(error) });
  }
}

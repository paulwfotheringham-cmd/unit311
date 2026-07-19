import { NextResponse } from "next/server";

import { listAccountTransactions } from "@/lib/accounting/journal-service";
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
    const transactions = await listAccountTransactions(id, undefined, {
      workspaceId: workspace.id,
    });
    return NextResponse.json({ transactions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load account transactions.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

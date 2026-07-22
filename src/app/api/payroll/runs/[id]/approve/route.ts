import { NextRequest, NextResponse } from "next/server";

import { approvePayrollRun } from "@/lib/payroll/payroll-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await params;
    const run = await approvePayrollRun(id, { workspaceId: workspace.id });
    return NextResponse.json({ run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve payroll run.";
    const status = message.includes("Authentication") || message.includes("Workspace") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

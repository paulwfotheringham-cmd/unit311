import { NextRequest, NextResponse } from "next/server";

import { createPayrollRun, listPayrollRuns } from "@/lib/payroll/payroll-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const runs = await listPayrollRuns({ workspaceId: workspace.id });
    return NextResponse.json({ runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list payroll runs.";
    const status = message.includes("Authentication") || message.includes("Workspace") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const body = await request.json().catch(() => ({}));
    const run = await createPayrollRun(
      { payDate: body.payDate, notes: body.notes },
      { workspaceId: workspace.id },
    );
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payroll run.";
    const status = message.includes("Authentication") || message.includes("Workspace") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

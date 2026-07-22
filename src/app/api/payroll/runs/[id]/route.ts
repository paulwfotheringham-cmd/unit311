import { NextRequest, NextResponse } from "next/server";

import {
  getPayrollRun,
  updatePayrollRunStatus,
} from "@/lib/payroll/payroll-service";
import type { PayrollRunStatus } from "@/lib/payroll/types";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await params;
    const run = await getPayrollRun(id, { workspaceId: workspace.id });
    if (!run) return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
    return NextResponse.json({ run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payroll run.";
    const status = message.includes("Authentication") || message.includes("Workspace") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await params;
    const body = await request.json();
    if (!body.status) {
      return NextResponse.json({ error: "status is required." }, { status: 400 });
    }
    const run = await updatePayrollRunStatus(id, body.status as PayrollRunStatus, {
      workspaceId: workspace.id,
    });
    return NextResponse.json({ run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update payroll run.";
    const status = message.includes("Authentication") || message.includes("Workspace") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

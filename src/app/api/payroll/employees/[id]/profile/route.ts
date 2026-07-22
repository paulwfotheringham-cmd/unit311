import { NextRequest, NextResponse } from "next/server";

import { calculateEmployeePayroll } from "@/lib/payroll/engine";
import {
  getEmployeePayrollProfile,
  getPayrollSettings,
  upsertEmployeePayrollProfile,
} from "@/lib/payroll/payroll-service";
import { getHrEmployee } from "@/lib/hr-employees-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await params;
    const [employee, profile, settings] = await Promise.all([
      getHrEmployee(id, { workspaceId: workspace.id }),
      getEmployeePayrollProfile(id, { workspaceId: workspace.id }),
      getPayrollSettings({ workspaceId: workspace.id }),
    ]);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }
    const calculation = calculateEmployeePayroll(
      {
        salaryCurrent: employee.salaryCurrent,
        bonus: employee.bonus,
        payFrequency: employee.payFrequency,
        currency: employee.currency,
        profile,
      },
      settings,
    );
    return NextResponse.json({ profile, calculation, settings, employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payroll profile.";
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
    const profile = await upsertEmployeePayrollProfile(id, body ?? {}, {
      workspaceId: workspace.id,
    });
    const [employee, settings] = await Promise.all([
      getHrEmployee(id, { workspaceId: workspace.id }),
      getPayrollSettings({ workspaceId: workspace.id }),
    ]);
    const calculation = employee
      ? calculateEmployeePayroll(
          {
            salaryCurrent: employee.salaryCurrent,
            bonus: employee.bonus,
            payFrequency: employee.payFrequency,
            currency: employee.currency,
            profile,
          },
          settings,
        )
      : null;
    return NextResponse.json({ profile, calculation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update payroll profile.";
    const status = message.includes("Authentication") || message.includes("Workspace") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

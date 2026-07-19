import { NextRequest, NextResponse } from "next/server";

import {
  getHrEmployeeDetail,
  updateHrEmployee,
  type UpdateHrEmployeePatch,
} from "@/lib/hr-employees-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const employee = await getHrEmployeeDetail(id, { workspaceId: workspace.id });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    return NextResponse.json({ employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load employee";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as UpdateHrEmployeePatch;
    const employee = await updateHrEmployee(id, body, { workspaceId: workspace.id });
    return NextResponse.json({ employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update employee";
    const status =
      message.includes("Authentication required") ||
      message.includes("Workspace context") ||
      message.includes("Employee not found")
        ? message.includes("Employee not found")
          ? 404
          : 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: "Employees cannot be deleted. Archive the employee instead.",
      code: "EMPLOYEE_DELETE_FORBIDDEN",
    },
    { status: 405, headers: { Allow: "GET, PATCH" } },
  );
}

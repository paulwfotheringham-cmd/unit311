import { NextRequest, NextResponse } from "next/server";

import { deleteHrEmployee, updateHrEmployee } from "@/lib/hr-employees-service";
import type { HrDocuments } from "@/lib/hr-data";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type EmployeeBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  dateJoined?: string;
  location?: string;
  role?: string;
  department?: string;
  manager?: string;
  salaryCurrent?: number;
  salaryPrevious?: number;
  salaryIncreaseDate?: string | null;
  salaryIncreaseAmount?: number;
  bonus?: number;
  holidayCalendar?: string;
  vacationDaysPerYear?: number;
  vacationDaysTaken?: number;
  documents?: HrDocuments;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as EmployeeBody;

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

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    await deleteHrEmployee(id, { workspaceId: workspace.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete employee";
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

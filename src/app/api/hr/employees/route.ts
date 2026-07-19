import { NextRequest, NextResponse } from "next/server";

import {
  createHrEmployee,
  listHrEmployees,
} from "@/lib/hr-employees-service";
import type { HrEmployee } from "@/lib/hr-data";
import { ensureHrEmployeesTable } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    await ensureHrEmployeesTable();
    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
    const employees = await listHrEmployees({
      workspaceId: workspace.id,
      includeArchived,
    });
    return NextResponse.json({ employees });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load employees";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const body = (await request.json()) as Partial<HrEmployee> & { fullName?: string };

    if (!body.fullName?.trim()) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    await ensureHrEmployeesTable();
    const employee = await createHrEmployee(
      {
        ...body,
        fullName: body.fullName.trim(),
      },
      { workspaceId: workspace.id },
    );
    return NextResponse.json({ employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create employee";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { addEmployeeNote, getHrEmployeeDetail } from "@/lib/hr-employees-service";
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
    const detail = await getHrEmployeeDetail(id, { workspaceId: workspace.id });
    if (!detail) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    return NextResponse.json({ notes: detail.notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  try {
    const session = await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as { body?: string; createdBy?: string };
    if (!body.body?.trim()) {
      return NextResponse.json({ error: "Note body is required." }, { status: 400 });
    }
    const note = await addEmployeeNote(
      id,
      body.body,
      body.createdBy || session.displayName || session.username || "system",
      { workspaceId: workspace.id },
    );
    return NextResponse.json({ note });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

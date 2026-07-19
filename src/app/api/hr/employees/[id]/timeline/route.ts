import { NextRequest, NextResponse } from "next/server";

import { addTimelineManualEvent, getHrEmployeeDetail } from "@/lib/hr-employees-service";
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
    return NextResponse.json({ timeline: detail.timeline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load timeline";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      detail?: string;
      occurredAt?: string;
    };
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    const event = await addTimelineManualEvent(
      id,
      {
        title: body.title,
        detail: body.detail,
        occurredAt: body.occurredAt,
      },
      { workspaceId: workspace.id },
    );
    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add timeline event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

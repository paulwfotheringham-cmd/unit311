import { NextRequest, NextResponse } from "next/server";

import type { CalendarEventType } from "@/lib/calendar-data";
import { deleteCalendarEvent, updateCalendarEvent } from "@/lib/internal-calendar-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      eventType?: CalendarEventType;
      startsAt?: string;
      endsAt?: string;
      clientName?: string;
      location?: string;
      notes?: string;
    };

    if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const event = await updateCalendarEvent(id, body, { workspaceId: workspace.id });
    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update calendar event";
    const status =
      message.includes("Authentication required") ||
      message.includes("Workspace context") ||
      message.includes("Calendar event not found")
        ? message.includes("Calendar event not found")
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
    await deleteCalendarEvent(id, { workspaceId: workspace.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete calendar event";
    const status =
      message.includes("Authentication required") ||
      message.includes("Workspace context") ||
      message.includes("Calendar event not found")
        ? message.includes("Calendar event not found")
          ? 404
          : 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

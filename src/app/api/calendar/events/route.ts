import { NextRequest, NextResponse } from "next/server";

import type { CalendarEventType } from "@/lib/calendar-data";
import { createCalendarEvent, listCalendarEvents } from "@/lib/internal-calendar-service";
import {
  appendAttendeesToNotes,
  normalizeAttendeeEmails,
  sendCalendarMeetingInvites,
} from "@/lib/calendar-invite-email";
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
    const from = request.nextUrl.searchParams.get("from") ?? undefined;
    const to = request.nextUrl.searchParams.get("to") ?? undefined;
    const events = await listCalendarEvents(from, to, { workspaceId: workspace.id });
    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load calendar events";
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
    const session = await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const body = (await request.json()) as {
      title?: string;
      eventType?: CalendarEventType;
      startsAt?: string;
      endsAt?: string;
      clientName?: string;
      location?: string;
      notes?: string;
      attendeeEmails?: string | string[];
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!body.startsAt || !body.endsAt) {
      return NextResponse.json({ error: "Start and end times are required" }, { status: 400 });
    }
    if (new Date(body.endsAt) <= new Date(body.startsAt)) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const attendeeEmails = normalizeAttendeeEmails(body.attendeeEmails);
    const notes = appendAttendeesToNotes(body.notes, attendeeEmails);

    const event = await createCalendarEvent(
      {
        title: body.title,
        eventType: body.eventType,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        clientName: body.clientName,
        location: body.location,
        notes: notes ?? undefined,
      },
      { workspaceId: workspace.id },
    );

    const invites = await sendCalendarMeetingInvites({
      event,
      attendeeEmails,
      organiserName: session.displayName || session.username || null,
      organiserEmail: null,
      workspaceId: workspace.id,
    });

    return NextResponse.json({ event, invites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create calendar event";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

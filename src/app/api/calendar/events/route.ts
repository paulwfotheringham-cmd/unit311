import { NextRequest, NextResponse } from "next/server";

import type { CalendarEventType } from "@/lib/calendar-data";
import {
  appendAttendeesToNotes,
  buildCalendarMeetingUrl,
  normalizeAttendeeEmails,
  sendCalendarMeetingInvites,
} from "@/lib/calendar-invite-email";
import { appendTimezoneToNotes } from "@/lib/calendar-meeting-time";
import { createCalendarEvent, listCalendarEvents } from "@/lib/internal-calendar-service";
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
      timeZone?: string;
      generateMeetingUrl?: boolean;
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
    const timeZone = body.timeZone?.trim() || "Europe/London";
    let notes = appendAttendeesToNotes(body.notes, attendeeEmails);
    notes = appendTimezoneToNotes(notes, timeZone);

    const shouldGenerateMeetingUrl = body.generateMeetingUrl !== false;
    const locationHint = body.location?.trim() || null;

    const event = await createCalendarEvent(
      {
        title: body.title,
        eventType: body.eventType,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        clientName: body.clientName,
        location: locationHint ?? undefined,
        notes: notes ?? undefined,
      },
      { workspaceId: workspace.id },
    );

    let finalEvent = event;
    if (shouldGenerateMeetingUrl) {
      const canonicalUrl = buildCalendarMeetingUrl(event.id);
      if (event.location !== canonicalUrl) {
        const { updateCalendarEvent } = await import("@/lib/internal-calendar-service");
        finalEvent = await updateCalendarEvent(
          event.id,
          { location: canonicalUrl },
          { workspaceId: workspace.id },
        );
      }
    }

    const invites = await sendCalendarMeetingInvites({
      event: finalEvent,
      attendeeEmails,
      organiserName: session.displayName || session.username || null,
      organiserEmail: "info@unit311central.com",
      workspaceId: workspace.id,
      timeZone,
    });

    return NextResponse.json({ event: finalEvent, invites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create calendar event";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

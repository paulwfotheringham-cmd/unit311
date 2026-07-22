import { NextRequest, NextResponse } from "next/server";

import type { CalendarEventType } from "@/lib/calendar-data";
import {
  appendAttendeesToNotes,
  normalizeAttendeeEmails,
  sendCalendarMeetingInvites,
} from "@/lib/calendar-invite-email";
import { appendTimezoneToNotes, extractTimezoneFromNotes } from "@/lib/calendar-meeting-time";
import { deleteCalendarEvent, getCalendarEvent, updateCalendarEvent } from "@/lib/internal-calendar-service";
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
    const session = await requirePlatformSession();
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
      attendeeEmails?: string | string[];
      timeZone?: string;
      sendInvites?: boolean;
    };

    if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const existing = await getCalendarEvent(id, { workspaceId: workspace.id });
    if (!existing) {
      return NextResponse.json({ error: "Calendar event not found" }, { status: 404 });
    }

    const attendeeEmails =
      body.attendeeEmails !== undefined
        ? normalizeAttendeeEmails(body.attendeeEmails)
        : normalizeAttendeeEmails(
            existing.notes?.match(/Attendees:\s*(.+)$/im)?.[1],
          );
    const timeZone =
      body.timeZone?.trim() ||
      extractTimezoneFromNotes(existing.notes) ||
      "Europe/London";

    let notes = body.notes !== undefined ? body.notes : existing.notes;
    notes = appendAttendeesToNotes(notes, attendeeEmails);
    notes = appendTimezoneToNotes(notes, timeZone);

    const event = await updateCalendarEvent(
      id,
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

    let invites: { sent: number; failed: string[]; meetingUrl: string } | undefined;
    if (body.sendInvites !== false && attendeeEmails.length > 0) {
      invites = await sendCalendarMeetingInvites({
        event,
        attendeeEmails,
        organiserName: session.displayName || session.username || null,
        organiserEmail: "info@unit311central.com",
        workspaceId: workspace.id,
        timeZone,
      });
    }

    return NextResponse.json({ event, invites });
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

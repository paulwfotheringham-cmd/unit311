import { NextRequest, NextResponse } from "next/server";

import {
  appendAttendeesToNotes,
  buildCalendarMeetingUrl,
  sendCalendarMeetingInvites,
} from "@/lib/calendar-invite-email";
import {
  addMinutesToIso,
  appendTimezoneToNotes,
  combineDateTimeInTimezone,
} from "@/lib/calendar-meeting-time";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/internal-calendar-service";
import { findWorkspaceBySlug, INTERNAL_WORKSPACE_SLUG } from "@/lib/workspace-host";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const setupSecret = process.env.INTERNAL_FILES_SETUP_SECRET?.trim();
  const smokeToken = process.env.CALENDAR_INVITE_SMOKE_TOKEN?.trim();
  const provided =
    request.headers.get("x-setup-secret")?.trim() ||
    request.headers.get("x-calendar-invite-smoke-token")?.trim() ||
    request.nextUrl.searchParams.get("token")?.trim();

  if (smokeToken && provided === smokeToken) return true;
  if (setupSecret && provided === setupSecret) return true;
  return false;
}

/**
 * Production smoke for calendar meeting invitations.
 * Auth: x-calendar-invite-smoke-token or x-setup-secret.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      to?: string;
      timeZone?: string;
      cleanup?: boolean;
    };

    const to = body.to?.trim() || "paul.w.fotheringham@gmail.com";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: "Invalid to email" }, { status: 400 });
    }

    const internal = await findWorkspaceBySlug(INTERNAL_WORKSPACE_SLUG);
    if (!internal?.id) {
      return NextResponse.json({ error: "Internal workspace not found" }, { status: 500 });
    }

    const timeZone = body.timeZone?.trim() || "Europe/London";
    const startsAt = combineDateTimeInTimezone(
      new Date().toISOString().slice(0, 10),
      "15:00",
      timeZone,
    );
    const endsAt = addMinutesToIso(startsAt, 30);

    let notes = appendAttendeesToNotes("Calendar invite smoke test", [to]);
    notes = appendTimezoneToNotes(notes, timeZone);

    const event = await createCalendarEvent(
      {
        title: "Unit311 calendar invitation verification",
        eventType: "meeting",
        startsAt,
        endsAt,
        notes: notes ?? undefined,
      },
      { workspaceId: internal.id },
    );

    const meetingUrl = buildCalendarMeetingUrl(event.id);
    const finalEvent = await updateCalendarEvent(
      event.id,
      { location: meetingUrl },
      { workspaceId: internal.id },
    );

    const invites = await sendCalendarMeetingInvites({
      event: finalEvent,
      attendeeEmails: [to],
      organiserName: "Unit311 Central",
      organiserEmail: "info@unit311central.com",
      workspaceId: internal.id,
      timeZone,
    });

    if (body.cleanup !== false) {
      try {
        await deleteCalendarEvent(event.id, { workspaceId: internal.id });
      } catch {
        // Keep invite result even if cleanup fails.
      }
    }

    return NextResponse.json({
      ok: invites.sent > 0,
      eventId: finalEvent.id,
      meetingUrl,
      timezone: timeZone,
      startsAt,
      endsAt,
      invites,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invite smoke failed" },
      { status: 500 },
    );
  }
}

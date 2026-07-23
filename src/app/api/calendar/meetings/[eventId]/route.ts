import { NextRequest, NextResponse } from "next/server";

import {
  getCalendarMeetingSession,
  joinCalendarMeeting,
  leaveCalendarMeeting,
  saveCalendarMeetingTranscript,
  startCalendarMeeting,
} from "@/lib/calendar-meeting-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { eventId } = await context.params;
    const payload = await getCalendarMeetingSession(eventId);
    if (!payload) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load meeting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { eventId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      guestName?: string;
      force?: boolean;
    };
    const action = body.action?.trim() || "join";

    if (action === "start") {
      await startCalendarMeeting(eventId);
      const payload = await getCalendarMeetingSession(eventId);
      return NextResponse.json(payload);
    }

    if (action === "join") {
      await joinCalendarMeeting(eventId, body.guestName);
      const payload = await getCalendarMeetingSession(eventId);
      return NextResponse.json(payload);
    }

    if (action === "leave-host") {
      await leaveCalendarMeeting(eventId, "host");
      let saveResult: Awaited<ReturnType<typeof saveCalendarMeetingTranscript>> | null = null;
      let saveError: string | null = null;
      try {
        saveResult = await saveCalendarMeetingTranscript(eventId);
      } catch (error) {
        saveError = error instanceof Error ? error.message : "Failed to save meeting notes";
      }
      const payload = await getCalendarMeetingSession(eventId);
      return NextResponse.json({ ...payload, saveResult, saveError });
    }

    if (action === "leave-guest") {
      await leaveCalendarMeeting(eventId, "guest");
      const payload = await getCalendarMeetingSession(eventId);
      return NextResponse.json(payload);
    }

    if (action === "save-transcript") {
      const saveResult = await saveCalendarMeetingTranscript(eventId, {
        force: Boolean(body.force),
      });
      const payload = await getCalendarMeetingSession(eventId);
      return NextResponse.json({ ...payload, saveResult });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update meeting";
    const status =
      message.includes("Only") || message.includes("Waiting")
        ? 403
        : message.includes("not found") || message.includes("ended")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

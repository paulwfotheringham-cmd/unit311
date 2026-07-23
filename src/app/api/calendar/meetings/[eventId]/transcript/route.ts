import { NextRequest, NextResponse } from "next/server";

import {
  appendCalendarMeetingTranscriptLine,
  getCalendarMeetingSession,
} from "@/lib/calendar-meeting-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { eventId } = await context.params;
    const payload = await getCalendarMeetingSession(eventId);
    if (!payload) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      action?: string;
      speaker?: string;
      text?: string;
    };

    if ((body.action?.trim() || "append") !== "append") {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const lines = await appendCalendarMeetingTranscriptLine(eventId, {
      speaker: body.speaker ?? "Speaker",
      text: body.text ?? "",
    });

    return NextResponse.json({ lines });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to append transcript";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

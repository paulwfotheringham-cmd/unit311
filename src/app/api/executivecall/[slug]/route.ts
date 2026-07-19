import { NextRequest, NextResponse } from "next/server";

import {
  admitExecutiveCallGuests,
  getExecutiveCallSession,
  joinExecutiveCall,
  leaveExecutiveCall,
  startExecutiveCall,
} from "@/lib/executive-call-meeting-service";
import { sendExecutiveCallPostMeetingThankYou } from "@/lib/executive-call-after-meeting-service";
import { saveExecutiveCallTranscript } from "@/lib/executive-call-transcript-service";
import { clearWebrtcSignals } from "@/lib/executive-call-webrtc-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { slug } = await context.params;
    const payload = await getExecutiveCallSession(slug);
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
    const { slug } = await context.params;
    const body = (await request.json()) as { action?: string };
    const action = body.action?.trim();

    if (action === "start") {
      const meeting = await startExecutiveCall(slug);
      const payload = await getExecutiveCallSession(slug);
      return NextResponse.json({ meeting, ...payload });
    }

    if (action === "admit-guests") {
      const meeting = await admitExecutiveCallGuests(slug);
      await clearWebrtcSignals(slug).catch(() => undefined);
      const payload = await getExecutiveCallSession(slug);
      return NextResponse.json({ meeting, ...payload });
    }

    if (action === "join") {
      const meeting = await joinExecutiveCall(slug);
      const payload = await getExecutiveCallSession(slug);
      return NextResponse.json({ meeting, ...payload });
    }

    if (action === "leave-host") {
      const payloadBeforeEnd = await getExecutiveCallSession(slug);
      const wasAlreadyEnded = Boolean(payloadBeforeEnd?.meeting.hostLeftAt);

      const meeting = await leaveExecutiveCall(slug, "host");

      let saveResult: Awaited<ReturnType<typeof saveExecutiveCallTranscript>> | null = null;
      let saveError: string | null = null;
      const payloadAfterLeave = await getExecutiveCallSession(slug);
      if (payloadAfterLeave && !payloadAfterLeave.meeting.transcriptSavedAt) {
        try {
          saveResult = await saveExecutiveCallTranscript(slug);
        } catch (error) {
          saveError = error instanceof Error ? error.message : "Failed to save meeting notes";
        }
      }

      if (!wasAlreadyEnded) {
        try {
          await sendExecutiveCallPostMeetingThankYou(slug);
        } catch {
          // Non-blocking if SMTP is unavailable.
        }
      }

      const payload = await getExecutiveCallSession(slug);
      return NextResponse.json({ meeting, ...payload, saveResult, saveError });
    }

    if (action === "leave-client") {
      const meeting = await leaveExecutiveCall(slug, "client");
      const payload = await getExecutiveCallSession(slug);
      return NextResponse.json({ meeting, ...payload });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update meeting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { getExecutiveCallSession } from "@/lib/executive-call-meeting-service";
import {
  appendExecutiveCallTranscriptLine,
  saveExecutiveCallTranscript,
} from "@/lib/executive-call-transcript-service";
import { getPlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function isInternalHost(guestEmail: string) {
  return getPlatformSession().then((session) => {
    if (!session || session.userType !== "internal") return false;
    const normalizedGuest = guestEmail.trim().toLowerCase();
    const viewerIdentity = session.username.trim().toLowerCase();
    return !(normalizedGuest && viewerIdentity === normalizedGuest);
  });
}

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

    return NextResponse.json({
      lines: payload.transcript,
      transcriptSavedAt: payload.meeting.transcriptSavedAt,
      transcriptFileId: payload.meeting.transcriptFileId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load transcript";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { slug } = await context.params;
    const body = (await request.json()) as {
      action?: string;
      speaker?: string;
      text?: string;
    };

    if (body.action === "append") {
      const speaker = body.speaker?.trim();
      const text = body.text?.trim();
      if (!speaker || !text) {
        return NextResponse.json({ error: "Speaker and text are required." }, { status: 400 });
      }

      const lines = await appendExecutiveCallTranscriptLine(slug, { speaker, text });
      return NextResponse.json({ lines });
    }

    if (body.action === "save") {
      const payload = await getExecutiveCallSession(slug);
      if (!payload) {
        return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
      }

      const allowed = await isInternalHost(payload.meeting.email);
      if (!allowed) {
        return NextResponse.json({ error: "Only the Unit311 host can save the transcript." }, { status: 403 });
      }

      const result = await saveExecutiveCallTranscript(slug);
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update transcript";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

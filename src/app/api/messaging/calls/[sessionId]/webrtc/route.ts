import { NextRequest, NextResponse } from "next/server";

import {
  clearWebrtcSignals,
  listWebrtcSignalsSince,
  postWebrtcSignal,
  type WebrtcSenderRole,
  type WebrtcSignalType,
} from "@/lib/executive-call-webrtc-service";
import { getMessagingCallSession } from "@/lib/messaging-call-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

const SIGNAL_TYPES = new Set<WebrtcSignalType>([
  "offer",
  "answer",
  "ice-candidate",
  "hangup",
  "ready",
]);

const ROLES = new Set<WebrtcSenderRole>(["host", "guest"]);

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const session = await requirePlatformSession();
    const { sessionId } = await context.params;
    const payload = await getMessagingCallSession(sessionId, session);
    if (!payload) {
      return NextResponse.json({ error: "Call not found." }, { status: 404 });
    }

    const after = request.nextUrl.searchParams.get("after");
    const excludeRoleParam = request.nextUrl.searchParams.get("excludeRole");
    const excludeRole =
      excludeRoleParam && ROLES.has(excludeRoleParam as WebrtcSenderRole)
        ? (excludeRoleParam as WebrtcSenderRole)
        : null;

    const signals = await listWebrtcSignalsSince({
      meetingSlug: sessionId,
      afterIso: after,
      excludeRole,
    });

    return NextResponse.json({ signals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load WebRTC signals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const session = await requirePlatformSession();
    const { sessionId } = await context.params;
    const payload = await getMessagingCallSession(sessionId, session);
    if (!payload) {
      return NextResponse.json({ error: "Call not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      action?: string;
      senderRole?: string;
      signalType?: string;
      payload?: Record<string, unknown>;
    };

    const senderRole = body.senderRole?.trim() as WebrtcSenderRole | undefined;
    if (!senderRole || !ROLES.has(senderRole)) {
      return NextResponse.json({ error: "senderRole must be host or guest." }, { status: 400 });
    }

    const expectedHost = payload.viewer.isHost;
    if ((senderRole === "host" && !expectedHost) || (senderRole === "guest" && expectedHost)) {
      return NextResponse.json({ error: "Sender role does not match this viewer." }, { status: 403 });
    }

    if (body.action === "clear") {
      if (senderRole !== "host") {
        return NextResponse.json({ error: "Only the host can clear signaling state." }, { status: 403 });
      }
      await clearWebrtcSignals(sessionId);
      return NextResponse.json({ cleared: true });
    }

    const signalType = body.signalType?.trim() as WebrtcSignalType | undefined;
    if (!signalType || !SIGNAL_TYPES.has(signalType)) {
      return NextResponse.json({ error: "Unsupported signalType." }, { status: 400 });
    }

    const signal = await postWebrtcSignal({
      meetingSlug: sessionId,
      senderRole,
      signalType,
      payload: body.payload ?? {},
    });

    return NextResponse.json({ signal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to post WebRTC signal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

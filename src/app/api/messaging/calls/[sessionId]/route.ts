import { NextRequest, NextResponse } from "next/server";

import {
  getMessagingCallSession,
  joinMessagingCallRoom,
  leaveMessagingCallRoom,
} from "@/lib/messaging-call-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

function authErrorStatus(message: string) {
  if (message.includes("Authentication required")) return 401;
  if (message.includes("not found") || message.includes("ended")) return 404;
  if (message.includes("already has two")) return 409;
  return 500;
}

export async function GET(_request: NextRequest, context: RouteContext) {
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
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load call";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const session = await requirePlatformSession();
    const { sessionId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action = body.action?.trim() || "join";

    if (action === "leave") {
      const room = await leaveMessagingCallRoom({ sessionId, session });
      return NextResponse.json({ room });
    }

    if (action === "join") {
      const payload = await joinMessagingCallRoom({ sessionId, session });
      return NextResponse.json(payload);
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update call";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}

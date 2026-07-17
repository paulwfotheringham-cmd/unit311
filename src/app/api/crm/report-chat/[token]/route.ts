import { NextRequest, NextResponse } from "next/server";

import {
  getReportChatSession,
  sendReportChatGuestMessage,
} from "@/lib/crm-client-report-service";
import { listMessages } from "@/lib/internal-messaging-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { token } = await context.params;
    const session = await getReportChatSession(token);
    if (!session) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }

    const messages = await listMessages(
      { room: session.room, limit: 200 },
      session.workspaceId ? { workspaceId: session.workspaceId } : undefined,
    );
    return NextResponse.json({ session, messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { token } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { content?: string };
    const message = await sendReportChatGuestMessage(token, body.content ?? "");
    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

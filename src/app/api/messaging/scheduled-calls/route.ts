import { NextRequest, NextResponse } from "next/server";

import { createScheduledCall, listScheduledCalls } from "@/lib/internal-messaging-service";
import { localListScheduledCalls } from "@/lib/internal-messaging-local-store";
import { INTERNAL_MESSAGING_ROOM } from "@/lib/internal-messaging-data";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

function authErrorStatus(message: string) {
  return message.includes("Authentication required") || message.includes("Workspace context")
    ? 401
    : 500;
}

export async function GET(request: NextRequest) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const room = request.nextUrl.searchParams.get("room") ?? undefined;
    const scheduledCalls = isSupabaseConfigured()
      ? await listScheduledCalls(room ?? undefined, scope)
      : localListScheduledCalls();
    return NextResponse.json({ scheduledCalls, source: isSupabaseConfigured() ? "supabase" : "local" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load scheduled calls";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const body = (await request.json()) as {
      room?: string;
      title?: string;
      scheduledAt?: string;
      participantOperatorIds?: string[];
      callLink?: string;
      callType?: "voice" | "video";
      createdByOperatorId?: string;
      createdByOperatorName?: string;
    };

    if (
      !body.title ||
      !body.scheduledAt ||
      !body.callLink ||
      !body.createdByOperatorId ||
      !body.createdByOperatorName
    ) {
      return NextResponse.json({ error: "Scheduled call details are incomplete." }, { status: 400 });
    }

    const scheduledCall = await createScheduledCall(
      {
        room: body.room ?? INTERNAL_MESSAGING_ROOM,
        title: body.title,
        scheduledAt: body.scheduledAt,
        participantOperatorIds: body.participantOperatorIds ?? [],
        callLink: body.callLink,
        callType: body.callType ?? "video",
        createdByOperatorId: body.createdByOperatorId,
        createdByOperatorName: body.createdByOperatorName,
      },
      scope,
    );

    return NextResponse.json({ scheduledCall });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to schedule call";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}

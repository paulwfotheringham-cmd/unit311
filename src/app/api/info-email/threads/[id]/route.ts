import { NextRequest, NextResponse } from "next/server";

import { addInfoEmailReply, getInfoEmailThread } from "@/lib/internal-info-email-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function authErrorStatus(message: string) {
  return message.includes("Authentication required") || message.includes("Workspace context")
    ? 401
    : 500;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const { id } = await context.params;
    const thread = await getInfoEmailThread(id, scope);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    return NextResponse.json({ thread });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load thread";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const { id } = await context.params;
    const body = (await request.json()) as {
      replyBody?: string;
      repliedByUserId?: string;
      repliedByName?: string;
    };

    if (!body.replyBody?.trim()) {
      return NextResponse.json({ error: "Reply body is required" }, { status: 400 });
    }
    if (!body.repliedByUserId?.trim() || !body.repliedByName?.trim()) {
      return NextResponse.json({ error: "Select who is replying" }, { status: 400 });
    }

    const thread = await addInfoEmailReply(
      {
        threadId: id,
        body: body.replyBody,
        repliedByUserId: body.repliedByUserId,
        repliedByName: body.repliedByName,
      },
      scope,
    );

    return NextResponse.json({ thread });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send reply";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}

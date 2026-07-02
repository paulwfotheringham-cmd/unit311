import { NextRequest, NextResponse } from "next/server";

import {
  createChannel,
  listChannelsForViewer,
  markChannelRead,
  updateChannelMembers,
} from "@/lib/internal-messaging-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const viewerType = request.nextUrl.searchParams.get("viewerType");
    const operatorId = request.nextUrl.searchParams.get("operatorId") ?? undefined;
    const clientKey = request.nextUrl.searchParams.get("clientKey") ?? undefined;
    const viewerKey = request.nextUrl.searchParams.get("viewerKey") ?? operatorId ?? `client:${clientKey}`;

    if (viewerType === "client") {
      if (!clientKey) {
        return NextResponse.json({ error: "clientKey is required." }, { status: 400 });
      }
      const channels = await listChannelsForViewer({
        viewerType: "client",
        clientKey,
        viewerKey,
      });
      return NextResponse.json({ channels });
    }

    if (viewerType === "internal") {
      const resolvedOperatorId = operatorId ?? "user-1";
      const channels = await listChannelsForViewer({
        viewerType: "internal",
        operatorId: resolvedOperatorId,
        viewerKey: operatorId ?? viewerKey ?? resolvedOperatorId,
      });
      return NextResponse.json({ channels });
    }

    const channels = await listChannelsForViewer({
      viewerType: "internal",
      operatorId: operatorId ?? "user-1",
      viewerKey: viewerKey,
    });
    return NextResponse.json({ channels });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load channels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      channelType?: "internal" | "client";
      clientKey?: string;
      createdByOperatorId?: string;
      createdByOperatorName?: string;
      memberOperatorIds?: string[];
      memberClientUsernames?: string[];
      description?: string;
      isPrivate?: boolean;
    };

    if (!body.name || !body.createdByOperatorId || !body.createdByOperatorName) {
      return NextResponse.json({ error: "Channel name and creator are required." }, { status: 400 });
    }

    const channel = await createChannel({
      name: body.name,
      channelType: body.channelType ?? "internal",
      clientKey: body.clientKey ?? null,
      createdByOperatorId: body.createdByOperatorId,
      createdByOperatorName: body.createdByOperatorName,
      memberOperatorIds: body.memberOperatorIds ?? [],
      memberClientUsernames: body.memberClientUsernames,
      description: body.description,
      isPrivate: body.isPrivate,
    });

    return NextResponse.json({ channel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create channel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      channelId?: string;
      memberOperatorIds?: string[];
      viewerKey?: string;
      room?: string;
      action?: "markRead";
    };

    if (body.action === "markRead" && body.viewerKey && body.room) {
      await markChannelRead(body.viewerKey, body.room);
      return NextResponse.json({ ok: true });
    }

    if (!body.channelId || !body.memberOperatorIds) {
      return NextResponse.json({ error: "Channel ID and members are required." }, { status: 400 });
    }

    const channel = await updateChannelMembers(body.channelId, body.memberOperatorIds);
    return NextResponse.json({ channel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update channel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

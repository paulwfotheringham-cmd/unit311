import { NextRequest, NextResponse } from "next/server";

import { getUnreadTotal, listChannelsForViewer } from "@/lib/internal-messaging-service";
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
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const viewerKey = request.nextUrl.searchParams.get("viewerKey");
    if (!viewerKey) {
      return NextResponse.json({ error: "viewerKey is required." }, { status: 400 });
    }

    if (viewerKey.startsWith("client:")) {
      const clientKey = viewerKey.slice("client:".length);
      const channels = await listChannelsForViewer(
        {
          viewerType: "client",
          clientKey,
          viewerKey,
        },
        scope,
      );
      const unreadTotal = channels.reduce((sum, channel) => sum + (channel.unreadCount ?? 0), 0);
      return NextResponse.json({ unreadTotal });
    }

    if (viewerKey.startsWith("user-")) {
      const channels = await listChannelsForViewer(
        {
          viewerType: "internal",
          operatorId: viewerKey,
          viewerKey,
        },
        scope,
      );
      const unreadTotal = channels.reduce((sum, channel) => sum + (channel.unreadCount ?? 0), 0);
      return NextResponse.json({ unreadTotal });
    }

    const unreadTotal = await getUnreadTotal(viewerKey, scope);
    return NextResponse.json({ unreadTotal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load unread count";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}

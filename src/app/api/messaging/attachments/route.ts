import { NextRequest, NextResponse } from "next/server";

import { uploadMessagingAttachment } from "@/lib/internal-messaging-service";
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

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const formData = await request.formData();
    const file = formData.get("file");
    const room = formData.get("room");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const attachment = await uploadMessagingAttachment(
      file,
      typeof room === "string" && room ? room : INTERNAL_MESSAGING_ROOM,
      scope,
    );

    return NextResponse.json({ attachment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload attachment";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}

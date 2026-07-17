import { NextRequest, NextResponse } from "next/server";

import { prepareFileUpload } from "@/lib/internal-files-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const body = (await request.json()) as {
      name?: string;
      size?: number;
      folderId?: string | null;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    if (!body.size || body.size <= 0) {
      return NextResponse.json({ error: "File size is required" }, { status: 400 });
    }

    const upload = await prepareFileUpload(
      {
        name: body.name,
        size: body.size,
        folderId: typeof body.folderId === "string" && body.folderId ? body.folderId : null,
      },
      { workspaceId: workspace.id },
    );

    return NextResponse.json(upload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prepare upload";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

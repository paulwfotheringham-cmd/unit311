import { NextRequest, NextResponse } from "next/server";

import { completeFileUpload } from "@/lib/internal-files-service";
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
      storagePath?: string;
      folderId?: string | null;
      categoryId?: string | null;
      mimeType?: string | null;
      size?: number;
    };

    if (!body.name?.trim() || !body.storagePath?.trim() || !body.size) {
      return NextResponse.json({ error: "Upload metadata is incomplete" }, { status: 400 });
    }

    const file = await completeFileUpload(
      {
        name: body.name,
        storagePath: body.storagePath,
        folderId: typeof body.folderId === "string" && body.folderId ? body.folderId : null,
        categoryId: typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null,
        mimeType: typeof body.mimeType === "string" && body.mimeType ? body.mimeType : null,
        size: body.size,
      },
      { workspaceId: workspace.id },
    );

    return NextResponse.json({ file });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete upload";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

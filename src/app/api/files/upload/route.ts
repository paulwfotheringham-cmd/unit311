import { NextRequest, NextResponse } from "next/server";

import { uploadFile } from "@/lib/internal-files-service";
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
    const formData = await request.formData();
    const file = formData.get("file");
    const folderId = formData.get("folderId");
    const categoryId = formData.get("categoryId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const saved = await uploadFile(
      {
        file,
        folderId: typeof folderId === "string" && folderId ? folderId : null,
        categoryId: typeof categoryId === "string" && categoryId ? categoryId : null,
      },
      { workspaceId: workspace.id },
    );

    return NextResponse.json({ file: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload file";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";

import {
  assertFolderInClientSubtree,
  resolveClientFilesRoot,
} from "@/lib/client-files-root";
import { filesApiErrorStatus, requireInternalFilesAccess } from "@/lib/files-api-auth";
import { uploadFile } from "@/lib/internal-files-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireInternalFilesAccess();
  if ("error" in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderId = formData.get("folderId");
    const categoryId = formData.get("categoryId");
    const clientIdRaw = formData.get("clientId");
    const clientId = typeof clientIdRaw === "string" ? clientIdRaw.trim() : "";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    let resolvedFolderId: string | null =
      typeof folderId === "string" && folderId ? folderId : null;

    if (clientId) {
      const root = await resolveClientFilesRoot(clientId, auth.workspace.id);
      resolvedFolderId = await assertFolderInClientSubtree(
        resolvedFolderId,
        root.rootFolderId,
        auth.workspace.id,
        { allowNull: true },
      );
    }

    const saved = await uploadFile(
      {
        file,
        folderId: resolvedFolderId,
        categoryId: typeof categoryId === "string" && categoryId ? categoryId : null,
      },
      { workspaceId: auth.workspace.id },
    );

    return NextResponse.json({ file: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

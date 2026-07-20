import { NextRequest, NextResponse } from "next/server";

import {
  assertFolderInClientSubtree,
  resolveClientFilesRoot,
} from "@/lib/client-files-root";
import { filesApiErrorStatus, requireInternalFilesAccess } from "@/lib/files-api-auth";
import { completeFileUpload } from "@/lib/internal-files-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireInternalFilesAccess();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as {
      name?: string;
      storagePath?: string;
      folderId?: string | null;
      categoryId?: string | null;
      mimeType?: string | null;
      size?: number;
      clientId?: string | null;
    };

    if (!body.name?.trim() || !body.storagePath?.trim() || !body.size) {
      return NextResponse.json({ error: "Upload metadata is incomplete" }, { status: 400 });
    }

    let folderId: string | null =
      typeof body.folderId === "string" && body.folderId ? body.folderId : null;

    if (body.clientId?.trim()) {
      const root = await resolveClientFilesRoot(body.clientId.trim(), auth.workspace.id);
      folderId = await assertFolderInClientSubtree(folderId, root.rootFolderId, auth.workspace.id, {
        allowNull: true,
      });
    }

    const file = await completeFileUpload(
      {
        name: body.name,
        storagePath: body.storagePath,
        folderId,
        categoryId: typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null,
        mimeType: typeof body.mimeType === "string" && body.mimeType ? body.mimeType : null,
        size: body.size,
      },
      { workspaceId: auth.workspace.id },
    );

    return NextResponse.json({ file });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete upload";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

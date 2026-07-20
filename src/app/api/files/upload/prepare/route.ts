import { NextRequest, NextResponse } from "next/server";

import {
  assertFolderInClientSubtree,
  resolveClientFilesRoot,
} from "@/lib/client-files-root";
import { filesApiErrorStatus, requireInternalFilesAccess } from "@/lib/files-api-auth";
import { prepareFileUpload } from "@/lib/internal-files-service";
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
      size?: number;
      folderId?: string | null;
      clientId?: string | null;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    if (!body.size || body.size <= 0) {
      return NextResponse.json({ error: "File size is required" }, { status: 400 });
    }

    let folderId: string | null =
      typeof body.folderId === "string" && body.folderId ? body.folderId : null;

    if (body.clientId?.trim()) {
      const root = await resolveClientFilesRoot(body.clientId.trim(), auth.workspace.id);
      folderId = await assertFolderInClientSubtree(folderId, root.rootFolderId, auth.workspace.id, {
        allowNull: true,
      });
    }

    const upload = await prepareFileUpload(
      {
        name: body.name,
        size: body.size,
        folderId,
      },
      { workspaceId: auth.workspace.id },
    );

    return NextResponse.json(upload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prepare upload";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

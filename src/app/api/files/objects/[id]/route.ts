import { NextRequest, NextResponse } from "next/server";

import {
  assertFileInClientSubtree,
  assertFolderInClientSubtree,
  resolveClientFilesRoot,
} from "@/lib/client-files-root";
import { filesApiErrorStatus, requireInternalFilesAccess } from "@/lib/files-api-auth";
import { deleteFile, getFileDownloadUrl, updateFile } from "@/lib/internal-files-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireInternalFilesAccess();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    const clientId = request.nextUrl.searchParams.get("clientId")?.trim() || null;
    if (clientId) {
      const root = await resolveClientFilesRoot(clientId, auth.workspace.id);
      await assertFileInClientSubtree(id, root.rootFolderId, auth.workspace.id);
    }

    const download = await getFileDownloadUrl(id, { workspaceId: auth.workspace.id });
    return NextResponse.json(download);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get download URL";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireInternalFilesAccess();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      folderId?: string | null;
      categoryId?: string | null;
      clientId?: string | null;
    };

    if (body.clientId?.trim()) {
      const root = await resolveClientFilesRoot(body.clientId.trim(), auth.workspace.id);
      await assertFileInClientSubtree(id, root.rootFolderId, auth.workspace.id);
      if (body.folderId !== undefined) {
        body.folderId = await assertFolderInClientSubtree(
          body.folderId,
          root.rootFolderId,
          auth.workspace.id,
          { allowNull: true },
        );
      }
    }

    const file = await updateFile(
      id,
      {
        name: body.name,
        folderId: body.folderId,
        categoryId: body.categoryId,
      },
      { workspaceId: auth.workspace.id },
    );

    return NextResponse.json({ file });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update file";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireInternalFilesAccess();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    const clientId = request.nextUrl.searchParams.get("clientId")?.trim() || null;
    if (clientId) {
      const root = await resolveClientFilesRoot(clientId, auth.workspace.id);
      await assertFileInClientSubtree(id, root.rootFolderId, auth.workspace.id);
    }

    await deleteFile(id, { workspaceId: auth.workspace.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete file";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

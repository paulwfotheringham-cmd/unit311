import { NextRequest, NextResponse } from "next/server";

import {
  assertFolderInClientSubtree,
  resolveClientFilesRoot,
} from "@/lib/client-files-root";
import { filesApiErrorStatus, requireInternalFilesAccess } from "@/lib/files-api-auth";
import { deleteFolder, updateFolder } from "@/lib/internal-files-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

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
      parentId?: string | null;
      categoryId?: string | null;
      clientId?: string | null;
    };

    if (body.clientId?.trim()) {
      const root = await resolveClientFilesRoot(body.clientId.trim(), auth.workspace.id);
      if (id === root.rootFolderId && body.parentId !== undefined) {
        return NextResponse.json(
          { error: "Client root folder cannot be moved." },
          { status: 403 },
        );
      }
      await assertFolderInClientSubtree(id, root.rootFolderId, auth.workspace.id);
      if (body.parentId !== undefined) {
        body.parentId = await assertFolderInClientSubtree(
          body.parentId,
          root.rootFolderId,
          auth.workspace.id,
          { allowNull: true },
        );
      }
    }

    const folder = await updateFolder(
      id,
      {
        name: body.name,
        parentId: body.parentId,
        categoryId: body.categoryId,
      },
      { workspaceId: auth.workspace.id },
    );

    return NextResponse.json({ folder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update folder";
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
      if (id === root.rootFolderId) {
        return NextResponse.json(
          { error: "Client root folder cannot be deleted from Client Files." },
          { status: 403 },
        );
      }
      await assertFolderInClientSubtree(id, root.rootFolderId, auth.workspace.id);
    }

    await deleteFolder(id, { workspaceId: auth.workspace.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete folder";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

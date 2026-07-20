import { NextRequest, NextResponse } from "next/server";

import {
  assertFolderInClientSubtree,
  isFolderUnderClientRoot,
  resolveClientFilesRoot,
} from "@/lib/client-files-root";
import { filesApiErrorStatus, requireInternalFilesAccess } from "@/lib/files-api-auth";
import { createFolder, listAllFolders } from "@/lib/internal-files-service";
import { createExternalFolder, getOrCreateExternalFilesRoot } from "@/lib/external-files-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireInternalFilesAccess();
  if ("error" in auth) return auth.error;

  try {
    const clientId = request.nextUrl.searchParams.get("clientId")?.trim() || null;
    const folders = await listAllFolders({ workspaceId: auth.workspace.id });

    if (!clientId) {
      return NextResponse.json({ folders });
    }

    const root = await resolveClientFilesRoot(clientId, auth.workspace.id);
    const byParent = new Map<string | null, typeof folders>();
    for (const folder of folders) {
      const key = folder.parentId;
      const list = byParent.get(key) ?? [];
      list.push(folder);
      byParent.set(key, list);
    }

    const allowed = new Set<string>();
    const queue = [root.rootFolderId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (allowed.has(id)) continue;
      allowed.add(id);
      for (const child of byParent.get(id) ?? []) {
        queue.push(child.id);
      }
    }

    return NextResponse.json({
      folders: folders.filter((folder) => allowed.has(folder.id)),
      rootFolderId: root.rootFolderId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list folders";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireInternalFilesAccess();
  if ("error" in auth) return auth.error;

  try {
    const scope = { workspaceId: auth.workspace.id };
    const body = (await request.json()) as {
      name?: string;
      parentId?: string | null;
      categoryId?: string | null;
      externalScope?: boolean;
      clientId?: string | null;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    if (body.externalScope) {
      let parentId = body.parentId ?? null;
      if (!parentId) {
        const root = await getOrCreateExternalFilesRoot(scope);
        parentId = root.id;
      }
      const folder = await createExternalFolder(body.name, parentId, scope);
      return NextResponse.json({ folder });
    }

    let parentId = body.parentId ?? null;

    if (body.clientId?.trim()) {
      const root = await resolveClientFilesRoot(body.clientId.trim(), auth.workspace.id);
      parentId = await assertFolderInClientSubtree(parentId, root.rootFolderId, auth.workspace.id, {
        allowNull: true,
      });
    }

    const folder = await createFolder(body.name, parentId, body.categoryId ?? null, scope);
    return NextResponse.json({ folder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create folder";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

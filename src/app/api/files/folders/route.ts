import { NextRequest, NextResponse } from "next/server";

import { createFolder, listAllFolders } from "@/lib/internal-files-service";
import { createExternalFolder, getOrCreateExternalFilesRoot } from "@/lib/external-files-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const folders = await listAllFolders({ workspaceId: workspace.id });
    return NextResponse.json({ folders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list folders";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };
    const body = (await request.json()) as {
      name?: string;
      parentId?: string | null;
      categoryId?: string | null;
      externalScope?: boolean;
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

    const folder = await createFolder(
      body.name,
      body.parentId ?? null,
      body.categoryId ?? null,
      scope,
    );
    return NextResponse.json({ folder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create folder";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

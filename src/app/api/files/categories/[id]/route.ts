import { NextRequest, NextResponse } from "next/server";

import { filesApiErrorStatus, requireInternalFilesAccess } from "@/lib/files-api-auth";
import { deleteCategory, updateCategory } from "@/lib/internal-files-service";
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
    const body = (await request.json()) as { name?: string; color?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const category = await updateCategory(id, body.name, body.color ?? "#60a5fa", {
      workspaceId: auth.workspace.id,
    });
    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update category";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireInternalFilesAccess();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    await deleteCategory(id, { workspaceId: auth.workspace.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete category";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

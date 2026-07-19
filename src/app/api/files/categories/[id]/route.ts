import { NextRequest, NextResponse } from "next/server";

import { deleteCategory, updateCategory } from "@/lib/internal-files-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as { name?: string; color?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const category = await updateCategory(id, body.name, body.color ?? "#60a5fa", {
      workspaceId: workspace.id,
    });
    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update category";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    await deleteCategory(id, { workspaceId: workspace.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete category";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

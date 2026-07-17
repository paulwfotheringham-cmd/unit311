import { NextRequest, NextResponse } from "next/server";

import { createCategory, listCategories } from "@/lib/internal-files-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY." },
      { status: 503 },
    );
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const categories = await listCategories({ workspaceId: workspace.id });
    return NextResponse.json({ categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load categories";
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
    const body = (await request.json()) as { name?: string; color?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const category = await createCategory(body.name!, body.color ?? "#60a5fa", {
      workspaceId: workspace.id,
    });

    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create category";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

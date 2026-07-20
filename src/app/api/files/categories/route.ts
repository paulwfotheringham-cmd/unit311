import { NextRequest, NextResponse } from "next/server";

import { filesApiErrorStatus, requireInternalFilesAccess } from "@/lib/files-api-auth";
import { createCategory, listCategories } from "@/lib/internal-files-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY." },
      { status: 503 },
    );
  }

  const auth = await requireInternalFilesAccess();
  if ("error" in auth) return auth.error;

  try {
    const categories = await listCategories({ workspaceId: auth.workspace.id });
    return NextResponse.json({ categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load categories";
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
    const body = (await request.json()) as { name?: string; color?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const category = await createCategory(body.name, body.color ?? "#60a5fa", {
      workspaceId: auth.workspace.id,
    });

    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create category";
    return NextResponse.json(
      { error: message },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}

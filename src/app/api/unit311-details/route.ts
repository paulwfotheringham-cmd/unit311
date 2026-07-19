import { NextRequest, NextResponse } from "next/server";

import { ensureCoreArchitectureSeeds } from "@/lib/architecture-diagram-service";
import { requireInternalWorkspaceSession } from "@/lib/internal-admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getUnit311DetailsOverview,
  loadUnit311DetailContent,
  parseUnit311DetailCategoryId,
  saveUnit311DetailContent,
  saveUnit311DetailTasks,
} from "@/lib/unit311-details-service";
import type { Unit311DetailTask } from "@/lib/unit311-details-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireInternalWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const scope = { workspaceId: auth.workspace.id };

  try {
    // Ensure architecture table + core diagram seeds when Details opens.
    await ensureCoreArchitectureSeeds().catch(() => null);

    const categoryId = parseUnit311DetailCategoryId(request.nextUrl.searchParams.get("category"));

    if (categoryId) {
      const detail = await loadUnit311DetailContent(categoryId, scope);
      return NextResponse.json(detail);
    }

    const overview = await getUnit311DetailsOverview(scope);
    return NextResponse.json(overview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Unit311 details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireInternalWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const scope = { workspaceId: auth.workspace.id };

  try {
    const body = (await request.json()) as {
      category?: string;
      content?: string;
      tasks?: Unit311DetailTask[];
    };
    const categoryId = body.category?.trim() ?? null;

    if (!categoryId) {
      return NextResponse.json({ error: "Valid category is required." }, { status: 400 });
    }

    if (Array.isArray(body.tasks)) {
      const saved = await saveUnit311DetailTasks(categoryId, body.tasks, scope);
      return NextResponse.json(saved);
    }

    if (typeof body.content !== "string") {
      return NextResponse.json({ error: "Content is required." }, { status: 400 });
    }

    const saved = await saveUnit311DetailContent(categoryId, body.content, scope);
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save Unit311 details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { ensureCoreArchitectureSeeds } from "@/lib/architecture-diagram-service";
import { ensureSystemArchitectureDiagramsTable } from "@/lib/internal-db-migrations";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * One-shot bootstrap for architecture diagrams table + Platform/Storage seeds.
 * Secured with INTERNAL_FILES_SETUP_SECRET (same as other internal setup routes).
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const secret = process.env.INTERNAL_FILES_SETUP_SECRET;
  const header = request.headers.get("authorization");
  const provided =
    (header?.startsWith("Bearer ") ? header.slice(7) : null) ||
    request.headers.get("x-setup-secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const tableReady = await ensureSystemArchitectureDiagramsTable();
    const seeds = await ensureCoreArchitectureSeeds();
    return NextResponse.json({
      ok: true,
      tableReady,
      storage: {
        id: seeds.storage.id,
        sectionSlug: seeds.storage.sectionSlug,
        title: seeds.storage.title,
        nodeCount: seeds.storage.diagramJson.nodes.length,
      },
      platformOverview: {
        id: seeds.platformOverview.id,
        sectionSlug: seeds.platformOverview.sectionSlug,
        title: seeds.platformOverview.title,
        nodeCount: seeds.platformOverview.diagramJson.nodes.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to bootstrap architecture diagrams.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

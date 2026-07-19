/**
 * Public health probe for architecture diagrams bootstrap.
 * Returns whether the table/seeds exist; does not return diagram contents.
 */
import { NextResponse } from "next/server";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensureSystemArchitectureDiagramsTable } from "@/lib/internal-db-migrations";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "supabase-not-configured" }, { status: 503 });
  }

  try {
    const tableReady = await ensureSystemArchitectureDiagramsTable().catch(() => false);
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("system_architecture_diagrams")
      .select("section_slug, title")
      .in("section_slug", ["storage", "platform-overview"]);

    if (error) {
      return NextResponse.json({
        ok: false,
        tableReady,
        error: error.message,
      });
    }

    const slugs = (data ?? []).map((row) => String(row.section_slug));
    return NextResponse.json({
      ok: true,
      tableReady,
      hasStorage: slugs.includes("storage"),
      hasPlatformOverview: slugs.includes("platform-overview"),
      seededCount: slugs.length,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "probe failed",
    });
  }
}

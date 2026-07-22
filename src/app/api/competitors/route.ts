import { NextRequest, NextResponse } from "next/server";

import { type CompetitorRegion } from "@/lib/competitors-data";
import { createCompetitor, listCompetitors } from "@/lib/competitors-service";
import { ensureCompetitorsSeedData, ensureCompetitorsTable, withCompetitorsTable } from "@/lib/internal-db-migrations";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await ensureCompetitorsTable();
    try {
      await ensureCompetitorsSeedData();
    } catch (seedError) {
      console.error(
        "[competitors] seed failed (continuing to list):",
        seedError instanceof Error ? seedError.message : seedError,
      );
    }
    const region = request.nextUrl.searchParams.get("region") as CompetitorRegion | "all" | null;
    const competitors = await withCompetitorsTable(() => listCompetitors(region ?? "all"));
    return NextResponse.json({ competitors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load competitors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      region?: CompetitorRegion;
      companyName?: string;
      website?: string;
      services?: string;
      lastRevenue?: string;
    };

    if (!body.region || !/^[a-z][a-z0-9]{1,23}$/.test(body.region)) {
      return NextResponse.json({ error: "A valid region is required." }, { status: 400 });
    }

    const competitor = await withCompetitorsTable(() =>
      createCompetitor(body as { region: CompetitorRegion }),
    );
    return NextResponse.json({ competitor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create competitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

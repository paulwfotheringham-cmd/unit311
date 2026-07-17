import { NextRequest, NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createUnit311DetailSection } from "@/lib/unit311-details-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Section name is required." }, { status: 400 });
    }

    const created = await createUnit311DetailSection(name);
    return NextResponse.json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create section";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

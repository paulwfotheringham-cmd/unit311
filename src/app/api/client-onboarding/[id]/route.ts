import { NextRequest, NextResponse } from "next/server";

import { deleteClientOnboardingRecord } from "@/lib/client-onboarding-service";
import { ensureClientOnboardingRecordsTable } from "@/lib/internal-db-migrations";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    await ensureClientOnboardingRecordsTable().catch(() => false);
    await deleteClientOnboardingRecord(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete onboarding record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

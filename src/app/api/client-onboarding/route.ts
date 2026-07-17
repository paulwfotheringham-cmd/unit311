import { NextRequest, NextResponse } from "next/server";

import { listClientOnboardingRecords } from "@/lib/client-onboarding-service";
import { ensureClientOnboardingRecordsTable } from "@/lib/internal-db-migrations";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await ensureClientOnboardingRecordsTable().catch(() => false);

    const statusParam = request.nextUrl.searchParams.get("status");
    const status =
      statusParam === "in_progress" || statusParam === "platform_live" ? statusParam : "all";

    const records = await listClientOnboardingRecords({ status });
    return NextResponse.json({ records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load onboarding records";
    return NextResponse.json({ error: message, records: [] }, { status: 500 });
  }
}

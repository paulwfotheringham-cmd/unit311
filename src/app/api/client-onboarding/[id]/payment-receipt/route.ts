import { NextResponse } from "next/server";

import { getClientOnboardingPaymentReceipt } from "@/lib/client-onboarding-service";
import { ensureClientOnboardingRecordsTable } from "@/lib/internal-db-migrations";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await ensureClientOnboardingRecordsTable().catch(() => false);

    const { id } = await context.params;
    const receipt = await getClientOnboardingPaymentReceipt(id);

    if (!receipt) {
      return NextResponse.json({ error: "Payment receipt not found." }, { status: 404 });
    }

    return NextResponse.json({ receipt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payment receipt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

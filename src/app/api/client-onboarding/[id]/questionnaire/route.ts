import { NextResponse } from "next/server";

import { getClientOnboardingQuestionnaireSummary } from "@/lib/client-onboarding-service";
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
    const summary = await getClientOnboardingQuestionnaireSummary(id);

    if (!summary) {
      return NextResponse.json({ error: "Questionnaire details not found." }, { status: 404 });
    }

    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load questionnaire details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

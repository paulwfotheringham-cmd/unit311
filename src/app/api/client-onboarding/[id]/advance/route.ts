import { NextRequest, NextResponse } from "next/server";

import { advanceClientOnboardingStage } from "@/lib/client-onboarding-service";
import type { ClientOnboardingAdvanceAction } from "@/lib/client-onboarding-data";
import { ensureClientOnboardingRecordsTable } from "@/lib/internal-db-migrations";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const ADVANCE_ACTIONS = new Set<ClientOnboardingAdvanceAction>([
  "payment_received",
  "questionnaire_complete",
  "platform_clone_complete",
  "review_complete",
  "platform_live",
]);

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await ensureClientOnboardingRecordsTable().catch(() => false);

    const { id } = await context.params;
    const body = (await request.json()) as { action?: string; actorLabel?: string };
    const action = body.action as ClientOnboardingAdvanceAction | undefined;

    if (!action || !ADVANCE_ACTIONS.has(action)) {
      return NextResponse.json({ error: "Valid action is required." }, { status: 400 });
    }

    const record = await advanceClientOnboardingStage({
      id,
      action,
      actorLabel: body.actorLabel?.trim() || "Internal team",
    });

    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to advance onboarding stage";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

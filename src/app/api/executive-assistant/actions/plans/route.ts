import { NextRequest, NextResponse } from "next/server";

import {
  buildActionPlan,
  toConfirmationView,
  type ProposedActionStepInput,
} from "@/lib/ai-operating-assistant/actions";
import { buildBusinessContext } from "@/lib/ai-operating-assistant/context-service";
import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/executive-assistant/actions/plans
 * Create a multi-step action plan (validate + preview). Does not execute.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getPlatformSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      steps?: ProposedActionStepInput[];
      request?: string;
      title?: string;
      conversationId?: string | null;
      activeView?: string | null;
      roleView?: string | null;
      selection?: import("@/lib/ai-operating-assistant/types").AssistantPageSelection;
    };

    if (!Array.isArray(body.steps) || body.steps.length === 0) {
      return NextResponse.json({ error: "steps[] is required." }, { status: 400 });
    }

    const context = await buildBusinessContext({
      session,
      activeView: body.activeView,
      roleView: body.roleView,
      selection: body.selection,
    });

    const { plan, blocked, blockReason } = await buildActionPlan({
      business: context,
      steps: body.steps,
      aiRequest: body.request ?? null,
      conversationId: body.conversationId ?? null,
      title: body.title ?? null,
    });

    return NextResponse.json({
      plan,
      confirmation: toConfirmationView(plan),
      blocked,
      blockReason: blockReason ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build action plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

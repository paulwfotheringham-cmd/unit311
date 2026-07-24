import { NextRequest, NextResponse } from "next/server";

import {
  planBusinessGoal,
  toPlanSummary,
  toPlanViewerModel,
} from "@/lib/ai-operating-assistant/actions/planning";
import { buildBusinessContext } from "@/lib/ai-operating-assistant/context-service";
import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/executive-assistant/planning/goals
 * Plan a natural-language goal against registered actions (does not execute).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getPlatformSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      goal?: string;
      request?: string;
      title?: string;
      conversationId?: string | null;
      activeView?: string | null;
      roleView?: string | null;
      selection?: import("@/lib/ai-operating-assistant/types").AssistantPageSelection;
    };

    const goal = (body.goal || body.request || "").trim();
    if (!goal) {
      return NextResponse.json({ error: "goal is required." }, { status: 400 });
    }

    const context = await buildBusinessContext({
      session,
      activeView: body.activeView,
      roleView: body.roleView,
      selection: body.selection,
    });

    const { plan, blocked, blockReason } = await planBusinessGoal({
      business: context,
      goal,
      title: body.title ?? null,
      conversationId: body.conversationId ?? null,
    });

    return NextResponse.json({
      plan,
      summary: toPlanSummary(plan),
      viewer: toPlanViewerModel(plan),
      blocked,
      blockReason: blockReason ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to plan goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

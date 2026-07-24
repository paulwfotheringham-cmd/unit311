import { NextRequest, NextResponse } from "next/server";

import {
  executeGoalPlan,
  getGoalPlan,
  toExecutionSummary,
  toPlanSummary,
  toPlanViewerModel,
} from "@/lib/ai-operating-assistant/actions/planning";
import { buildBusinessContext } from "@/lib/ai-operating-assistant/context-service";
import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/executive-assistant/planning/goals/[id]
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getPlatformSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { id } = await context.params;
    const plan = await getGoalPlan(id, session.sub);
    if (!plan) {
      return NextResponse.json({ error: "Goal plan not found." }, { status: 404 });
    }

    return NextResponse.json({
      plan,
      summary: toPlanSummary(plan),
      viewer: toPlanViewerModel(plan),
      execution: toExecutionSummary(plan),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load goal plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/executive-assistant/planning/goals/[id]
 * Body: { confirmed: boolean } — execute graph or cancel.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getPlatformSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      confirmed?: boolean;
      rollbackOnFailure?: boolean;
      activeView?: string | null;
      roleView?: string | null;
      selection?: import("@/lib/ai-operating-assistant/types").AssistantPageSelection;
    };

    if (typeof body.confirmed !== "boolean") {
      return NextResponse.json({ error: "confirmed boolean is required." }, { status: 400 });
    }

    const business = await buildBusinessContext({
      session,
      activeView: body.activeView,
      roleView: body.roleView,
      selection: body.selection,
    });

    const { plan, summary } = await executeGoalPlan({
      goalId: id,
      business,
      confirmed: body.confirmed,
      rollbackOnFailure: body.rollbackOnFailure,
    });

    return NextResponse.json({
      plan,
      summary,
      viewer: toPlanViewerModel(plan),
      execution: toExecutionSummary(plan),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to execute goal plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

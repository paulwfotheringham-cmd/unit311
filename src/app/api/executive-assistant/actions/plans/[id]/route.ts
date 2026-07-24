import { NextRequest, NextResponse } from "next/server";

import {
  executeActionPlan,
  getActionPlan,
  putActionPlan,
  toConfirmationView,
  type AssistantActionPlan,
  type AssistantActionPlanStep,
} from "@/lib/ai-operating-assistant/actions";
import { ensureActionModulesRegistered } from "@/lib/ai-operating-assistant/action-orchestration";
import { buildBusinessContext } from "@/lib/ai-operating-assistant/context-service";
import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ClientStepSnapshot = {
  stepId?: string;
  actionId?: string;
  name?: string;
  module?: string;
  input?: Record<string, unknown>;
  status?: string;
};

function log(...args: unknown[]) {
  console.info("[api/actions/plans]", ...args);
}

function rehydrateFromSnapshot(input: {
  planId: string;
  userId: string;
  business: Awaited<ReturnType<typeof buildBusinessContext>>;
  title?: string | null;
  summary?: string | null;
  aiRequest?: string | null;
  steps: ClientStepSnapshot[];
}): AssistantActionPlan {
  const now = new Date().toISOString();
  const steps: AssistantActionPlanStep[] = input.steps
    .filter((step) => typeof step.actionId === "string" && step.actionId.trim())
    .map((step, index) => ({
      id: step.stepId?.trim() || `step_rehydrate_${index}`,
      actionId: step.actionId!.trim(),
      name: step.name?.trim() || step.actionId!.trim(),
      module: (step.module as AssistantActionPlanStep["module"]) || "system",
      input: step.input && typeof step.input === "object" ? step.input : {},
      status: "previewed",
      error: null,
    }));

  return {
    id: input.planId,
    userId: input.userId,
    workspaceId: input.business.workspace.id,
    organisationId: input.business.organisation.id,
    conversationId: null,
    status: "proposed",
    title: input.title?.trim() || "Action plan",
    summary: input.summary?.trim() || steps.map((s) => s.name).join(" → "),
    aiRequest: input.aiRequest ?? null,
    steps,
    warnings: [
      "Plan rehydrated from client snapshot after durable store miss (serverless).",
    ],
    permissionNotes: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * GET /api/executive-assistant/actions/plans/[id]
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getPlatformSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { id } = await context.params;
    ensureActionModulesRegistered();
    log("GET", id, "user=", session.sub);
    const plan = await getActionPlan(id, session.sub);
    if (!plan) {
      log("GET miss", id);
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    return NextResponse.json({
      plan,
      confirmation: toConfirmationView(plan),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load plan";
    console.error("[api/actions/plans] GET error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/executive-assistant/actions/plans/[id]
 * Body: { confirmed: true | false, activeView?, roleView?, selection?, steps? }
 * confirmed=true executes; confirmed=false cancels.
 * `steps` is an approve-time rehydration fallback when durable store missed.
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
      activeView?: string | null;
      roleView?: string | null;
      selection?: import("@/lib/ai-operating-assistant/types").AssistantPageSelection;
      title?: string | null;
      summary?: string | null;
      aiRequest?: string | null;
      steps?: ClientStepSnapshot[];
    };

    log("POST", id, "confirmed=", body.confirmed, "steps=", body.steps?.length ?? 0);

    if (typeof body.confirmed !== "boolean") {
      return NextResponse.json({ error: "confirmed boolean is required." }, { status: 400 });
    }

    ensureActionModulesRegistered();

    const business = await buildBusinessContext({
      session,
      activeView: body.activeView,
      roleView: body.roleView,
      selection: body.selection,
    });

    log(
      "context",
      "user=",
      business.user.id,
      "workspace=",
      business.workspace.id,
    );

    let existing = await getActionPlan(id, session.sub);
    if (!existing && Array.isArray(body.steps) && body.steps.length > 0) {
      log("rehydrate from client snapshot", id);
      existing = await putActionPlan(
        rehydrateFromSnapshot({
          planId: id,
          userId: session.sub,
          business,
          title: body.title,
          summary: body.summary,
          aiRequest: body.aiRequest,
          steps: body.steps,
        }),
      );
    }

    if (!existing) {
      log("execute abort — plan not found and no snapshot", id);
      return NextResponse.json(
        {
          error:
            "Action plan not found. It may have expired across servers — please ask the assistant to propose the action again.",
        },
        { status: 404 },
      );
    }

    log("executeActionPlan start", id, "status=", existing.status);
    const { plan, summary } = await executeActionPlan({
      planId: id,
      business,
      confirmed: body.confirmed,
    });
    log(
      "executeActionPlan done",
      id,
      "status=",
      plan.status,
      "steps=",
      plan.steps.map((s) => `${s.actionId}:${s.status}`).join(","),
    );

    return NextResponse.json({
      plan,
      summary,
      confirmation: toConfirmationView(plan),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to execute plan";
    console.error("[api/actions/plans] POST error", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

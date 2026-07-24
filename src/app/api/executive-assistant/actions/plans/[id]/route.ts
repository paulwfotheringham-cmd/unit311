import { NextRequest, NextResponse } from "next/server";

import {
  executeActionPlan,
  getAssistantAction,
  loadActionPlan,
  putActionPlan,
  toConfirmationView,
  type AssistantActionPlan,
  type AssistantActionPlanStep,
} from "@/lib/ai-operating-assistant/actions";
import { formatActionSuccess } from "@/lib/ai-operating-assistant/action-ui-messages";
import { ensureActionModulesRegistered } from "@/lib/ai-operating-assistant/action-orchestration";
import { buildBusinessContext } from "@/lib/ai-operating-assistant/context-service";
import {
  bindPlanCorrelation,
  eaRethrow,
  eaStage,
  eaStop,
  getEaCorrelationId,
  resolveIncomingCorrelationId,
  runWithEaTraceAsync,
  setEaPlanId,
} from "@/lib/ai-operating-assistant/ea-forensic-trace";
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
    const { plan, source } = await loadActionPlan(id, session.sub);
    if (!plan) {
      eaStop("Plan loaded", "Plan not found on GET", { planId: id, source });
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    eaStage("Plan loaded", {
      planId: id,
      source,
      "full step input": plan.steps.map((s) => ({
        stepId: s.id,
        actionId: s.actionId,
        input: s.input,
      })),
    });

    return NextResponse.json({
      plan,
      confirmation: toConfirmationView(plan),
    });
  } catch (error) {
    try {
      eaRethrow("Plan loaded GET", error);
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(String(thrown));
      return NextResponse.json(
        { error: err.message, stack: err.stack ?? null },
        { status: 500 },
      );
    }
  }
}

/**
 * POST /api/executive-assistant/actions/plans/[id]
 * Body: { confirmed: true | false, activeView?, roleView?, selection?, steps?, correlationId? }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: {
    confirmed?: boolean;
    activeView?: string | null;
    roleView?: string | null;
    selection?: import("@/lib/ai-operating-assistant/types").AssistantPageSelection;
    title?: string | null;
    summary?: string | null;
    aiRequest?: string | null;
    steps?: ClientStepSnapshot[];
    correlationId?: string | null;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[EA] EXCEPTION — Browser Approve received (JSON parse)");
    console.error(err.stack ?? err.message);
    return NextResponse.json({ error: err.message, stack: err.stack ?? null }, { status: 400 });
  }

  const correlationId = resolveIncomingCorrelationId({
    header: request.headers.get("x-ea-correlation-id"),
    body: typeof body.correlationId === "string" ? body.correlationId : null,
    planId: id,
  });
  bindPlanCorrelation(id, correlationId);

  return runWithEaTraceAsync({ correlationId }, async () => {
    try {
      const session = await getPlatformSession();
      if (!session) {
        eaStop("Browser Approve received", "Authentication required.", { planId: id });
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }

      eaStage("Browser Approve received", {
        planId: id,
        "request body": body,
      });

      if (typeof body.confirmed !== "boolean") {
        eaStop("Browser Approve received", "confirmed boolean is required.", { planId: id });
        return NextResponse.json(
          { error: "confirmed boolean is required.", correlationId: getEaCorrelationId() },
          { status: 400 },
        );
      }

      ensureActionModulesRegistered();
      setEaPlanId(id);

      const business = await buildBusinessContext({
        session,
        activeView: body.activeView,
        roleView: body.roleView,
        selection: body.selection,
      });

      let source: "memory" | "database" | "rehydrated" | "miss" = "miss";
      const loaded = await loadActionPlan(id, session.sub);
      let existing = loaded.plan;
      source = loaded.source;

      if (!existing && Array.isArray(body.steps) && body.steps.length > 0) {
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
        source = "rehydrated";
      }

      if (!existing) {
        eaStop("Plan loaded", "plan not found and no client snapshot to rehydrate", {
          planId: id,
          source,
          hasSteps: Array.isArray(body.steps) ? body.steps.length : 0,
        });
        return NextResponse.json(
          {
            error: "Action plan not found.",
            correlationId: getEaCorrelationId(),
            source,
            stack: null,
          },
          { status: 404 },
        );
      }

      eaStage("Plan loaded", {
        planId: id,
        source,
        "full step input": existing.steps.map((s) => ({
          stepId: s.id,
          actionId: s.actionId,
          module: s.module,
          status: s.status,
          input: s.input,
        })),
      });

      const { plan, summary } = await executeActionPlan({
        planId: id,
        business,
        confirmed: body.confirmed,
      });

      const outcomeText = plan.steps
        .filter((step) => step.status === "succeeded" && step.result)
        .map((step) => {
          const definition = getAssistantAction(step.actionId);
          if (!definition || !step.result) return step.result?.message ?? null;
          return formatActionSuccess({
            definition,
            result: step.result,
            stepInput: step.input,
          });
        })
        .filter((text): text is string => Boolean(text))
        .join("\n\n");

      const followUpActions = plan.steps
        .filter((step) => step.status === "succeeded")
        .flatMap((step) => {
          const definition = getAssistantAction(step.actionId);
          return (definition?.capability.suggestedFollowUps ?? []).map((followUp, index) => ({
            id: `followup_${step.actionId}_${index}`,
            label: followUp.label,
            kind: "generate" as const,
            actionId: followUp.actionId,
          }));
        });

      const responseBody = {
        plan,
        summary,
        outcomeText: outcomeText || summary,
        followUpActions,
        confirmation: toConfirmationView(plan),
        correlationId: getEaCorrelationId(),
      };

      eaStage("Success response sent", {
        planId: plan.id,
        status: plan.status,
        summary,
        outcomeText: outcomeText || null,
        steps: plan.steps.map((s) => ({
          actionId: s.actionId,
          status: s.status,
          recordId: s.result?.recordId ?? null,
          error: s.error ?? null,
        })),
      });

      return NextResponse.json(responseBody);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[EA] EXCEPTION — POST plans/${id}`);
      console.error(`- correlationId: ${getEaCorrelationId()}`);
      console.error(`- message: ${err.message}`);
      console.error(`- stack: ${err.stack ?? "(no stack)"}`);
      if (err.stack) console.error(err.stack);
      return NextResponse.json(
        {
          error: err.message,
          stack: err.stack ?? null,
          correlationId: getEaCorrelationId(),
        },
        { status: 500 },
      );
    }
  });
}

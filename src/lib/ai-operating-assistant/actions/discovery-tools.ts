/**
 * OpenAI-discoverable tools that expose the Action Framework
 * without implementing any domain business modules yet.
 */

import { asString, toolOk, type AssistantToolExecutionContext } from "../tool-result";
import {
  buildActionPlan,
  toConfirmationView,
  type ProposedActionStepInput,
} from "./execution-pipeline";
import { listAssistantActionDescriptors } from "./registry";

export async function listBusinessActionsTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const { ensureActionModulesRegistered } = await import(
    "@/lib/ai-operating-assistant/action-orchestration"
  );
  ensureActionModulesRegistered();

  const moduleFilter = asString(args.module) as
    | import("./types").AssistantActionModule
    | undefined;
  const descriptors = listAssistantActionDescriptors({
    business: ctx.business,
    module: moduleFilter,
  });

  return toolOk("listBusinessActions", descriptors, {
    source: ["assistant:action-registry"],
    pageSize: descriptors.length || 1,
    summary: {
      count: descriptors.length,
      note:
        descriptors.length === 0
          ? "Action registry is ready. Domain modules have not registered handlers yet."
          : "Actions available for this user’s permissions. Prefer registered actionIds when calling proposeBusinessActionPlan.",
      modules: [...new Set(descriptors.map((d) => d.module))],
    },
    dataGaps:
      descriptors.length === 0
        ? ["No domain action handlers registered yet."]
        : undefined,
  });
}

export async function proposeBusinessActionPlanTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const { ensureActionModulesRegistered } = await import(
    "@/lib/ai-operating-assistant/action-orchestration"
  );
  ensureActionModulesRegistered();

  const aiRequest = asString(args.request) || asString(args.question) || null;
  const title = asString(args.title) || null;
  const conversationId = asString(args.conversationId) || null;
  const rawSteps = Array.isArray(args.steps) ? args.steps : [];

  const steps: ProposedActionStepInput[] = [];
  for (const entry of rawSteps) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const actionId = asString(row.actionId) || asString(row.id);
    if (!actionId) continue;
    steps.push({
      actionId,
      input:
        row.input && typeof row.input === "object"
          ? (row.input as Record<string, unknown>)
          : {},
      dependsOnStepIds: Array.isArray(row.dependsOnStepIds)
        ? row.dependsOnStepIds.filter((id): id is string => typeof id === "string")
        : undefined,
    });
  }

  const { plan, blocked, blockReason } = await buildActionPlan({
    business: ctx.business,
    steps,
    aiRequest,
    conversationId,
    title,
  });

  return toolOk(
    "proposeBusinessActionPlan",
    [
      {
        planId: plan.id,
        confirmation: toConfirmationView(plan),
        blocked,
        blockReason: blockReason ?? null,
      },
    ],
    {
      source: ["assistant:action-pipeline"],
      pageSize: 1,
      summary: {
        planId: plan.id,
        status: plan.status,
        stepCount: plan.steps.length,
        requiresConfirmation: plan.status === "proposed",
        blocked,
        message: blocked
          ? blockReason
          : "Ready — approve in the Plan Viewer to complete this.",
      },
      followUpActions:
        plan.status === "proposed"
          ? [
              {
                id: `confirm_plan_${plan.id}`,
                label: "Review & approve",
                kind: "confirm_action",
                actionId: plan.id,
                requiresConfirmation: true,
              },
            ]
          : undefined,
    },
  );
}

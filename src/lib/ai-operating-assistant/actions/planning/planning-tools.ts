/**
 * OpenAI-discoverable Planning Engine tools.
 * Additive — does not modify Phase 1 discovery-tools exports.
 */

import { asString, toolOk, type AssistantToolExecutionContext } from "../../tool-result";
import { executeGoalPlan } from "./graph-executor";
import { planBusinessGoal } from "./planner";
import { toExecutionSummary, toPlanSummary, toPlanViewerModel } from "./summaries";

export async function planBusinessGoalTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const { ensureActionModulesRegistered } = await import(
    "@/lib/ai-operating-assistant/action-orchestration"
  );
  ensureActionModulesRegistered();

  const goal =
    asString(args.goal) ||
    asString(args.request) ||
    asString(args.question) ||
    "";
  const title = asString(args.title) || null;
  const conversationId = asString(args.conversationId) || null;

  const { plan, blocked, blockReason } = await planBusinessGoal({
    business: ctx.business,
    goal,
    title,
    conversationId,
  });

  const summary = toPlanSummary(plan);
  const viewer = toPlanViewerModel(plan);

  return toolOk(
    "planBusinessGoal",
    [
      {
        goalId: plan.id,
        plan: summary,
        viewer,
        blocked,
        blockReason: blockReason ?? null,
      },
    ],
    {
      source: ["assistant:planning-engine"],
      pageSize: 1,
      summary: {
        goalId: plan.id,
        status: plan.status,
        stepCount: plan.steps.length,
        plannerSource: plan.plannerSource,
        requiresConfirmation: plan.status === "proposed",
        blocked,
        message: blocked
          ? blockReason
          : "Goal plan ready. Show Plan Viewer and wait for Approve before executeGoalPlan.",
      },
      followUpActions:
        plan.status === "proposed"
          ? [
              {
                id: `confirm_goal_${plan.id}`,
                label: "Review goal plan",
                kind: "confirm_action",
                actionId: plan.id,
                requiresConfirmation: true,
              },
            ]
          : undefined,
    },
  );
}

/** Optional direct execute tool — UI normally calls the HTTP API after Approve. */
export async function executeGoalPlanTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const goalId = asString(args.goalId) || asString(args.planId);
  if (!goalId) {
    return toolOk("executeGoalPlan", [], {
      source: ["assistant:planning-engine"],
      pageSize: 0,
      summary: { error: "goalId is required" },
      dataGaps: ["goalId is required"],
    });
  }
  const confirmed = args.confirmed !== false && args.confirmed !== "false";
  const { plan, summary } = await executeGoalPlan({
    goalId,
    business: ctx.business,
    confirmed,
  });

  return toolOk(
    "executeGoalPlan",
    [
      {
        goalId: plan.id,
        execution: toExecutionSummary(plan),
        viewer: toPlanViewerModel(plan),
        summary,
      },
    ],
    {
      source: ["assistant:planning-engine"],
      pageSize: 1,
      summary: {
        goalId: plan.id,
        status: plan.status,
        message: summary,
      },
    },
  );
}

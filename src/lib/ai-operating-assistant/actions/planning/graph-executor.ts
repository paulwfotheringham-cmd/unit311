/**
 * Graph executor — sequential waves, parallel groups, conditions, retries.
 * Invokes registered Action Framework handlers; does not modify Phase 1 APIs.
 */

import type { AssistantBusinessContext } from "../../types";
import { recordActionAudit } from "../audit-service";
import { getAssistantAction } from "../registry";
import { buildExecutionGraph, progressPct } from "./graph";
import { getGoalPlan, saveGoalPlan } from "./goal-store";
import type { PlanningCondition, PlanningGoal, PlanningStep } from "./types";

function isTransientError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    /timeout|temporar|unavailable|econnreset|etimedout|429|502|503|504|rate limit|try again/.test(
      message,
    )
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stepById(plan: PlanningGoal, id: string): PlanningStep | undefined {
  return plan.steps.find((step) => step.id === id);
}

function depsSatisfied(plan: PlanningGoal, step: PlanningStep): boolean {
  return step.dependsOnStepIds.every((depId) => {
    const dep = stepById(plan, depId);
    if (!dep) return false;
    return ["succeeded", "skipped"].includes(dep.status);
  });
}

function evaluateCondition(
  plan: PlanningGoal,
  step: PlanningStep,
  validationWarnings: string[],
): { skip: boolean; reason?: string } {
  const condition = step.condition;
  if (!condition) return { skip: false };

  switch (condition.kind) {
    case "skip_if_validation_warnings_match": {
      const re = new RegExp(condition.pattern, "i");
      const hit = validationWarnings.some((warning) => re.test(warning));
      return hit
        ? { skip: true, reason: `Skipped — validation warning matched /${condition.pattern}/i` }
        : { skip: false };
    }
    case "skip_if_prior_succeeded": {
      const prior = stepById(plan, condition.stepId);
      if (prior?.status === "succeeded") {
        return { skip: true, reason: `Skipped — prior step ${prior.name} already succeeded` };
      }
      return { skip: false };
    }
    case "run_only_if_prior_succeeded": {
      const prior = stepById(plan, condition.stepId);
      if (prior?.status !== "succeeded") {
        return {
          skip: true,
          reason: `Skipped — required prior step did not succeed`,
        };
      }
      return { skip: false };
    }
    case "skip_if_prior_failed": {
      const prior = stepById(plan, condition.stepId);
      if (prior?.status === "failed") {
        return { skip: true, reason: `Skipped — prior step failed` };
      }
      return { skip: false };
    }
    case "run_only_if_prior_skipped": {
      const prior = stepById(plan, condition.stepId);
      if (prior?.status !== "skipped") {
        return { skip: true, reason: `Skipped — prior step was not skipped` };
      }
      return { skip: false };
    }
    default:
      return { skip: false };
  }
}

function replaceStep(plan: PlanningGoal, next: PlanningStep): PlanningGoal {
  return {
    ...plan,
    steps: plan.steps.map((step) => (step.id === next.id ? next : step)),
    graph: buildExecutionGraph(
      plan.steps.map((step) => (step.id === next.id ? next : step)),
    ),
    updatedAt: new Date().toISOString(),
  };
}

function collectPriorOutputs(plan: PlanningGoal): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const step of plan.steps) {
    if (step.status === "succeeded" && step.result?.output) {
      out[step.id] = step.result.output;
      if (step.result.recordId) {
        out[step.actionId] = {
          ...step.result.output,
          recordId: step.result.recordId,
          recordLabel: step.result.recordLabel,
        };
      }
    }
  }
  return out;
}

async function runOneStep(
  plan: PlanningGoal,
  step: PlanningStep,
  business: AssistantBusinessContext,
): Promise<{ plan: PlanningGoal; fatal: boolean }> {
  const definition = getAssistantAction(step.actionId);
  if (!definition) {
    const failed: PlanningStep = {
      ...step,
      status: "failed",
      error: `Unknown action: ${step.actionId}`,
      completedAt: new Date().toISOString(),
    };
    await recordActionAudit({
      planId: plan.id,
      stepId: step.id,
      userId: business.user.id,
      workspaceId: business.workspace.id,
      module: step.module,
      actionId: step.actionId,
      actionName: step.name,
      result: "failed",
      aiRequest: plan.goal,
      error: failed.error,
    });
    return { plan: replaceStep(plan, failed), fatal: true };
  }

  let current: PlanningStep = {
    ...step,
    status: "running",
    startedAt: new Date().toISOString(),
    attempt: step.attempt,
  };
  let working = replaceStep(plan, current);
  await saveGoalPlan(working);

  const priorOutputs = collectPriorOutputs(working);
  const ctx = {
    business,
    planId: working.id,
    stepId: current.id,
    priorOutputs,
  };

  // Pre-validate for conditional skip + freshness
  let validationWarnings: string[] = [];
  try {
    const definitionForValidate = definition;
    const validation = await definitionForValidate.handler.validate(current.input, ctx);
    validationWarnings = validation.warnings ?? [];
    current = { ...current, validation };
    if (!validation.ok) {
      const failed: PlanningStep = {
        ...current,
        status: "failed",
        error: validation.errors.join("; ") || "Validation failed",
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - Date.parse(current.startedAt!),
      };
      working = replaceStep(working, failed);
      await recordActionAudit({
        planId: working.id,
        stepId: failed.id,
        userId: business.user.id,
        workspaceId: business.workspace.id,
        module: definition.module,
        actionId: definition.id,
        actionName: definition.name,
        result: "failed",
        durationMs: failed.durationMs,
        aiRequest: working.goal,
        error: failed.error,
      });
      return { plan: working, fatal: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    const failed: PlanningStep = {
      ...current,
      status: "failed",
      error: message,
      completedAt: new Date().toISOString(),
    };
    return { plan: replaceStep(working, failed), fatal: !isTransientError(error) };
  }

  const conditioned = evaluateCondition(working, current, validationWarnings);
  if (conditioned.skip) {
    const skipped: PlanningStep = {
      ...current,
      status: "skipped",
      skipReason: conditioned.reason ?? "Conditionally skipped",
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - Date.parse(current.startedAt!),
    };
    working = replaceStep(working, skipped);
    await recordActionAudit({
      planId: working.id,
      stepId: skipped.id,
      userId: business.user.id,
      workspaceId: business.workspace.id,
      module: definition.module,
      actionId: definition.id,
      actionName: definition.name,
      result: "cancelled",
      durationMs: skipped.durationMs,
      aiRequest: working.goal,
      error: skipped.skipReason,
    });
    return { plan: working, fatal: false };
  }

  let lastError: string | null = null;
  const maxAttempts = Math.max(1, current.maxRetries + 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    current = {
      ...current,
      attempt,
      status: attempt > 1 ? "retrying" : "running",
    };
    working = replaceStep(working, current);
    await saveGoalPlan(working);

    const started = Date.now();
    try {
      const result = await definition.handler.execute(current.input, {
        ...ctx,
        priorOutputs: collectPriorOutputs(working),
      });
      const durationMs = Date.now() - started;
      if (!result.ok) {
        lastError = result.error || result.message || "Action failed";
        if (attempt < maxAttempts && isTransientError(lastError)) {
          await sleep(current.retryBackoffMs * attempt);
          continue;
        }
        const failed: PlanningStep = {
          ...current,
          status: "failed",
          error: lastError,
          result,
          completedAt: new Date().toISOString(),
          durationMs,
        };
        working = replaceStep(working, failed);
        await recordActionAudit({
          planId: working.id,
          stepId: failed.id,
          userId: business.user.id,
          workspaceId: business.workspace.id,
          module: definition.module,
          actionId: definition.id,
          actionName: definition.name,
          beforeState: result.beforeState ?? null,
          afterState: result.afterState ?? null,
          result: "failed",
          durationMs,
          aiRequest: working.goal,
          error: lastError,
        });
        return { plan: working, fatal: true };
      }

      const succeeded: PlanningStep = {
        ...current,
        status: "succeeded",
        result: {
          ok: true,
          message: result.message,
          recordId: result.recordId,
          recordLabel: result.recordLabel,
          beforeState: result.beforeState,
          afterState: result.afterState,
          output: result.output ?? null,
        },
        completedAt: new Date().toISOString(),
        durationMs,
        error: null,
      };
      working = replaceStep(working, succeeded);
      await recordActionAudit({
        planId: working.id,
        stepId: succeeded.id,
        userId: business.user.id,
        workspaceId: business.workspace.id,
        module: definition.module,
        actionId: definition.id,
        actionName: definition.name,
        beforeState: result.beforeState ?? null,
        afterState: result.afterState ?? null,
        result: "success",
        durationMs,
        aiRequest: working.goal,
      });
      return { plan: working, fatal: false };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Execution failed";
      if (attempt < maxAttempts && isTransientError(error)) {
        await sleep(current.retryBackoffMs * attempt);
        continue;
      }
      const failed: PlanningStep = {
        ...current,
        status: "failed",
        error: lastError,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
      };
      working = replaceStep(working, failed);
      await recordActionAudit({
        planId: working.id,
        stepId: failed.id,
        userId: business.user.id,
        workspaceId: business.workspace.id,
        module: definition.module,
        actionId: definition.id,
        actionName: definition.name,
        result: "failed",
        durationMs: failed.durationMs,
        aiRequest: working.goal,
        error: lastError,
      });
      return { plan: working, fatal: true };
    }
  }

  return { plan: working, fatal: true };
}

async function rollbackSucceeded(
  plan: PlanningGoal,
  business: AssistantBusinessContext,
): Promise<PlanningGoal> {
  const succeeded = [...plan.steps]
    .filter((step) => step.status === "succeeded" && step.rollbackStrategy === "handler")
    .reverse();

  let working = plan;
  for (const step of succeeded) {
    const definition = getAssistantAction(step.actionId);
    if (!definition?.handler.rollback || !step.result) continue;
    try {
      const rollbackResult = await definition.handler.rollback(step.input, {
        business,
        planId: working.id,
        stepId: step.id,
        priorOutputs: collectPriorOutputs(working),
        executeResult: {
          ok: true,
          message: step.result.message,
          recordId: step.result.recordId,
          recordLabel: step.result.recordLabel,
          beforeState: step.result.beforeState,
          afterState: step.result.afterState,
          output: step.result.output,
        },
      });
      const rolled: PlanningStep = {
        ...step,
        status: "rolled_back",
        result: {
          ...step.result,
          message: rollbackResult.message,
        },
      };
      working = replaceStep(working, rolled);
      await recordActionAudit({
        planId: working.id,
        stepId: step.id,
        userId: business.user.id,
        workspaceId: business.workspace.id,
        module: definition.module,
        actionId: definition.id,
        actionName: definition.name,
        beforeState: step.result.afterState ?? null,
        afterState: step.result.beforeState ?? null,
        result: "rolled_back",
        aiRequest: working.goal,
        error: rollbackResult.ok ? null : rollbackResult.error,
      });
    } catch (error) {
      await recordActionAudit({
        planId: working.id,
        stepId: step.id,
        userId: business.user.id,
        workspaceId: business.workspace.id,
        module: step.module,
        actionId: step.actionId,
        actionName: step.name,
        result: "failed",
        aiRequest: working.goal,
        error: error instanceof Error ? error.message : "Rollback failed",
      });
    }
  }
  return working;
}

/**
 * Execute a confirmed goal plan using the execution graph.
 */
export async function executeGoalPlan(input: {
  goalId: string;
  business: AssistantBusinessContext;
  confirmed: boolean;
  rollbackOnFailure?: boolean;
}): Promise<{ plan: PlanningGoal; summary: string }> {
  const existing = await getGoalPlan(input.goalId, input.business.user.id);
  if (!existing) throw new Error("Goal plan not found.");

  if (!input.confirmed) {
    const cancelled: PlanningGoal = {
      ...existing,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    await saveGoalPlan(cancelled);
    return { plan: cancelled, summary: "Goal plan cancelled." };
  }

  if (existing.status !== "proposed" && existing.status !== "confirmed") {
    throw new Error(`Goal plan cannot be executed from status “${existing.status}”.`);
  }

  let plan: PlanningGoal = {
    ...existing,
    status: "executing",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: existing.steps.map((step) => ({
      ...step,
      status: step.status === "failed" ? step.status : "waiting",
    })),
  };
  await saveGoalPlan(plan);

  const pending = () =>
    plan.steps.filter((step) =>
      ["waiting", "pending", "ready", "retrying"].includes(step.status),
    );

  while (pending().length) {
    const ready = pending().filter((step) => depsSatisfied(plan, step));
    if (!ready.length) {
      // Deadlock — mark remaining failed
      for (const step of pending()) {
        plan = replaceStep(plan, {
          ...step,
          status: "failed",
          error: "Dependencies unresolved — execution halted.",
          completedAt: new Date().toISOString(),
        });
      }
      break;
    }

    // Mark non-ready pending as waiting
    for (const step of pending()) {
      if (!ready.some((r) => r.id === step.id) && step.status !== "waiting") {
        plan = replaceStep(plan, { ...step, status: "waiting" });
      }
    }

    // Partition ready steps into parallel groups + solos
    const groups = new Map<string, PlanningStep[]>();
    for (const step of ready) {
      const key = step.parallelGroupId ? `p:${step.parallelGroupId}` : `s:${step.id}`;
      groups.set(key, [...(groups.get(key) ?? []), step]);
    }

    let fatal = false;
    for (const group of groups.values()) {
      if (group.length > 1) {
        const snapshot = plan;
        const results = await Promise.all(
          group.map(async (step) => {
            const result = await runOneStep(snapshot, step, input.business);
            const updated = result.plan.steps.find((s) => s.id === step.id) ?? step;
            return { step: updated, fatal: result.fatal };
          }),
        );
        for (const result of results) {
          plan = replaceStep(plan, result.step);
          if (result.fatal) fatal = true;
        }
      } else {
        const result = await runOneStep(plan, group[0]!, input.business);
        plan = result.plan;
        if (result.fatal) fatal = true;
      }
      await saveGoalPlan(plan);
      if (fatal) break;
    }

    if (fatal) {
      if (input.rollbackOnFailure !== false) {
        plan = await rollbackSucceeded(plan, input.business);
      }
      break;
    }
  }

  const failed = plan.steps.some((step) => step.status === "failed");
  const anySuccess = plan.steps.some((step) => step.status === "succeeded");
  const anyRollback = plan.steps.some((step) => step.status === "rolled_back");
  const started = plan.startedAt ? Date.parse(plan.startedAt) : Date.now();
  const durationMs = Date.now() - started;
  const auditReference = `goal_audit:${plan.id}`;

  plan = {
    ...plan,
    status: failed ? (anySuccess || anyRollback ? "partial" : "failed") : "completed",
    completedAt: new Date().toISOString(),
    durationMs,
    auditReference,
    updatedAt: new Date().toISOString(),
  };
  await saveGoalPlan(plan);

  return { plan, summary: summariseGoalExecution(plan) };
}

export function summariseGoalExecution(plan: PlanningGoal): string {
  const lines = [
    `${plan.title} — ${plan.status} (${progressPct(plan.steps)}%)`,
    `Goal: ${plan.goal}`,
    ...plan.steps.map((step, index) => {
      const detail =
        step.skipReason ||
        step.error ||
        step.result?.message ||
        step.preview?.summary ||
        "";
      return `${index + 1}. [${step.status.toUpperCase()}] ${step.name}${
        detail ? ` — ${detail}` : ""
      }`;
    }),
  ];
  if (plan.auditReference) lines.push(`Audit: ${plan.auditReference}`);
  return lines.join("\n");
}

/** Exported for tests / condition debugging. */
export function __evaluateConditionForTests(
  plan: PlanningGoal,
  step: PlanningStep,
  warnings: string[],
) {
  return evaluateCondition(plan, step, warnings);
}

export type { PlanningCondition };

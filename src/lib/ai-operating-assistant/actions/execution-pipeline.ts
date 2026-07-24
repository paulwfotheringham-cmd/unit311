/**
 * Action execution pipeline:
 * request → validate permissions → plan + preview → confirm → execute → audit → summary
 * Supports multi-step plans with stop-on-failure and optional rollback.
 */

import type { AssistantBusinessContext } from "../types";
import {
  eaStage,
  eaStop,
  getEaCorrelationId,
  setEaPlanId,
} from "../ea-forensic-trace";
import { recordActionAudit } from "./audit-service";
import { describeMissingPermissions, userHasActionPermissions } from "./permissions";
import { getActionPlan, saveActionPlan } from "./plan-store";
import { getAssistantAction } from "./registry";
import type {
  AssistantActionPlan,
  AssistantActionPlanStep,
  AssistantActionPreview,
} from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type ProposedActionStepInput = {
  actionId: string;
  input?: Record<string, unknown>;
  dependsOnStepIds?: string[];
};

export type BuildActionPlanInput = {
  business: AssistantBusinessContext;
  steps: ProposedActionStepInput[];
  aiRequest?: string | null;
  conversationId?: string | null;
  title?: string | null;
};

function buildPlanTitle(steps: AssistantActionPlanStep[], override?: string | null) {
  if (override?.trim()) return override.trim();
  if (steps.length === 1) return steps[0]!.name;
  return `Multi-step plan (${steps.length} actions)`;
}

function buildPlanSummary(steps: AssistantActionPlanStep[]) {
  return steps.map((step, index) => `${index + 1}. ${step.name}`).join(" → ");
}

/**
 * Validate permissions + inputs and generate previews for every step.
 * Does not execute anything.
 */
export async function buildActionPlan(
  input: BuildActionPlanInput,
): Promise<{ plan: AssistantActionPlan; blocked: boolean; blockReason?: string }> {
  const now = new Date().toISOString();
  const planId = createId("plan");
  const steps: AssistantActionPlanStep[] = [];
  const warnings: string[] = [];
  const permissionNotes: string[] = [];

  if (!input.steps.length) {
    eaStop("Plan created", "No actions were provided.", { planId });
    return {
      plan: {
        id: planId,
        userId: input.business.user.id,
        workspaceId: input.business.workspace.id,
        organisationId: input.business.organisation.id,
        conversationId: input.conversationId ?? null,
        status: "failed",
        title: "Empty plan",
        summary: "No actions were proposed.",
        aiRequest: input.aiRequest ?? null,
        steps: [],
        warnings: ["No actions were provided."],
        permissionNotes: [],
        createdAt: now,
        updatedAt: now,
      },
      blocked: true,
      blockReason: "No actions were provided.",
    };
  }

  for (const proposed of input.steps) {
    const definition = getAssistantAction(proposed.actionId);
    const stepId = createId("step");

    if (!definition) {
      steps.push({
        id: stepId,
        actionId: proposed.actionId,
        name: proposed.actionId,
        module: "system",
        input: proposed.input ?? {},
        status: "failed",
        error: `Unknown action: ${proposed.actionId}`,
        dependsOnStepIds: proposed.dependsOnStepIds,
      });
      continue;
    }

    const missing = describeMissingPermissions(
      input.business,
      definition.requiredPermissions,
    );
    if (missing.length) {
      permissionNotes.push(...missing.map((note) => `${definition.name}: ${note}`));
      steps.push({
        id: stepId,
        actionId: definition.id,
        name: definition.name,
        module: definition.module,
        input: proposed.input ?? {},
        status: "failed",
        error: missing.join("; "),
        validation: { ok: false, errors: missing, warnings: [] },
        dependsOnStepIds: proposed.dependsOnStepIds,
      });
      continue;
    }

    const ctx = {
      business: input.business,
      planId,
      stepId,
      priorOutputs: {},
    };

    const validation = await definition.handler.validate(proposed.input ?? {}, ctx);
    let preview: AssistantActionPreview | undefined;
    if (validation.ok) {
      preview = await definition.handler.preview(proposed.input ?? {}, ctx);
      warnings.push(...preview.warnings, ...validation.warnings);
    } else {
      warnings.push(...validation.warnings);
    }

    steps.push({
      id: stepId,
      actionId: definition.id,
      name: definition.name,
      module: definition.module,
      input: proposed.input ?? {},
      status: validation.ok ? "previewed" : "failed",
      validation,
      preview,
      error: validation.ok ? null : validation.errors.join("; "),
      dependsOnStepIds: proposed.dependsOnStepIds,
    });
  }

  const anyFailed = steps.some((step) => step.status === "failed");
  const needsConfirmation = steps.some((step) => {
    const definition = getAssistantAction(step.actionId);
    return definition?.confirmationRequired !== false;
  });

  const plan: AssistantActionPlan = {
    id: planId,
    userId: input.business.user.id,
    workspaceId: input.business.workspace.id,
    organisationId: input.business.organisation.id,
    conversationId: input.conversationId ?? null,
    status: anyFailed ? "failed" : "proposed",
    title: buildPlanTitle(steps, input.title),
    summary: buildPlanSummary(steps),
    aiRequest: input.aiRequest ?? null,
    steps,
    warnings: [...new Set(warnings.filter(Boolean))],
    permissionNotes: [...new Set(permissionNotes)],
    createdAt: now,
    updatedAt: now,
  };

  const { plan: savedPlan, storedSuccessfully } = await saveActionPlan(plan);
  setEaPlanId(savedPlan.id);

  eaStage("Plan created", {
    planId: savedPlan.id,
    steps: savedPlan.steps.map((step) => ({
      stepId: step.id,
      actionId: step.actionId,
      module: step.module,
      status: step.status,
      input: step.input,
    })),
    "stored successfully": storedSuccessfully,
  });

  if (!storedSuccessfully) {
    eaStop("Plan created", "plan not durably stored — Approve must rehydrate from client snapshot", {
      planId: savedPlan.id,
    });
  }

  if (anyFailed) {
    eaStop("Plan created", "One or more steps failed validation or permission checks.", {
      planId: savedPlan.id,
      steps: savedPlan.steps.map((s) => ({ actionId: s.actionId, status: s.status, error: s.error })),
    });
    return {
      plan: savedPlan,
      blocked: true,
      blockReason: "One or more steps failed validation or permission checks.",
    };
  }

  // confirmationRequired=false for all steps still goes through explicit confirm API
  // unless caller opts into auto-execute later — Phase 1 always returns a plan.
  void needsConfirmation;

  return { plan: savedPlan, blocked: false };
}

/**
 * Execute a previously proposed plan after user confirmation.
 * Stops on first failure; rolls back succeeded undo-capable steps in reverse order.
 */
export async function executeActionPlan(input: {
  planId: string;
  business: AssistantBusinessContext;
  confirmed: boolean;
}): Promise<{ plan: AssistantActionPlan; summary: string }> {
  eaStage("executeActionPlan entered", {
    planId: input.planId,
    confirmed: input.confirmed,
    correlationId: getEaCorrelationId(),
  });
  setEaPlanId(input.planId);

  const existing = await getActionPlan(input.planId, input.business.user.id);
  if (!existing) {
    eaStop("executeActionPlan entered", "Action plan not found.", { planId: input.planId });
    throw new Error("Action plan not found.");
  }
  if (existing.status !== "proposed" && existing.status !== "confirmed") {
    eaStop("executeActionPlan entered", `Plan cannot be executed from status “${existing.status}”.`, {
      planId: input.planId,
      status: existing.status,
    });
    throw new Error(`Plan cannot be executed from status “${existing.status}”.`);
  }
  if (!input.confirmed) {
    const cancelled: AssistantActionPlan = {
      ...existing,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    await saveActionPlan(cancelled);
    await recordActionAudit({
      planId: cancelled.id,
      userId: input.business.user.id,
      workspaceId: input.business.workspace.id,
      module: "system",
      actionId: "plan.cancel",
      actionName: "Cancel action plan",
      result: "cancelled",
      aiRequest: cancelled.aiRequest,
    });
    eaStop("executeActionPlan entered", "User cancelled (confirmed=false)", {
      planId: cancelled.id,
    });
    return { plan: cancelled, summary: "Action plan cancelled." };
  }

  let plan: AssistantActionPlan = {
    ...existing,
    status: "executing",
    updatedAt: new Date().toISOString(),
  };
  await saveActionPlan(plan);

  const priorOutputs: Record<string, Record<string, unknown>> = {};
  const succeededSteps: AssistantActionPlanStep[] = [];

  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index]!;
    const definition = getAssistantAction(step.actionId);
    if (!definition) {
      eaStop("Executing action", `Unknown action: ${step.actionId}`, {
        planId: plan.id,
        actionId: step.actionId,
      });
      plan = markStepFailed(plan, step.id, `Unknown action: ${step.actionId}`);
      break;
    }

    if (!userHasActionPermissions(input.business, definition.requiredPermissions)) {
      const missing = describeMissingPermissions(
        input.business,
        definition.requiredPermissions,
      );
      eaStop("Executing action", missing.join("; "), {
        planId: plan.id,
        actionId: definition.id,
      });
      plan = markStepFailed(plan, step.id, missing.join("; "));
      await recordActionAudit({
        planId: plan.id,
        stepId: step.id,
        userId: input.business.user.id,
        workspaceId: input.business.workspace.id,
        module: definition.module,
        actionId: definition.id,
        actionName: definition.name,
        result: "blocked",
        aiRequest: plan.aiRequest,
        error: missing.join("; "),
      });
      break;
    }

    const started = Date.now();
    plan = updateStep(plan, step.id, { status: "executing" });
    await saveActionPlan(plan);

    eaStage("Executing action", {
      actionId: definition.id,
      module: definition.module,
      input: step.input,
      planId: plan.id,
      stepId: step.id,
    });

    try {
      const ctx = {
        business: input.business,
        planId: plan.id,
        stepId: step.id,
        priorOutputs,
      };
      const validation = await definition.handler.validate(step.input, ctx);
      if (!validation.ok) {
        throw new Error(validation.errors.join("; ") || "Validation failed");
      }

      const result = await definition.handler.execute(step.input, ctx);
      const durationMs = Date.now() - started;

      if (!result.ok) {
        throw new Error(result.error || result.message || "Action failed");
      }

      const completedStep: AssistantActionPlanStep = {
        ...step,
        status: "succeeded",
        result,
        durationMs,
        error: null,
      };
      plan = replaceStep(plan, completedStep);
      succeededSteps.push(completedStep);
      priorOutputs[step.id] = {
        ...(result.output ?? {}),
        recordId: result.recordId ?? undefined,
        recordLabel: result.recordLabel ?? undefined,
      };

      if (definition.auditRequired) {
        await recordActionAudit({
          planId: plan.id,
          stepId: step.id,
          userId: input.business.user.id,
          workspaceId: input.business.workspace.id,
          module: definition.module,
          actionId: definition.id,
          actionName: definition.name,
          beforeState: result.beforeState ?? null,
          afterState: result.afterState ?? null,
          result: "success",
          durationMs,
          aiRequest: plan.aiRequest,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
      const stack = error instanceof Error ? error.stack : undefined;
      eaStop("Executing action", message, {
        planId: plan.id,
        actionId: definition.id,
        module: definition.module,
        input: step.input,
        stack,
      });
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      plan = markStepFailed(plan, step.id, message);
      await recordActionAudit({
        planId: plan.id,
        stepId: step.id,
        userId: input.business.user.id,
        workspaceId: input.business.workspace.id,
        module: definition.module,
        actionId: definition.id,
        actionName: definition.name,
        result: "failed",
        durationMs: Date.now() - started,
        aiRequest: plan.aiRequest,
        error: message,
      });

      // Rollback succeeded undo-capable steps in reverse order.
      for (const done of [...succeededSteps].reverse()) {
        const undoDefinition = getAssistantAction(done.actionId);
        if (!undoDefinition?.undoCapable || !undoDefinition.handler.rollback || !done.result) {
          continue;
        }
        try {
          const rollbackResult = await undoDefinition.handler.rollback(done.input, {
            business: input.business,
            planId: plan.id,
            stepId: done.id,
            priorOutputs,
            executeResult: done.result,
          });
          plan = updateStep(plan, done.id, {
            status: rollbackResult.ok ? "rolled_back" : done.status,
            rollbackResult,
          });
          await recordActionAudit({
            planId: plan.id,
            stepId: done.id,
            userId: input.business.user.id,
            workspaceId: input.business.workspace.id,
            module: undoDefinition.module,
            actionId: undoDefinition.id,
            actionName: `${undoDefinition.name} (rollback)`,
            beforeState: done.result.afterState ?? null,
            afterState: done.result.beforeState ?? null,
            result: rollbackResult.ok ? "rolled_back" : "failed",
            aiRequest: plan.aiRequest,
            error: rollbackResult.ok ? null : rollbackResult.error ?? rollbackResult.message,
          });
        } catch (rollbackError) {
          console.error(
            "[EA] rollback EXCEPTION",
            rollbackError instanceof Error ? rollbackError.stack : rollbackError,
          );
          await recordActionAudit({
            planId: plan.id,
            stepId: done.id,
            userId: input.business.user.id,
            workspaceId: input.business.workspace.id,
            module: undoDefinition.module,
            actionId: undoDefinition.id,
            actionName: `${undoDefinition.name} (rollback)`,
            result: "failed",
            aiRequest: plan.aiRequest,
            error:
              rollbackError instanceof Error
                ? rollbackError.message
                : "Rollback failed",
          });
        }
      }
      break;
    }

    await saveActionPlan(plan);
  }

  const failed = plan.steps.some((step) => step.status === "failed");
  const anySuccess = plan.steps.some((step) => step.status === "succeeded");
  const anyRolledBack = plan.steps.some((step) => step.status === "rolled_back");

  plan = {
    ...plan,
    status: failed ? (anySuccess || anyRolledBack ? "partial" : "failed") : "completed",
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
  await saveActionPlan(plan);

  if (failed) {
    eaStop("executeActionPlan entered", `Plan finished with status ${plan.status}`, {
      planId: plan.id,
      steps: plan.steps.map((s) => ({
        actionId: s.actionId,
        status: s.status,
        error: s.error,
        recordId: s.result?.recordId ?? null,
      })),
    });
  }

  return { plan, summary: summarisePlan(plan) };
}

function updateStep(
  plan: AssistantActionPlan,
  stepId: string,
  patch: Partial<AssistantActionPlanStep>,
): AssistantActionPlan {
  return {
    ...plan,
    steps: plan.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
    updatedAt: new Date().toISOString(),
  };
}

function replaceStep(plan: AssistantActionPlan, next: AssistantActionPlanStep): AssistantActionPlan {
  return {
    ...plan,
    steps: plan.steps.map((step) => (step.id === next.id ? next : step)),
    updatedAt: new Date().toISOString(),
  };
}

function markStepFailed(
  plan: AssistantActionPlan,
  stepId: string,
  error: string,
): AssistantActionPlan {
  return updateStep(plan, stepId, { status: "failed", error });
}

export function summarisePlan(plan: AssistantActionPlan): string {
  const lines = plan.steps.map((step, index) => {
    const status = step.status.toUpperCase();
    const detail =
      step.result?.message ||
      step.error ||
      step.preview?.summary ||
      "";
    return `${index + 1}. [${status}] ${step.name}${detail ? ` — ${detail}` : ""}`;
  });
  return [`${plan.title} (${plan.status})`, ...lines].join("\n");
}

/** Confirmation card payload for the UI. */
export function toConfirmationView(plan: AssistantActionPlan) {
  return {
    planId: plan.id,
    correlationId: getEaCorrelationId(),
    title: plan.title,
    summary: plan.summary,
    status: plan.status,
    aiRequest: plan.aiRequest,
    warnings: plan.warnings,
    permissionNotes: plan.permissionNotes,
    actions: plan.steps.map((step) => ({
      stepId: step.id,
      actionId: step.actionId,
      name: step.name,
      module: step.module,
      status: step.status,
      input: step.input,
      preview: step.preview ?? null,
      error: step.error ?? null,
    })),
    affectedRecords: plan.steps.flatMap((step) => step.preview?.affectedRecords ?? []),
  };
}

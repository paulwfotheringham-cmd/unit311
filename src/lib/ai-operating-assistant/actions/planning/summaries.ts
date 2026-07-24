/**
 * Plan / execution summaries + Plan Viewer model adapters.
 */

import { formatDurationMs, progressPct } from "./graph";
import type {
  PlanViewerModel,
  PlanningExecutionSummary,
  PlanningGoal,
  PlanningPlanSummary,
  PlanningRiskLevel,
} from "./types";

export function toPlanSummary(plan: PlanningGoal): PlanningPlanSummary {
  return {
    goalId: plan.id,
    goal: plan.goal,
    title: plan.title,
    status: plan.status,
    businessImpact: plan.businessImpact,
    actions: plan.steps.map((step) => ({
      stepId: step.id,
      actionId: step.actionId,
      name: step.name,
      reason: step.reason,
      riskLevel: step.riskLevel,
      dependsOn: step.dependsOnStepIds,
      parallelGroupId: step.parallelGroupId,
      confirmationRequired: step.confirmationRequired,
      estimatedDurationMs: step.estimatedDurationMs,
      rollbackStrategy: step.rollbackStrategy,
    })),
    estimatedDurationMs: plan.estimatedDurationMs,
    estimatedDurationLabel: formatDurationMs(plan.estimatedDurationMs),
    affectedRecords: plan.steps.flatMap((step) => step.preview?.affectedRecords ?? []),
    riskLevel: plan.riskLevel,
    rollbackAvailable: plan.rollbackAvailable,
    warnings: plan.warnings,
    permissionNotes: plan.permissionNotes,
    graph: plan.graph,
  };
}

export function toExecutionSummary(plan: PlanningGoal): PlanningExecutionSummary {
  return {
    goalId: plan.id,
    goal: plan.goal,
    status: plan.status,
    completedActions: plan.steps
      .filter((step) => step.status === "succeeded")
      .map((step) => ({
        stepId: step.id,
        name: step.name,
        message: step.result?.message ?? "Completed",
      })),
    skippedActions: plan.steps
      .filter((step) => step.status === "skipped")
      .map((step) => ({
        stepId: step.id,
        name: step.name,
        reason: step.skipReason ?? "Skipped",
      })),
    failedActions: plan.steps
      .filter((step) => step.status === "failed")
      .map((step) => ({
        stepId: step.id,
        name: step.name,
        error: step.error ?? "Failed",
      })),
    rollbackActions: plan.steps
      .filter((step) => step.status === "rolled_back")
      .map((step) => ({
        stepId: step.id,
        name: step.name,
        message: step.result?.message ?? "Rolled back",
      })),
    durationMs: plan.durationMs ?? null,
    durationLabel: formatDurationMs(plan.durationMs),
    auditReference: plan.auditReference,
    progressPct: progressPct(plan.steps),
  };
}

export function toPlanViewerModel(plan: PlanningGoal): PlanViewerModel {
  const phase =
    plan.status === "proposed" || plan.status === "confirmed"
      ? "summary"
      : plan.status === "executing"
        ? "executing"
        : "complete";

  const remaining = plan.steps
    .filter((step) => !["succeeded", "skipped", "failed", "rolled_back"].includes(step.status))
    .reduce((sum, step) => sum + step.estimatedDurationMs, 0);

  return {
    kind: "goal_plan",
    planId: plan.id,
    goal: plan.goal,
    title: plan.title,
    status: plan.status,
    businessImpact: plan.businessImpact,
    progressPct: progressPct(plan.steps),
    estimatedDurationMs: plan.estimatedDurationMs,
    estimatedDurationLabel: formatDurationMs(plan.estimatedDurationMs),
    estimatedCompletionLabel:
      phase === "executing" ? `~${formatDurationMs(remaining)} remaining` : null,
    riskLevel: plan.riskLevel,
    rollbackAvailable: plan.rollbackAvailable,
    warnings: plan.warnings,
    permissionNotes: plan.permissionNotes,
    phase,
    steps: plan.steps.map((step) => ({
      stepId: step.id,
      actionId: step.actionId,
      name: step.name,
      module: String(step.module),
      reason: step.reason,
      status: step.status,
      riskLevel: step.riskLevel,
      dependsOnStepIds: step.dependsOnStepIds,
      parallelGroupId: step.parallelGroupId,
      estimatedDurationMs: step.estimatedDurationMs,
      durationMs: step.durationMs,
      error: step.error,
      skipReason: step.skipReason,
      previewSummary: step.preview?.summary ?? null,
      input: step.input ?? {},
    })),
    graph: plan.graph,
    affectedRecords: plan.steps.flatMap((step) => step.preview?.affectedRecords ?? []),
    executionSummary: phase === "complete" ? toExecutionSummary(plan) : null,
    auditReference: plan.auditReference,
  };
}

/** Minimal Phase 1 confirmation shape (avoid importing UI into lib). */
export type LegacyActionConfirmationLike = {
  planId: string;
  title: string;
  summary: string;
  status: string;
  aiRequest?: string | null;
  warnings: string[];
  permissionNotes: string[];
  actions: Array<{
    stepId: string;
    actionId: string;
    name: string;
    module: string;
    status: string;
    input?: Record<string, unknown>;
    preview: {
      summary: string;
      affectedRecords: Array<{
        type: string;
        id?: string | null;
        label: string;
        change?: string;
      }>;
      warnings: string[];
      reversible: boolean;
    } | null;
    error?: string | null;
  }>;
  affectedRecords: Array<{
    type: string;
    id?: string | null;
    label: string;
    change?: string;
  }>;
};

/** Adapt Phase 1 confirmation into Plan Viewer without changing Phase 1 APIs. */
export function actionConfirmationToPlanViewer(
  confirmation: LegacyActionConfirmationLike,
): PlanViewerModel {
  const status = confirmation.status;
  const phase =
    status === "proposed" || status === "confirmed"
      ? "summary"
      : status === "executing"
        ? "executing"
        : "complete";

  const steps = confirmation.actions.map((action) => ({
    stepId: action.stepId,
    actionId: action.actionId,
    name: action.name,
    module: action.module,
    reason: action.preview?.summary || action.name,
    status: action.status,
    riskLevel: "medium" as PlanningRiskLevel,
    dependsOnStepIds: [] as string[],
    parallelGroupId: null as string | null,
    estimatedDurationMs: 3000,
    durationMs: null as number | null,
    error: action.error,
    skipReason: null as string | null,
    previewSummary: action.preview?.summary ?? null,
    input: action.input ?? {},
  }));

  const done = steps.filter((step) =>
    ["succeeded", "skipped", "failed", "rolled_back", "completed"].includes(step.status),
  ).length;

  return {
    kind: "action_plan",
    planId: confirmation.planId,
    goal: confirmation.aiRequest || confirmation.title,
    title: confirmation.title,
    status: confirmation.status,
    businessImpact: confirmation.summary,
    progressPct: steps.length ? Math.round((done / steps.length) * 100) : 0,
    estimatedDurationMs: steps.length * 3000,
    estimatedDurationLabel: formatDurationMs(steps.length * 3000),
    estimatedCompletionLabel: null,
    riskLevel: "medium",
    rollbackAvailable: confirmation.actions.some((a) => a.preview?.reversible),
    warnings: confirmation.warnings,
    permissionNotes: confirmation.permissionNotes,
    phase,
    steps,
    graph: {
      nodes: steps.map((s) => s.stepId),
      edges: steps.slice(1).map((step, index) => ({
        fromStepId: steps[index]!.stepId,
        toStepId: step.stepId,
        kind: "dependency" as const,
      })),
      waves: steps.map((s) => [s.stepId]),
      parallelGroups: {},
    },
    affectedRecords: confirmation.affectedRecords,
    executionSummary: null,
    auditReference: confirmation.planId,
  };
}

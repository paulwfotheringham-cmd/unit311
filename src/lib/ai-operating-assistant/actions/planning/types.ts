/**
 * Planning Engine types — Goal → Plan → Execution Graph.
 * Sits beside the Action Framework; does not alter Phase 1 plan APIs.
 */

import type { AssistantActionModule } from "../types";

export type PlanningRiskLevel = "low" | "medium" | "high" | "critical";

export type PlanningGoalStatus =
  | "draft"
  | "proposed"
  | "confirmed"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled"
  | "partial";

export type PlanningStepStatus =
  | "pending"
  | "waiting"
  | "ready"
  | "running"
  | "succeeded"
  | "skipped"
  | "failed"
  | "rolled_back"
  | "retrying";

export type PlanningRollbackStrategy =
  | "handler"
  | "none"
  | "compensate";

/** How a step participates in the execution graph. */
export type PlanningExecutionMode =
  | "sequential"
  | "parallel"
  | "conditional"
  | "retryable";

export type PlanningCondition =
  | {
      kind: "skip_if_validation_warnings_match";
      /** Case-insensitive substring / regex source matched against validation warnings. */
      pattern: string;
    }
  | {
      kind: "skip_if_prior_succeeded";
      stepId: string;
    }
  | {
      kind: "run_only_if_prior_succeeded";
      stepId: string;
    }
  | {
      kind: "skip_if_prior_failed";
      stepId: string;
    }
  | {
      kind: "run_only_if_prior_skipped";
      stepId: string;
    };

export type PlanningStep = {
  id: string;
  actionId: string;
  name: string;
  module: AssistantActionModule | string;
  reason: string;
  input: Record<string, unknown>;
  /** Steps that must finish (succeeded or skipped) before this one runs. */
  dependsOnStepIds: string[];
  /** Steps sharing a group id may run concurrently once dependencies are met. */
  parallelGroupId: string | null;
  condition: PlanningCondition | null;
  estimatedDurationMs: number;
  rollbackStrategy: PlanningRollbackStrategy;
  confirmationRequired: boolean;
  riskLevel: PlanningRiskLevel;
  maxRetries: number;
  retryBackoffMs: number;
  executionModes: PlanningExecutionMode[];
  status: PlanningStepStatus;
  attempt: number;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  error?: string | null;
  skipReason?: string | null;
  result?: {
    ok: boolean;
    message: string;
    recordId?: string | null;
    recordLabel?: string | null;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    output?: Record<string, unknown> | null;
  } | null;
  preview?: {
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
  validation?: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  } | null;
};

export type PlanningEdge = {
  fromStepId: string;
  toStepId: string;
  kind: "dependency" | "parallel" | "conditional";
};

export type PlanningExecutionGraph = {
  nodes: string[];
  edges: PlanningEdge[];
  waves: string[][];
  parallelGroups: Record<string, string[]>;
};

export type PlanningGoal = {
  id: string;
  userId: string;
  workspaceId: string | null;
  organisationId: string | null;
  conversationId: string | null;
  /** Natural-language objective. */
  goal: string;
  status: PlanningGoalStatus;
  title: string;
  businessImpact: string;
  steps: PlanningStep[];
  graph: PlanningExecutionGraph;
  warnings: string[];
  permissionNotes: string[];
  estimatedDurationMs: number;
  riskLevel: PlanningRiskLevel;
  rollbackAvailable: boolean;
  confirmationRequired: boolean;
  /** Linked Action Framework plan id when also materialised for Phase 1 tools (optional). */
  actionPlanId: string | null;
  auditReference: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  createdAt: string;
  updatedAt: string;
  plannerSource: "llm" | "heuristic" | "hybrid";
  discoveredActionIds: string[];
};

export type PlanningPlanSummary = {
  goalId: string;
  goal: string;
  title: string;
  status: PlanningGoalStatus;
  businessImpact: string;
  actions: Array<{
    stepId: string;
    actionId: string;
    name: string;
    reason: string;
    riskLevel: PlanningRiskLevel;
    dependsOn: string[];
    parallelGroupId: string | null;
    confirmationRequired: boolean;
    estimatedDurationMs: number;
    rollbackStrategy: PlanningRollbackStrategy;
  }>;
  estimatedDurationMs: number;
  estimatedDurationLabel: string;
  affectedRecords: Array<{
    type: string;
    id?: string | null;
    label: string;
    change?: string;
  }>;
  riskLevel: PlanningRiskLevel;
  rollbackAvailable: boolean;
  warnings: string[];
  permissionNotes: string[];
  graph: PlanningExecutionGraph;
};

export type PlanningExecutionSummary = {
  goalId: string;
  goal: string;
  status: PlanningGoalStatus;
  completedActions: Array<{ stepId: string; name: string; message: string }>;
  skippedActions: Array<{ stepId: string; name: string; reason: string }>;
  failedActions: Array<{ stepId: string; name: string; error: string }>;
  rollbackActions: Array<{ stepId: string; name: string; message: string }>;
  durationMs: number | null;
  durationLabel: string;
  auditReference: string | null;
  progressPct: number;
};

/** UI / API view model for Plan Viewer. */
export type PlanViewerModel = {
  kind: "goal_plan" | "action_plan";
  planId: string;
  goal: string;
  title: string;
  status: string;
  businessImpact: string;
  progressPct: number;
  estimatedDurationMs: number;
  estimatedDurationLabel: string;
  estimatedCompletionLabel: string | null;
  riskLevel: PlanningRiskLevel;
  rollbackAvailable: boolean;
  warnings: string[];
  permissionNotes: string[];
  phase: "summary" | "executing" | "complete";
  steps: Array<{
    stepId: string;
    actionId: string;
    name: string;
    module: string;
    reason: string;
    status: string;
    riskLevel: PlanningRiskLevel;
    dependsOnStepIds: string[];
    parallelGroupId: string | null;
    estimatedDurationMs: number;
    durationMs?: number | null;
    error?: string | null;
    skipReason?: string | null;
    previewSummary?: string | null;
  }>;
  graph: PlanningExecutionGraph;
  affectedRecords: Array<{
    type: string;
    id?: string | null;
    label: string;
    change?: string;
  }>;
  executionSummary?: PlanningExecutionSummary | null;
  auditReference?: string | null;
};

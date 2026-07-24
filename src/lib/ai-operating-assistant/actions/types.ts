/**
 * Action Framework types — foundation for AI-executed business operations.
 * Domain modules register handlers; this package stays module-agnostic.
 */

import type { AssistantBusinessContext } from "../types";

export type AssistantActionModule =
  | "clients"
  | "projects"
  | "crm"
  | "tasks"
  | "finance"
  | "hr"
  | "payroll"
  | "assets"
  | "inventory"
  | "procurement"
  | "documents"
  | "calendar"
  | "meetings"
  | "settings"
  | "notifications"
  | "board"
  | "strategy"
  | "system";

export type AssistantActionPermission =
  | "canAccessFinancials"
  | "canAccessHr"
  | "canAccessUsers"
  | "canAccessStrategy"
  | "authenticated";

export type AssistantActionStepStatus =
  | "pending"
  | "validated"
  | "previewed"
  | "executing"
  | "succeeded"
  | "failed"
  | "rolled_back"
  | "skipped";

export type AssistantActionPlanStatus =
  | "proposed"
  | "confirmed"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled"
  | "partial";

export type AssistantActionValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type AssistantActionPreview = {
  summary: string;
  affectedRecords: Array<{
    type: string;
    id?: string | null;
    label: string;
    change?: string;
  }>;
  warnings: string[];
  reversible: boolean;
  estimatedSideEffects?: string[];
};

export type AssistantActionExecuteResult = {
  ok: boolean;
  message: string;
  recordId?: string | null;
  recordLabel?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
};

export type AssistantActionRollbackResult = {
  ok: boolean;
  message: string;
  error?: string | null;
};

export type AssistantActionHandlerContext = {
  business: AssistantBusinessContext;
  planId: string;
  stepId: string;
  /** Outputs from prior successful steps in the same plan (for linking). */
  priorOutputs: Record<string, Record<string, unknown>>;
};

export type AssistantActionHandler = {
  validate: (
    input: Record<string, unknown>,
    ctx: AssistantActionHandlerContext,
  ) => Promise<AssistantActionValidationResult> | AssistantActionValidationResult;
  preview: (
    input: Record<string, unknown>,
    ctx: AssistantActionHandlerContext,
  ) => Promise<AssistantActionPreview> | AssistantActionPreview;
  execute: (
    input: Record<string, unknown>,
    ctx: AssistantActionHandlerContext,
  ) => Promise<AssistantActionExecuteResult>;
  rollback?: (
    input: Record<string, unknown>,
    ctx: AssistantActionHandlerContext & {
      executeResult: AssistantActionExecuteResult;
    },
  ) => Promise<AssistantActionRollbackResult>;
};

export type AssistantActionDefinition = {
  id: string;
  name: string;
  description: string;
  module: AssistantActionModule;
  requiredPermissions: AssistantActionPermission[];
  confirmationRequired: boolean;
  auditRequired: boolean;
  undoCapable: boolean;
  /** JSON-schema-like parameter hints for discovery / planning. */
  inputSchema?: Record<string, unknown>;
  handler: AssistantActionHandler;
};

/** Serializable discovery card (no handler). */
export type AssistantActionDescriptor = {
  id: string;
  name: string;
  description: string;
  module: AssistantActionModule;
  requiredPermissions: AssistantActionPermission[];
  confirmationRequired: boolean;
  auditRequired: boolean;
  undoCapable: boolean;
  inputSchema?: Record<string, unknown>;
};

export type AssistantActionPlanStep = {
  id: string;
  actionId: string;
  name: string;
  module: AssistantActionModule;
  input: Record<string, unknown>;
  status: AssistantActionStepStatus;
  validation?: AssistantActionValidationResult;
  preview?: AssistantActionPreview;
  result?: AssistantActionExecuteResult;
  rollbackResult?: AssistantActionRollbackResult;
  error?: string | null;
  durationMs?: number | null;
  dependsOnStepIds?: string[];
};

export type AssistantActionPlan = {
  id: string;
  userId: string;
  workspaceId: string | null;
  organisationId: string | null;
  conversationId: string | null;
  status: AssistantActionPlanStatus;
  title: string;
  summary: string;
  aiRequest: string | null;
  steps: AssistantActionPlanStep[];
  warnings: string[];
  permissionNotes: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type AssistantActionAuditRecord = {
  id: string;
  planId: string | null;
  stepId: string | null;
  userId: string;
  workspaceId: string | null;
  module: string;
  actionId: string;
  actionName: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  result: "success" | "failed" | "rolled_back" | "cancelled" | "blocked";
  durationMs: number | null;
  aiRequest: string | null;
  toolCalls: unknown[] | null;
  error: string | null;
  createdAt: string;
};

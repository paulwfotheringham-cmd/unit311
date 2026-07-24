/**
 * Central audit log for Action Framework executions.
 * Service-role writes; RLS deny-all for browser clients (same pattern as conversations).
 */

import {
  createSupabaseServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";
import type { AssistantActionAuditRecord } from "./types";

const TABLE = "executive_assistant_action_audit";

function randomId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function recordActionAudit(input: {
  planId?: string | null;
  stepId?: string | null;
  userId: string;
  workspaceId?: string | null;
  module: string;
  actionId: string;
  actionName: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  result: AssistantActionAuditRecord["result"];
  durationMs?: number | null;
  aiRequest?: string | null;
  toolCalls?: unknown[] | null;
  error?: string | null;
}): Promise<AssistantActionAuditRecord> {
  const record: AssistantActionAuditRecord = {
    id: randomId("act_audit"),
    planId: input.planId ?? null,
    stepId: input.stepId ?? null,
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    module: input.module,
    actionId: input.actionId,
    actionName: input.actionName,
    beforeState: input.beforeState ?? null,
    afterState: input.afterState ?? null,
    result: input.result,
    durationMs: input.durationMs ?? null,
    aiRequest: input.aiRequest ?? null,
    toolCalls: input.toolCalls ?? null,
    error: input.error ?? null,
    createdAt: new Date().toISOString(),
  };

  if (!isSupabaseServiceRoleConfigured()) {
    return record;
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    await supabase.from(TABLE).insert({
      id: record.id,
      plan_id: record.planId,
      step_id: record.stepId,
      user_id: record.userId,
      workspace_id: record.workspaceId,
      module: record.module,
      action_id: record.actionId,
      action_name: record.actionName,
      before_state: record.beforeState ?? {},
      after_state: record.afterState ?? {},
      result: record.result,
      duration_ms: record.durationMs,
      ai_request: record.aiRequest,
      tool_calls: record.toolCalls ?? [],
      error: record.error,
      created_at: record.createdAt,
    });
  } catch {
    // Audit must not break execution; caller still receives the in-memory record.
  }

  return record;
}

export async function listActionAuditForUser(input: {
  userId: string;
  workspaceId?: string | null;
  limit?: number;
}): Promise<AssistantActionAuditRecord[]> {
  if (!isSupabaseServiceRoleConfigured()) return [];
  const supabase = createSupabaseServiceRoleClient();
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 40);
  if (input.workspaceId) {
    query = query.eq("workspace_id", input.workspaceId);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    planId: (row.plan_id as string | null) ?? null,
    stepId: (row.step_id as string | null) ?? null,
    userId: String(row.user_id),
    workspaceId: (row.workspace_id as string | null) ?? null,
    module: String(row.module),
    actionId: String(row.action_id),
    actionName: String(row.action_name),
    beforeState: (row.before_state as Record<string, unknown> | null) ?? null,
    afterState: (row.after_state as Record<string, unknown> | null) ?? null,
    result: row.result as AssistantActionAuditRecord["result"],
    durationMs: (row.duration_ms as number | null) ?? null,
    aiRequest: (row.ai_request as string | null) ?? null,
    toolCalls: (row.tool_calls as unknown[] | null) ?? null,
    error: (row.error as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
}

/**
 * Durable + in-memory storage for action plans awaiting confirmation / execution.
 */

import {
  createSupabaseServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";
import type { AssistantActionPlan } from "./types";

const TABLE = "executive_assistant_action_plans";
const memory = new Map<string, AssistantActionPlan>();
const MAX_MEMORY = 80;

const log = (...args: unknown[]) => {
  console.info("[action-plan-store]", ...args);
};

function touchMemory(plan: AssistantActionPlan) {
  memory.set(plan.id, plan);
  if (memory.size > MAX_MEMORY) {
    const oldest = [...memory.entries()].sort((a, b) =>
      a[1].createdAt.localeCompare(b[1].createdAt),
    )[0];
    if (oldest) memory.delete(oldest[0]);
  }
  return plan;
}

function mapRow(row: Record<string, unknown>): AssistantActionPlan {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    workspaceId: (row.workspace_id as string | null) ?? null,
    organisationId: (row.organisation_id as string | null) ?? null,
    conversationId: (row.conversation_id as string | null) ?? null,
    status: row.status as AssistantActionPlan["status"],
    title: String(row.title ?? "Action plan"),
    summary: String(row.summary ?? ""),
    aiRequest: (row.ai_request as string | null) ?? null,
    steps: Array.isArray(row.steps) ? (row.steps as AssistantActionPlan["steps"]) : [],
    warnings: Array.isArray(row.warnings) ? (row.warnings as string[]) : [],
    permissionNotes: Array.isArray(row.permission_notes)
      ? (row.permission_notes as string[])
      : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

export async function saveActionPlan(plan: AssistantActionPlan): Promise<AssistantActionPlan> {
  touchMemory(plan);
  log("save", plan.id, "status=", plan.status, "steps=", plan.steps.length);

  if (!isSupabaseServiceRoleConfigured()) {
    log(
      "WARN durable store unavailable (service role not configured) — plan is memory-only and will be lost across serverless isolates",
      plan.id,
    );
    return plan;
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.from(TABLE).upsert({
      id: plan.id,
      user_id: plan.userId,
      workspace_id: plan.workspaceId,
      organisation_id: plan.organisationId,
      conversation_id: plan.conversationId,
      status: plan.status,
      title: plan.title,
      summary: plan.summary,
      ai_request: plan.aiRequest,
      steps: plan.steps,
      warnings: plan.warnings,
      permission_notes: plan.permissionNotes,
      created_at: plan.createdAt,
      updated_at: plan.updatedAt,
      completed_at: plan.completedAt ?? null,
    });

    if (error) {
      // Do not hard-fail propose — confirmation UI still needs the in-memory plan.
      // Execute MUST rehydrate from the client snapshot when durable get misses
      // (serverless isolate boundary / missing migration 109).
      console.error(
        "[action-plan-store] upsert failed — plan is memory-only until approve rehydrates",
        plan.id,
        error.message,
        error.code,
      );
      return plan;
    }
    log("save durable ok", plan.id);
  } catch (error) {
    console.error(
      "[action-plan-store] upsert exception — plan is memory-only until approve rehydrates",
      plan.id,
      error,
    );
    return plan;
  }

  return plan;
}

export async function getActionPlan(
  planId: string,
  userId: string,
): Promise<AssistantActionPlan | null> {
  const cached = memory.get(planId);
  if (cached && cached.userId === userId) {
    log("get memory hit", planId);
    return cached;
  }

  if (!isSupabaseServiceRoleConfigured()) {
    log("get miss — no durable store", planId);
    return null;
  }
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", planId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[action-plan-store] get failed", planId, error.message);
      return null;
    }
    if (!data) {
      log("get durable miss", planId, "user=", userId);
      return null;
    }
    log("get durable hit", planId);
    return touchMemory(mapRow(data as Record<string, unknown>));
  } catch (error) {
    console.error("[action-plan-store] get exception", planId, error);
    return null;
  }
}

/** Rehydrate a proposed plan into memory + durable store (approve fallback). */
export async function putActionPlan(plan: AssistantActionPlan): Promise<AssistantActionPlan> {
  return saveActionPlan(plan);
}

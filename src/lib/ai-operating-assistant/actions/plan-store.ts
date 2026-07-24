/**
 * Durable + in-memory storage for action plans awaiting confirmation / execution.
 */

import {
  createSupabaseServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";
import { eaStop, getEaCorrelationId } from "../ea-forensic-trace";
import type { AssistantActionPlan } from "./types";

const TABLE = "executive_assistant_action_plans";
const memory = new Map<string, AssistantActionPlan>();
const MAX_MEMORY = 80;

export type PlanLoadSource = "memory" | "database" | "rehydrated" | "miss";

export type SaveActionPlanResult = {
  plan: AssistantActionPlan;
  storedSuccessfully: boolean;
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

export async function saveActionPlan(plan: AssistantActionPlan): Promise<SaveActionPlanResult> {
  touchMemory(plan);

  if (!isSupabaseServiceRoleConfigured()) {
    eaStop("Plan created / store", "service role not configured — memory-only", {
      planId: plan.id,
      storedSuccessfully: false,
    });
    return { plan, storedSuccessfully: false };
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
      eaStop("Plan created / store", `durable upsert failed: ${error.message}`, {
        planId: plan.id,
        code: error.code,
        storedSuccessfully: false,
        correlationId: getEaCorrelationId(),
      });
      return { plan, storedSuccessfully: false };
    }

    return { plan, storedSuccessfully: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    eaStop("Plan created / store", `durable upsert exception: ${message}`, {
      planId: plan.id,
      storedSuccessfully: false,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { plan, storedSuccessfully: false };
  }
}

export async function getActionPlan(
  planId: string,
  userId: string,
): Promise<AssistantActionPlan | null> {
  const loaded = await loadActionPlan(planId, userId);
  return loaded.plan;
}

export async function loadActionPlan(
  planId: string,
  userId: string,
): Promise<{ plan: AssistantActionPlan | null; source: PlanLoadSource }> {
  const cached = memory.get(planId);
  if (cached && cached.userId === userId) {
    return { plan: cached, source: "memory" };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return { plan: null, source: "miss" };
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
      eaStop("Plan loaded", `database get failed: ${error.message}`, {
        planId,
        userId,
      });
      return { plan: null, source: "miss" };
    }
    if (!data) {
      return { plan: null, source: "miss" };
    }
    return { plan: touchMemory(mapRow(data as Record<string, unknown>)), source: "database" };
  } catch (error) {
    eaStop("Plan loaded", `database get exception: ${error instanceof Error ? error.message : String(error)}`, {
      planId,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { plan: null, source: "miss" };
  }
}

/** Rehydrate a proposed plan into memory + durable store (approve fallback). */
export async function putActionPlan(plan: AssistantActionPlan): Promise<AssistantActionPlan> {
  const { plan: saved } = await saveActionPlan(plan);
  return saved;
}

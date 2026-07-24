/**
 * Goal plan persistence — memory + optional Supabase (service role).
 */

import {
  createSupabaseServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";
import type { PlanningGoal } from "./types";

const TABLE = "executive_assistant_goal_plans";
const memory = new Map<string, PlanningGoal>();
const MAX_MEMORY = 80;

function trimMemory() {
  if (memory.size <= MAX_MEMORY) return;
  const oldest = [...memory.values()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  for (const plan of oldest.slice(0, memory.size - MAX_MEMORY)) {
    memory.delete(plan.id);
  }
}

export async function saveGoalPlan(plan: PlanningGoal): Promise<PlanningGoal> {
  memory.set(plan.id, plan);
  trimMemory();

  if (!isSupabaseServiceRoleConfigured()) return plan;

  try {
    const supabase = createSupabaseServiceRoleClient();
    await supabase.from(TABLE).upsert({
      id: plan.id,
      user_id: plan.userId,
      workspace_id: plan.workspaceId,
      organisation_id: plan.organisationId,
      conversation_id: plan.conversationId,
      goal: plan.goal,
      status: plan.status,
      title: plan.title,
      business_impact: plan.businessImpact,
      steps: plan.steps,
      graph: plan.graph,
      warnings: plan.warnings,
      permission_notes: plan.permissionNotes,
      estimated_duration_ms: plan.estimatedDurationMs,
      risk_level: plan.riskLevel,
      rollback_available: plan.rollbackAvailable,
      confirmation_required: plan.confirmationRequired,
      action_plan_id: plan.actionPlanId,
      audit_reference: plan.auditReference,
      started_at: plan.startedAt ?? null,
      completed_at: plan.completedAt ?? null,
      duration_ms: plan.durationMs ?? null,
      planner_source: plan.plannerSource,
      discovered_action_ids: plan.discoveredActionIds,
      created_at: plan.createdAt,
      updated_at: plan.updatedAt,
    });
  } catch {
    // Memory remains source of truth when DB unavailable.
  }

  return plan;
}

export async function getGoalPlan(
  goalId: string,
  userId: string,
): Promise<PlanningGoal | null> {
  const cached = memory.get(goalId);
  if (cached && cached.userId === userId) return cached;

  if (!isSupabaseServiceRoleConfigured()) return null;

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    const plan = mapRow(data as Record<string, unknown>);
    memory.set(plan.id, plan);
    return plan;
  } catch {
    return null;
  }
}

function mapRow(row: Record<string, unknown>): PlanningGoal {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    workspaceId: (row.workspace_id as string | null) ?? null,
    organisationId: (row.organisation_id as string | null) ?? null,
    conversationId: (row.conversation_id as string | null) ?? null,
    goal: String(row.goal ?? ""),
    status: row.status as PlanningGoal["status"],
    title: String(row.title ?? "Goal plan"),
    businessImpact: String(row.business_impact ?? ""),
    steps: (row.steps as PlanningGoal["steps"]) ?? [],
    graph: (row.graph as PlanningGoal["graph"]) ?? {
      nodes: [],
      edges: [],
      waves: [],
      parallelGroups: {},
    },
    warnings: (row.warnings as string[]) ?? [],
    permissionNotes: (row.permission_notes as string[]) ?? [],
    estimatedDurationMs: Number(row.estimated_duration_ms ?? 0),
    riskLevel: (row.risk_level as PlanningGoal["riskLevel"]) ?? "low",
    rollbackAvailable: Boolean(row.rollback_available),
    confirmationRequired: row.confirmation_required !== false,
    actionPlanId: (row.action_plan_id as string | null) ?? null,
    auditReference: (row.audit_reference as string | null) ?? null,
    startedAt: (row.started_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    durationMs: (row.duration_ms as number | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    plannerSource: (row.planner_source as PlanningGoal["plannerSource"]) ?? "heuristic",
    discoveredActionIds: (row.discovered_action_ids as string[]) ?? [],
  };
}

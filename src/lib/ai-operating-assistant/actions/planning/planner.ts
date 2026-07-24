/**
 * Planning Engine — turns a natural-language goal into an execution graph
 * by discovering registered Action Framework actions (no module hardcoding).
 */

import type { AssistantBusinessContext } from "../../types";
import {
  createAssistantResponse,
  formatOpenAIError,
  getAssistantModel,
} from "../../openai-client";
import { describeMissingPermissions, userHasActionPermissions } from "../permissions";
import { getAssistantAction, listAssistantActionDescriptors } from "../registry";
import {
  buildExecutionGraph,
  estimatePlanDurationMs,
  highestRisk,
} from "./graph";
import { saveGoalPlan } from "./goal-store";
import type {
  PlanningCondition,
  PlanningGoal,
  PlanningRiskLevel,
  PlanningRollbackStrategy,
  PlanningStep,
} from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type DraftStep = {
  actionId: string;
  reason: string;
  input?: Record<string, unknown>;
  dependsOnIndexes?: number[];
  parallelGroup?: string | null;
  condition?: PlanningCondition | null;
  estimatedDurationMs?: number;
  riskLevel?: PlanningRiskLevel;
  maxRetries?: number;
};

function defaultDurationForAction(actionId: string): number {
  if (/create|merge|provision/i.test(actionId)) return 4000;
  if (/notify|email|generate/i.test(actionId)) return 2500;
  if (/assign|update|add|remove/i.test(actionId)) return 2000;
  if (/archive|restore/i.test(actionId)) return 1500;
  return 3000;
}

function defaultRisk(actionId: string, undoCapable: boolean): PlanningRiskLevel {
  if (/merge|delete|remove|archive/i.test(actionId)) return "high";
  if (/create|assign|update/i.test(actionId)) return undoCapable ? "medium" : "high";
  return "low";
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scoreAction(
  goalTokens: string[],
  descriptor: { id: string; name: string; description: string; module: string },
): number {
  const hay = `${descriptor.id} ${descriptor.name} ${descriptor.description} ${descriptor.module}`.toLowerCase();
  let score = 0;
  for (const token of goalTokens) {
    if (hay.includes(token)) score += 2;
  }
  // Verb affinity from goal language → action id verbs (generic, not module-specific).
  const verbPairs: Array<[RegExp, RegExp]> = [
    [/\b(open|create|add|new|setup|set\s*up|provision|onboard)\b/i, /create|add|provision/i],
    [/\b(hire|recruit)\b/i, /create|add|hire|recruit/i],
    [/\b(assign|appoint)\b/i, /assign/i],
    [/\b(notify|tell|email|alert)\b/i, /notify|email|alert/i],
    [/\b(budget|finance)\b/i, /budget|finance|procure/i],
    [/\b(merge|combine|dedupe)\b/i, /merge/i],
    [/\b(archive|close|deactivate)\b/i, /archive/i],
    [/\b(restore|reactivate|unarchive)\b/i, /restore/i],
    [/\b(update|change|set|edit)\b/i, /update|assign/i],
  ];
  for (const [goalRe, actionRe] of verbPairs) {
    if (goalRe.test(goalTokens.join(" ")) && actionRe.test(descriptor.id)) score += 3;
  }
  return score;
}

/**
 * Heuristic planner — ranks discoverable actions against the goal text.
 * No module-specific workflows; future registrations participate automatically.
 */
function planHeuristic(
  goal: string,
  descriptors: ReturnType<typeof listAssistantActionDescriptors>,
): { drafts: DraftStep[]; source: "heuristic" } {
  const tokens = tokenize(goal);
  const scored = descriptors
    .map((descriptor) => ({
      descriptor,
      score: scoreAction(tokens, descriptor),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, Math.min(8, Math.max(1, scored.length)));
  if (!selected.length) {
    return { drafts: [], source: "heuristic" };
  }

  // Order: create/add → update/assign → notify/generate (generic verb tiers).
  const tier = (id: string) => {
    if (/create|add|provision/i.test(id)) return 0;
    if (/update|assign|add.*contact|location/i.test(id)) return 1;
    if (/notify|email|generate|report/i.test(id)) return 2;
    return 1;
  };
  selected.sort((a, b) => tier(a.descriptor.id) - tier(b.descriptor.id) || b.score - a.score);

  const drafts: DraftStep[] = selected.map((row, index) => {
    const id = row.descriptor.id;
    const isCreate = /create|add|provision/i.test(id);
    const dependsOnIndexes =
      index === 0 || isCreate
        ? []
        : selected
            .map((s, i) => i)
            .filter((i) => i < index && /create|add|provision/i.test(selected[i]!.descriptor.id))
            .slice(-1);

    // Independent mid-tier actions after first create can share a parallel group.
    const parallelGroup =
      !isCreate &&
      dependsOnIndexes.length > 0 &&
      /update|assign|notify|budget|project|procure/i.test(id)
        ? "wave_after_create"
        : null;

    const condition: PlanningCondition | null = isCreate
      ? {
          kind: "skip_if_validation_warnings_match",
          pattern: "duplicate|already exists|already archived|potential duplicate",
        }
      : null;

    return {
      actionId: id,
      reason: `Matched goal terms against registered action “${row.descriptor.name}” (score ${row.score}).`,
      input: extractLooseInput(goal, row.descriptor),
      dependsOnIndexes,
      parallelGroup,
      condition,
      estimatedDurationMs: defaultDurationForAction(id),
      riskLevel: defaultRisk(id, row.descriptor.undoCapable),
      maxRetries: /create|update|assign/i.test(id) ? 2 : 1,
    };
  });

  return { drafts, source: "heuristic" };
}

function extractLooseInput(
  goal: string,
  descriptor: { id: string; inputSchema?: Record<string, unknown> },
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  const quoted = goal.match(/[“"']([^”"']+)[”"']/);
  const named = goal.match(
    /(?:called|named|for|titled)\s+([A-Z][\w\s&.'-]{1,60}?)(?:\.|$|,)/i,
  );
  const entity = (quoted?.[1] || named?.[1] || "").trim();

  const schema = descriptor.inputSchema;
  const props =
    schema && typeof schema === "object" && "properties" in schema
      ? (schema.properties as Record<string, unknown>)
      : {};

  if (entity) {
    if ("companyName" in props) input.companyName = entity;
    else if ("clientName" in props) input.clientName = entity;
    else if ("name" in props) input.name = entity;
    else if ("title" in props) input.title = entity;
    else input.goalEntity = entity;
  }

  // Pass full goal for handlers that accept free-text notes/request.
  if ("notes" in props) input.notes = `Goal: ${goal}`;
  if ("request" in props) input.request = goal;

  return input;
}

async function planWithLlm(
  goal: string,
  business: AssistantBusinessContext,
  descriptors: ReturnType<typeof listAssistantActionDescriptors>,
): Promise<{ drafts: DraftStep[]; source: "llm" } | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null;
  if (!descriptors.length) return null;

  const catalog = descriptors.map((d) => ({
    id: d.id,
    name: d.name,
    module: d.module,
    description: d.description,
    inputSchema: d.inputSchema ?? null,
    confirmationRequired: d.confirmationRequired,
    undoCapable: d.undoCapable,
  }));

  try {
    const response = await createAssistantResponse({
      model: getAssistantModel(),
      instructions: `You are the Unit311 Planning Engine. Given a business goal and a catalogue of registered actions, propose an execution plan as JSON.
Rules:
- ONLY use actionIds from the catalogue. Never invent actions.
- Prefer the fewest steps that achieve the goal.
- Express dependencies with dependsOnIndexes (0-based indexes into your steps array).
- Use the same parallelGroup string for steps that can run concurrently after shared deps.
- For create-like actions that may already exist, set condition { "kind": "skip_if_validation_warnings_match", "pattern": "duplicate|already exists" }.
- Fill input using schema fields when possible from the goal text.
- Return JSON: { "title": string, "businessImpact": string, "steps": [{ "actionId", "reason", "input", "dependsOnIndexes", "parallelGroup", "condition", "estimatedDurationMs", "riskLevel", "maxRetries" }] }`,
      input: [
        {
          role: "user",
          content: JSON.stringify({
            goal,
            workspace: business.workspace,
            page: business.page,
            catalogue: catalog,
          }),
        },
      ],
      text: {
        format: { type: "json_object" as const },
      },
      store: false,
    });

    const text =
      typeof (response as { output_text?: string }).output_text === "string"
        ? (response as { output_text: string }).output_text
        : "";
    if (!text.trim()) return null;
    const parsed = JSON.parse(text) as {
      title?: string;
      businessImpact?: string;
      steps?: DraftStep[];
    };
    const drafts = (parsed.steps ?? []).filter((step) =>
      descriptors.some((d) => d.id === step.actionId),
    );
    if (!drafts.length) return null;
    return { drafts, source: "llm" };
  } catch (error) {
    console.warn("[planning] LLM planner failed:", formatOpenAIError(error));
    return null;
  }
}

function materialiseSteps(
  drafts: DraftStep[],
  business: AssistantBusinessContext,
): { steps: PlanningStep[]; permissionNotes: string[]; warnings: string[] } {
  const permissionNotes: string[] = [];
  const warnings: string[] = [];
  const steps: PlanningStep[] = [];
  const draftIndexToStepId = new Map<number, string>();

  for (let i = 0; i < drafts.length; i += 1) {
    const draft = drafts[i]!;
    const definition = getAssistantAction(draft.actionId);
    if (!definition) {
      warnings.push(`Unknown action skipped: ${draft.actionId}`);
      continue;
    }
    draftIndexToStepId.set(i, createId("gstep"));
  }

  for (let i = 0; i < drafts.length; i += 1) {
    const draft = drafts[i]!;
    const definition = getAssistantAction(draft.actionId);
    const stepId = draftIndexToStepId.get(i);
    if (!definition || !stepId) continue;

    const missing = describeMissingPermissions(business, definition.requiredPermissions);
    if (missing.length) {
      permissionNotes.push(...missing.map((note) => `${definition.name}: ${note}`));
    }
    if (!userHasActionPermissions(business, definition.requiredPermissions)) {
      warnings.push(`Insufficient permissions for ${definition.name}`);
    }

    const dependsOnStepIds = (draft.dependsOnIndexes ?? [])
      .map((idx) => draftIndexToStepId.get(idx))
      .filter((id): id is string => Boolean(id));

    const rollbackStrategy: PlanningRollbackStrategy = definition.undoCapable
      ? "handler"
      : "none";

    const executionModes: PlanningStep["executionModes"] = ["sequential"];
    if (draft.parallelGroup) executionModes.push("parallel");
    if (draft.condition) executionModes.push("conditional");
    if ((draft.maxRetries ?? 0) > 0) executionModes.push("retryable");

    steps.push({
      id: stepId,
      actionId: definition.id,
      name: definition.name,
      module: definition.module,
      reason: draft.reason || definition.description,
      input: draft.input ?? {},
      dependsOnStepIds,
      parallelGroupId: draft.parallelGroup ?? null,
      condition: draft.condition ?? null,
      estimatedDurationMs: draft.estimatedDurationMs ?? defaultDurationForAction(definition.id),
      rollbackStrategy,
      confirmationRequired: definition.confirmationRequired,
      riskLevel: draft.riskLevel ?? defaultRisk(definition.id, definition.undoCapable),
      maxRetries: Math.max(0, draft.maxRetries ?? (definition.undoCapable ? 2 : 1)),
      retryBackoffMs: 600,
      executionModes,
      status: "pending",
      attempt: 0,
      result: null,
      preview: null,
      validation: null,
    });
  }

  return { steps, permissionNotes, warnings };
}

async function enrichPreviews(
  steps: PlanningStep[],
  business: AssistantBusinessContext,
  goalId: string,
): Promise<PlanningStep[]> {
  const enriched: PlanningStep[] = [];
  for (const step of steps) {
    const definition = getAssistantAction(step.actionId);
    if (!definition) {
      enriched.push({
        ...step,
        status: "failed",
        error: `Unknown action: ${step.actionId}`,
        validation: { ok: false, errors: [`Unknown action: ${step.actionId}`], warnings: [] },
      });
      continue;
    }
    const ctx = {
      business,
      planId: goalId,
      stepId: step.id,
      priorOutputs: {},
    };
    try {
      const validation = await definition.handler.validate(step.input, ctx);
      const preview = validation.ok
        ? await definition.handler.preview(step.input, ctx)
        : null;
      enriched.push({
        ...step,
        validation,
        preview: preview
          ? {
              summary: preview.summary,
              affectedRecords: preview.affectedRecords,
              warnings: preview.warnings,
              reversible: preview.reversible,
            }
          : null,
        status: validation.ok ? "pending" : "failed",
        error: validation.ok ? null : validation.errors.join("; "),
      });
    } catch (error) {
      enriched.push({
        ...step,
        status: "failed",
        error: error instanceof Error ? error.message : "Preview failed",
        validation: {
          ok: false,
          errors: [error instanceof Error ? error.message : "Preview failed"],
          warnings: [],
        },
      });
    }
  }
  return enriched;
}

export type PlanBusinessGoalInput = {
  business: AssistantBusinessContext;
  goal: string;
  conversationId?: string | null;
  title?: string | null;
  /** Prefer LLM when available; always falls back to heuristic discovery. */
  preferLlm?: boolean;
};

/**
 * Build a Goal plan + execution graph from natural language + registry discovery.
 */
export async function planBusinessGoal(
  input: PlanBusinessGoalInput,
): Promise<{ plan: PlanningGoal; blocked: boolean; blockReason?: string }> {
  const goalText = input.goal.trim();
  const now = new Date().toISOString();
  const goalId = createId("goal");

  if (!goalText) {
    const empty: PlanningGoal = {
      id: goalId,
      userId: input.business.user.id,
      workspaceId: input.business.workspace.id,
      organisationId: input.business.organisation.id,
      conversationId: input.conversationId ?? null,
      goal: "",
      status: "failed",
      title: "Empty goal",
      businessImpact: "No goal provided.",
      steps: [],
      graph: { nodes: [], edges: [], waves: [], parallelGroups: {} },
      warnings: ["Goal text is required."],
      permissionNotes: [],
      estimatedDurationMs: 0,
      riskLevel: "low",
      rollbackAvailable: false,
      confirmationRequired: true,
      actionPlanId: null,
      auditReference: null,
      createdAt: now,
      updatedAt: now,
      plannerSource: "heuristic",
      discoveredActionIds: [],
    };
    await saveGoalPlan(empty);
    return { plan: empty, blocked: true, blockReason: "Goal text is required." };
  }

  const descriptors = listAssistantActionDescriptors({ business: input.business });
  const discoveredActionIds = descriptors.map((d) => d.id);

  if (!descriptors.length) {
    const empty: PlanningGoal = {
      id: goalId,
      userId: input.business.user.id,
      workspaceId: input.business.workspace.id,
      organisationId: input.business.organisation.id,
      conversationId: input.conversationId ?? null,
      goal: goalText,
      status: "failed",
      title: input.title?.trim() || "Goal plan",
      businessImpact: "No registered actions are available for this user.",
      steps: [],
      graph: { nodes: [], edges: [], waves: [], parallelGroups: {} },
      warnings: ["Action registry is empty for this user’s permissions."],
      permissionNotes: [],
      estimatedDurationMs: 0,
      riskLevel: "low",
      rollbackAvailable: false,
      confirmationRequired: true,
      actionPlanId: null,
      auditReference: null,
      createdAt: now,
      updatedAt: now,
      plannerSource: "heuristic",
      discoveredActionIds,
    };
    await saveGoalPlan(empty);
    return {
      plan: empty,
      blocked: true,
      blockReason: "No registered actions available to plan against.",
    };
  }

  let drafts: DraftStep[] = [];
  let plannerSource: PlanningGoal["plannerSource"] = "heuristic";

  if (input.preferLlm !== false) {
    const llm = await planWithLlm(goalText, input.business, descriptors);
    if (llm?.drafts.length) {
      drafts = llm.drafts;
      plannerSource = "llm";
    }
  }

  if (!drafts.length) {
    const heuristic = planHeuristic(goalText, descriptors);
    drafts = heuristic.drafts;
    plannerSource = plannerSource === "llm" ? "hybrid" : "heuristic";
  }

  const { steps: rawSteps, permissionNotes, warnings } = materialiseSteps(
    drafts,
    input.business,
  );
  const steps = await enrichPreviews(rawSteps, input.business, goalId);
  const graph = buildExecutionGraph(steps);
  const anyHardFail = steps.some(
    (step) => step.status === "failed" && !step.validation?.warnings.length,
  );
  const blockedByPermissions = permissionNotes.length > 0 && steps.every((s) => s.status === "failed");

  const plan: PlanningGoal = {
    id: goalId,
    userId: input.business.user.id,
    workspaceId: input.business.workspace.id,
    organisationId: input.business.organisation.id,
    conversationId: input.conversationId ?? null,
    goal: goalText,
    status: blockedByPermissions || (!steps.length && warnings.length) ? "failed" : "proposed",
    title: input.title?.trim() || summariseTitle(goalText, steps),
    businessImpact: summariseImpact(goalText, steps),
    steps,
    graph,
    warnings: [...new Set([...warnings, ...steps.flatMap((s) => s.preview?.warnings ?? [])])],
    permissionNotes: [...new Set(permissionNotes)],
    estimatedDurationMs: estimatePlanDurationMs(steps),
    riskLevel: highestRisk(steps.map((s) => s.riskLevel)),
    rollbackAvailable: steps.some((s) => s.rollbackStrategy === "handler"),
    confirmationRequired: true,
    actionPlanId: null,
    auditReference: null,
    createdAt: now,
    updatedAt: now,
    plannerSource,
    discoveredActionIds,
  };

  await saveGoalPlan(plan);

  if (!steps.length) {
    return {
      plan,
      blocked: true,
      blockReason: "Planner could not match the goal to any registered actions.",
    };
  }

  if (blockedByPermissions) {
    return {
      plan,
      blocked: true,
      blockReason: "Permissions block one or more planned actions.",
    };
  }

  void anyHardFail;
  return { plan, blocked: false };
}

function summariseTitle(goal: string, steps: PlanningStep[]): string {
  if (steps.length === 1) return steps[0]!.name;
  if (steps.length > 1) return `${goal.slice(0, 48)}${goal.length > 48 ? "…" : ""}`;
  return goal.slice(0, 60) || "Goal plan";
}

function summariseImpact(goal: string, steps: PlanningStep[]): string {
  const modules = [...new Set(steps.map((s) => s.module))];
  return `Achieves “${goal}” via ${steps.length} registered action${
    steps.length === 1 ? "" : "s"
  } across ${modules.length || 0} module${modules.length === 1 ? "" : "s"} (${modules.join(", ") || "none"}).`;
}

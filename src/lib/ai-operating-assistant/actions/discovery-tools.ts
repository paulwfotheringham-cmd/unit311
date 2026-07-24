/**
 * OpenAI-discoverable tools that expose the Action Framework / Capability Graph.
 * Domain knowledge lives only in registered action capability metadata.
 */

import { asString, toolOk, type AssistantToolExecutionContext } from "../tool-result";
import {
  buildActionPlan,
  toConfirmationView,
  type ProposedActionStepInput,
} from "./execution-pipeline";
import { listAssistantActionDescriptors } from "./registry";
import {
  answerCapabilityQuestion,
  buildCapabilityGraph,
  listCapabilities,
  searchCapabilities,
} from "./capability-service";

export async function listBusinessActionsTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const { ensureActionModulesRegistered } = await import(
    "@/lib/ai-operating-assistant/action-orchestration"
  );
  ensureActionModulesRegistered();

  const moduleFilter = asString(args.module) as
    | import("./types").AssistantActionModule
    | undefined;
  const capabilities = listCapabilities({
    business: ctx.business,
    module: moduleFilter,
  });
  const descriptors = listAssistantActionDescriptors({
    business: ctx.business,
    module: moduleFilter,
  });
  const graph = buildCapabilityGraph();

  return toolOk("listBusinessActions", capabilities, {
    source: ["assistant:capability-service"],
    pageSize: capabilities.length || 1,
    summary: {
      count: capabilities.length,
      statements: capabilities.map((c) => c.statement),
      note:
        capabilities.length === 0
          ? "Capability Graph is empty. Register actions with capability metadata."
          : "Capabilities discovered from the Action Registry / Capability Graph.",
      modules: [...new Set(capabilities.map((d) => d.module))],
      businessObjects: [...new Set(capabilities.map((d) => d.businessObject))],
      relationshipCount: graph.edges.length,
      descriptors,
    },
    dataGaps:
      capabilities.length === 0
        ? ["No domain action handlers registered yet."]
        : undefined,
  });
}

export async function searchCapabilitiesTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const { ensureActionModulesRegistered } = await import(
    "@/lib/ai-operating-assistant/action-orchestration"
  );
  ensureActionModulesRegistered();

  const query = asString(args.query) || asString(args.question) || "";
  if (!query.trim()) {
    const answered = answerCapabilityQuestion("What can you do?", {
      business: ctx.business,
    });
    return toolOk(
      "searchCapabilities",
      answered?.capabilities ?? listCapabilities({ business: ctx.business }),
      {
        source: ["assistant:capability-service"],
        pageSize: answered?.capabilities.length || 1,
        summary: {
          kind: answered?.kind ?? "catalogue",
          answer: answered?.answer ?? "",
          statements: answered?.statements ?? [],
        },
      },
    );
  }

  const answered = answerCapabilityQuestion(query, { business: ctx.business });
  if (answered) {
    return toolOk("searchCapabilities", answered.capabilities, {
      source: ["assistant:capability-service"],
      pageSize: answered.capabilities.length || 1,
      summary: {
        kind: answered.kind,
        answer: answered.answer,
        statements: answered.statements,
      },
    });
  }

  const hits = searchCapabilities(query, { business: ctx.business });
  return toolOk(
    "searchCapabilities",
    hits.map((h) => ({ ...h.capability, score: h.score, matchedOn: h.matchedOn })),
    {
      source: ["assistant:capability-service"],
      pageSize: hits.length || 1,
      summary: {
        kind: hits.length ? "search" : "unsupported",
        answer: hits.length
          ? hits.map((h) => h.capability.statement).join("\n")
          : "No matching capabilities in the Action Registry.",
        statements: hits.map((h) => h.capability.statement),
      },
    },
  );
}

export async function proposeBusinessActionPlanTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const { ensureActionModulesRegistered } = await import(
    "@/lib/ai-operating-assistant/action-orchestration"
  );
  ensureActionModulesRegistered();

  const aiRequest = asString(args.request) || asString(args.question) || null;
  const title = asString(args.title) || null;
  const conversationId = asString(args.conversationId) || null;
  const rawSteps = Array.isArray(args.steps) ? args.steps : [];

  const steps: ProposedActionStepInput[] = [];
  for (const entry of rawSteps) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const actionId = asString(row.actionId) || asString(row.id);
    if (!actionId) continue;
    steps.push({
      actionId,
      input:
        row.input && typeof row.input === "object"
          ? (row.input as Record<string, unknown>)
          : {},
      dependsOnStepIds: Array.isArray(row.dependsOnStepIds)
        ? row.dependsOnStepIds.filter((id): id is string => typeof id === "string")
        : undefined,
    });
  }

  const { plan, blocked, blockReason } = await buildActionPlan({
    business: ctx.business,
    steps,
    aiRequest,
    conversationId,
    title,
  });

  return toolOk(
    "proposeBusinessActionPlan",
    [
      {
        planId: plan.id,
        confirmation: toConfirmationView(plan),
        blocked,
        blockReason: blockReason ?? null,
      },
    ],
    {
      source: ["assistant:action-pipeline"],
      pageSize: 1,
      summary: {
        planId: plan.id,
        status: plan.status,
        stepCount: plan.steps.length,
        requiresConfirmation: plan.status === "proposed",
        blocked,
        message: blocked
          ? blockReason
          : "Ready — approve in the Plan Viewer to complete this.",
      },
      followUpActions:
        plan.status === "proposed"
          ? [
              {
                id: `confirm_plan_${plan.id}`,
                label: "Review & approve",
                kind: "confirm_action",
                actionId: plan.id,
                requiresConfirmation: true,
              },
            ]
          : undefined,
    },
  );
}

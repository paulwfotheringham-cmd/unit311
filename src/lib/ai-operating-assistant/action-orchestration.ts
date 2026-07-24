/**
 * Executive Assistant orchestration — intent → correct knowledge domain → execute → report.
 *
 * Permanent foundation: three independent knowledge domains (see knowledge-domains.ts).
 *   PLATFORM   → Application Catalogue
 *   CAPABILITY → Action Registry
 *   BUSINESS   → Live data tools
 * Write requests use the Action Framework (propose → Plan Viewer → execute).
 */

import type { AssistantBusinessContext, AssistantChatMessage } from "./types";
import type { DirectAssistantIntent } from "./intent-router";
import { resolveDirectIntent } from "./intent-router";
import { registerAllActionModules } from "./actions/register-all-modules";
import { getAssistantAction } from "./actions/registry";
import {
  answerCapabilityQuestion,
  isCapabilityQuestion,
} from "./actions/capability-service";
import { resolveBusinessActionIntent } from "./intent-action-resolver";
import { formatActionSuccess, formatPlanReadyMessage } from "./action-ui-messages";
import {
  buildNeedInfoCards,
  buildReadWorkflowCards,
  matchCapabilityWorkflow,
  primaryWorkflowActionId,
} from "./capability-workflows";
import type { EaExecutionCard } from "./execution-cards";
import { buildNavigationCard, shortCardLead } from "./execution-cards";
import {
  answerPlatformQuestion,
  isPlatformQuestion,
} from "./application-catalogue";
import { classifyKnowledgeDomain } from "./knowledge-domains";
import { eaStage } from "./ea-forensic-trace";

export { formatActionSuccess, formatPlanReadyMessage };
/** @deprecated Prefer formatActionSuccess */
export { formatExecutedClientOutcome } from "./action-ui-messages";

let modulesBootstrapped = false;

/** Idempotent — safe on every turn / serverless invoke. */
export function ensureActionModulesRegistered() {
  registerAllActionModules();
  modulesBootstrapped = true;
  return modulesBootstrapped;
}

const MANUAL_GUIDANCE_TOOLS = new Set([
  "detectWorkflowIntent",
  "guideWorkflow",
  "getPageGuide",
  "startGuidedTour",
  "listWorkflows",
  "listPageGuides",
]);

export type OrchestrationRoute =
  | {
      kind: "tool";
      intent: DirectAssistantIntent;
      executionCards?: EaExecutionCard[];
    }
  | {
      kind: "need_info";
      message: string;
      actionId: string;
      missingFields: string[];
      input: Record<string, unknown>;
      executionCards: EaExecutionCard[];
    }
  | {
      kind: "capability_answer";
      message: string;
      executionCards?: EaExecutionCard[];
    }
  | {
      kind: "platform_answer";
      message: string;
      executionCards?: EaExecutionCard[];
    }
  | {
      kind: "workflow_read";
      message: string;
      executionCards: EaExecutionCard[];
    }
  | {
      kind: "none";
    };

function proposeSteps(
  actionId: string,
  input: Record<string, unknown>,
  request: string,
  reason: string,
): DirectAssistantIntent {
  const definition = getAssistantAction(actionId);
  return {
    tool: "proposeBusinessActionPlan",
    args: {
      request,
      title: definition?.name ?? actionId,
      steps: [{ actionId, input }],
    },
    reason,
  };
}

/**
 * Primary orchestration entry: classify knowledge domain, then route.
 */
export async function resolveOrchestrationRoute(
  message: string,
  history: AssistantChatMessage[],
  business: AssistantBusinessContext,
): Promise<OrchestrationRoute> {
  ensureActionModulesRegistered();

  const domain = classifyKnowledgeDomain(message);
  eaStage("Knowledge domain", {
    domain: domain.domain,
    reason: domain.reason,
    message,
  });

  // PLATFORM — Application Catalogue only (never Action Registry).
  if (domain.domain === "platform" || isPlatformQuestion(message)) {
    const answered = answerPlatformQuestion(message);
    if (answered) {
      const cards: EaExecutionCard[] = [];
      if (answered.navigateHref) {
        cards.push(
          buildNavigationCard({
            title: answered.navigateLabel ?? "Open module",
            body: "Platform navigation — Application Catalogue",
            href: answered.navigateHref,
            label: answered.navigateLabel ?? "Open",
          }),
        );
      }
      return {
        kind: "platform_answer",
        message: answered.answer,
        executionCards: cards.length ? cards : undefined,
      };
    }
  }

  // CAPABILITY — Action Registry / Capability Graph only (never Application Catalogue).
  if (domain.domain === "capability" || isCapabilityQuestion(message)) {
    const answered = answerCapabilityQuestion(message, { business });
    if (answered) {
      return { kind: "capability_answer", message: answered.answer };
    }
  }

  // BUSINESS — live data tools (deterministic read intents).
  if (domain.domain === "business") {
    const direct = resolveDirectIntent(message, history);
    if (
      direct &&
      direct.tool !== "proposeBusinessActionPlan" &&
      direct.tool !== "planBusinessGoal"
    ) {
      return { kind: "tool", intent: direct };
    }
  }

  // WRITE / multi-step capability workflows (COO orchestration presentation).
  const workflow = matchCapabilityWorkflow(message);
  if (workflow && domain.domain !== "business" && domain.domain !== "platform") {
    const primaryActionId = primaryWorkflowActionId(workflow);
    if (!primaryActionId) {
      const cards = buildReadWorkflowCards(workflow);
      return {
        kind: "workflow_read",
        message: shortCardLead(cards) || workflow.purpose,
        executionCards: cards,
      };
    }

    const businessIntent = await resolveBusinessActionIntent(message, business, history);
    if (businessIntent.kind === "need_info") {
      const cards = buildNeedInfoCards({
        actionId: businessIntent.actionId,
        message: businessIntent.question,
        missingFields: businessIntent.missingFields,
        prefill: businessIntent.input,
        workflow,
        business,
      });
      return {
        kind: "need_info",
        message: shortCardLead(cards) || businessIntent.question,
        actionId: businessIntent.actionId,
        missingFields: businessIntent.missingFields,
        input: businessIntent.input,
        executionCards: cards,
      };
    }

    const actionId =
      businessIntent.kind === "propose" ? businessIntent.actionId : primaryActionId;
    const input = businessIntent.kind === "propose" ? businessIntent.input : {};
    const cards = buildNeedInfoCards({
      actionId,
      message: workflow.purpose,
      missingFields: [],
      prefill: input,
      workflow,
      business,
    }).filter((card) => card.kind === "workflow");

    return {
      kind: "tool",
      intent: proposeSteps(
        actionId,
        input,
        message,
        businessIntent.kind === "propose"
          ? `workflow:${workflow.id}|${businessIntent.reason}|confidence=${businessIntent.confidence}`
          : `workflow:${workflow.id}`,
      ),
      executionCards: cards,
    };
  }

  // WRITE — registry-driven propose / need_info.
  if (domain.domain !== "platform" && domain.domain !== "capability") {
    const businessIntent = await resolveBusinessActionIntent(message, business, history);
    if (businessIntent.kind === "need_info") {
      const cards = buildNeedInfoCards({
        actionId: businessIntent.actionId,
        message: businessIntent.question,
        missingFields: businessIntent.missingFields,
        prefill: businessIntent.input,
        business,
      });
      return {
        kind: "need_info",
        message: shortCardLead(cards) || businessIntent.question,
        actionId: businessIntent.actionId,
        missingFields: businessIntent.missingFields,
        input: businessIntent.input,
        executionCards: cards,
      };
    }
    if (businessIntent.kind === "propose") {
      return {
        kind: "tool",
        intent: proposeSteps(
          businessIntent.actionId,
          businessIntent.input,
          message,
          `${businessIntent.reason}|confidence=${businessIntent.confidence}`,
        ),
      };
    }
  }

  // BUSINESS / other reads — deterministic tools (PDF, email, search*).
  const direct = resolveDirectIntent(message, history);
  if (direct?.tool === "proposeBusinessActionPlan" || direct?.tool === "planBusinessGoal") {
    return { kind: "tool", intent: direct };
  }
  if (direct) {
    return { kind: "tool", intent: direct };
  }

  return { kind: "none" };
}

/** @deprecated Prefer resolveOrchestrationRoute — writes are registry-only. */
export function resolveExecutableActionRoute(
  message: string,
  history: AssistantChatMessage[],
): DirectAssistantIntent | null {
  ensureActionModulesRegistered();
  return resolveDirectIntent(message, history);
}

export function isManualGuidanceTool(toolName: string): boolean {
  return MANUAL_GUIDANCE_TOOLS.has(toolName);
}

export async function redirectManualGuidanceToActionPlan(
  toolName: string,
  userMessage: string,
  business: AssistantBusinessContext,
): Promise<DirectAssistantIntent | null> {
  if (!isManualGuidanceTool(toolName)) return null;
  ensureActionModulesRegistered();
  const intent = await resolveBusinessActionIntent(userMessage, business, []);
  if (intent.kind !== "propose") return null;
  return proposeSteps(intent.actionId, intent.input, userMessage, "redirect_from_guidance");
}

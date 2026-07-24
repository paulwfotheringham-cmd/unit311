/**
 * Executive Assistant orchestration — intent → execute → report.
 *
 * Users speak naturally. Registered actions are discovered from the registry.
 * Workflow/page guidance never overrides an executable business action.
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
    }
  | {
      kind: "need_info";
      message: string;
      actionId: string;
    }
  | {
      kind: "capability_answer";
      message: string;
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
 * Primary orchestration entry: understand intent, map to registered action, propose execution.
 */
export async function resolveOrchestrationRoute(
  message: string,
  history: AssistantChatMessage[],
  business: AssistantBusinessContext,
): Promise<OrchestrationRoute> {
  ensureActionModulesRegistered();

  // 0) Capability catalogue / "can you …?" — answered from the Capability Graph only.
  if (isCapabilityQuestion(message)) {
    const answered = answerCapabilityQuestion(message, { business });
    if (answered) {
      return { kind: "capability_answer", message: answered.answer };
    }
  }

  // 1) Semantic write intent against the live action registry (meaning, not phrasing).
  const businessIntent = await resolveBusinessActionIntent(message, business);
  if (businessIntent.kind === "need_info") {
    return {
      kind: "need_info",
      message: businessIntent.question,
      actionId: businessIntent.actionId,
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

  // 2) Deterministic read/PDF/email intents (non-write).
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
  const intent = await resolveBusinessActionIntent(userMessage, business);
  if (intent.kind !== "propose") return null;
  return proposeSteps(intent.actionId, intent.input, userMessage, "redirect_from_guidance");
}

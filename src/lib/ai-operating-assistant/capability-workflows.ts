/**
 * Capability workflows — multi-step execution sequences composed from Action Registry ids.
 * Presentation-only orchestration; each step still executes via Plan Viewer → executeActionPlan.
 */

import { getAssistantAction } from "./actions/registry";
import {
  buildCreationFormCard,
  buildWorkflowCard,
  type EaExecutionCard,
  type EaWorkflowStepView,
} from "./execution-cards";
import type { AssistantBusinessContext } from "./types";

export type CapabilityWorkflowStep = {
  /** Registered action id when the step is executable; omit for presentation-only stages. */
  actionId?: string;
  label: string;
  /** When true, step is required for the outcome; otherwise optional follow-on. */
  required?: boolean;
};

export type CapabilityWorkflowDefinition = {
  id: string;
  name: string;
  purpose: string;
  intentPhrases: string[];
  steps: CapabilityWorkflowStep[];
};

export const CAPABILITY_WORKFLOWS: CapabilityWorkflowDefinition[] = [
  {
    id: "onboard_client",
    name: "Onboard a new client",
    purpose:
      "Create the client, add a primary contact, assign an account manager, create the first project, and prepare kickoff.",
    intentPhrases: [
      "onboard a new client",
      "onboard new client",
      "onboard a client",
      "client onboarding",
      "onboard customer",
      "full client setup",
      "set up a new client end to end",
      "we've just signed",
      "we have just signed",
      "we just signed",
      "just signed",
      "we've signed",
      "new customer signed",
      "signed a new client",
      "signed a new customer",
    ],
    steps: [
      { actionId: "clients.createClient", label: "Create Client", required: true },
      { actionId: "clients.addClientContact", label: "Add Primary Contact", required: true },
      {
        actionId: "clients.assignAccountManager",
        label: "Assign Account Manager",
        required: true,
      },
      { actionId: "projects.createProject", label: "Create Project", required: true },
      { label: "Schedule Kickoff", required: false },
      { label: "Generate Welcome Pack", required: false },
    ],
  },
  {
    id: "review_cashflow",
    name: "Review Cashflow",
    purpose: "Summarise current position, forecast, and outstanding AR — then open Financials.",
    intentPhrases: [
      "review cashflow",
      "review cash flow",
      "cash position",
      "outstanding ar",
      "accounts receivable overview",
    ],
    steps: [
      { label: "Current Position", required: false },
      { label: "Forecast", required: false },
      { label: "Outstanding AR", required: false },
    ],
  },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchCapabilityWorkflow(message: string): CapabilityWorkflowDefinition | null {
  const text = normalize(message);
  if (!text) return null;
  // Prefer longer / more specific phrases.
  const ranked = [...CAPABILITY_WORKFLOWS].sort(
    (a, b) =>
      Math.max(...b.intentPhrases.map((p) => p.length)) -
      Math.max(...a.intentPhrases.map((p) => p.length)),
  );
  for (const workflow of ranked) {
    if (workflow.intentPhrases.some((phrase) => text.includes(normalize(phrase)))) {
      return workflow;
    }
  }
  return null;
}

export function workflowStepsView(
  workflow: CapabilityWorkflowDefinition,
  activeActionId?: string | null,
): EaWorkflowStepView[] {
  let markedReady = false;
  return workflow.steps.map((step, index) => {
    const definition = step.actionId ? getAssistantAction(step.actionId) : null;
    const isActive =
      !markedReady &&
      Boolean(step.actionId) &&
      (activeActionId ? activeActionId === step.actionId : index === 0);
    if (isActive) markedReady = true;
    return {
      id: `${workflow.id}_${index}`,
      label: step.label,
      actionId: definition && step.actionId ? step.actionId : undefined,
      status: isActive ? "ready" : "pending",
      detail: definition?.description ?? (step.required === false ? "Optional" : undefined),
    };
  });
}

export function buildWorkflowExecutionCards(input: {
  workflow: CapabilityWorkflowDefinition;
  activeActionId?: string | null;
  creationCard?: EaExecutionCard | null;
}): EaExecutionCard[] {
  const cards: EaExecutionCard[] = [
    buildWorkflowCard({
      id: input.workflow.id,
      name: input.workflow.name,
      purpose: input.workflow.purpose,
      steps: workflowStepsView(input.workflow, input.activeActionId),
    }),
  ];
  if (input.creationCard) cards.push(input.creationCard);
  return cards;
}

export function buildNeedInfoCards(input: {
  actionId: string;
  message: string;
  missingFields: string[];
  prefill?: Record<string, unknown>;
  workflow?: CapabilityWorkflowDefinition | null;
  business?: AssistantBusinessContext;
}): EaExecutionCard[] {
  void input.business;
  const definition = getAssistantAction(input.actionId);
  const creation = buildCreationFormCard({
    actionId: input.actionId,
    actionName: definition?.name ?? input.actionId,
    businessObject: definition?.capability.businessObject,
    schema: definition?.inputSchema,
    missingFields: input.missingFields,
    prefill: input.prefill,
    message: input.message,
  });
  if (input.workflow) {
    return buildWorkflowExecutionCards({
      workflow: input.workflow,
      activeActionId: input.actionId,
      creationCard: creation,
    });
  }
  return [creation];
}

/** First executable registry step for a workflow (skips decorative labels without handlers). */
export function primaryWorkflowActionId(
  workflow: CapabilityWorkflowDefinition,
): string | null {
  for (const step of workflow.steps) {
    if (step.actionId && getAssistantAction(step.actionId)) return step.actionId;
  }
  return null;
}

/** Navigation-only workflow cards (e.g. review cashflow → Financials). */
export function buildReadWorkflowCards(workflow: CapabilityWorkflowDefinition): EaExecutionCard[] {
  const cards = buildWorkflowExecutionCards({ workflow, activeActionId: null });
  if (workflow.id === "review_cashflow") {
    cards.push({
      id: "nav_financials",
      kind: "navigation",
      title: "Open Financials",
      body: "Review cash position, forecast, and receivables in the Financials module.",
      actions: [
        {
          id: "open_financials",
          label: "Open Financials",
          variant: "primary",
          intent: "navigate",
          href: "/internaldashboard?view=financials",
        },
      ],
      fields: [
        { key: "position", label: "Current Position", value: "Live in Financials" },
        { key: "forecast", label: "Forecast", value: "Live in Financials" },
        { key: "ar", label: "Outstanding AR", value: "Live in Financials" },
      ],
      statusTone: "info",
    });
  }
  return cards;
}

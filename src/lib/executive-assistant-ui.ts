import type { InternalOperationsView } from "@/lib/internal-operations-data";
import { internalViewTitles, isInternalOperationsView } from "@/lib/internal-operations-data";
import type { SurveyOperationsView } from "@/lib/survey-operations-mock-data";
import { surveyViewTitles } from "@/lib/survey-operations-mock-data";

export type ExecutiveAssistantVariant = "home" | "drawer" | "page";

export type ExecutiveAssistantPageContext = {
  /** Short module name shown as “You are viewing: …” */
  label: string;
  suggestedPrompts: string[];
};

const DEFAULT_PROMPTS = [
  "Summarise this page",
  "What needs attention?",
  "Draft an executive update",
  "Find related records",
] as const;

const CONTEXT_BY_VIEW: Partial<Record<string, ExecutiveAssistantPageContext>> = {
  home: {
    label: "Home",
    suggestedPrompts: [
      "Review today's priorities",
      "Summarise CRM",
      "Create Board Pack",
      "Analyse cashflow",
      "Find client",
      "Draft proposal",
      "Generate project report",
    ],
  },
  clients: {
    label: "Clients",
    suggestedPrompts: [
      "Show clients at risk",
      "Summarise this client",
      "Create client report",
      "Generate proposal",
    ],
  },
  "clients-dashboard": {
    label: "Clients",
    suggestedPrompts: [
      "Show clients at risk",
      "Summarise active clients",
      "Create client report",
      "Generate proposal",
    ],
  },
  crm: {
    label: "CRM",
    suggestedPrompts: [
      "Pipeline summary",
      "Likely wins",
      "Next actions",
      "Executive summary",
    ],
  },
  "crm-meetings": {
    label: "CRM",
    suggestedPrompts: ["Upcoming meetings", "Prepare briefing", "Follow-up actions", "Executive summary"],
  },
  financials: {
    label: "Financials",
    suggestedPrompts: [
      "Explain cashflow",
      "Summarise expenses",
      "Outstanding invoices",
      "Generate finance report",
    ],
  },
  "general-ledger": {
    label: "Financials",
    suggestedPrompts: ["Explain cashflow", "Summarise ledger", "Outstanding invoices", "Generate finance report"],
  },
  "accounts-receivable": {
    label: "Financials",
    suggestedPrompts: ["Outstanding invoices", "Explain cashflow", "Ageing summary", "Generate finance report"],
  },
  "accounts-payable": {
    label: "Financials",
    suggestedPrompts: ["Bills due soon", "Summarise expenses", "Supplier spend", "Generate finance report"],
  },
  expenses: {
    label: "Financials",
    suggestedPrompts: ["Summarise expenses", "Explain cashflow", "Outstanding invoices", "Generate finance report"],
  },
  "financial-reports": {
    label: "Financials",
    suggestedPrompts: ["Explain cashflow", "Executive summary", "Board pack numbers", "Generate finance report"],
  },
  projects: {
    label: "Projects",
    suggestedPrompts: ["Project health", "Risks", "Upcoming deadlines", "Create weekly report"],
  },
  hr: {
    label: "HR",
    suggestedPrompts: ["Headcount summary", "Leave overview", "Open roles", "People report"],
  },
  "hr-dashboard": {
    label: "HR",
    suggestedPrompts: ["Headcount summary", "Leave overview", "Open roles", "People report"],
  },
  calendar: {
    label: "Calendar",
    suggestedPrompts: ["Today's meetings", "Prepare briefing", "Find free time", "Schedule follow-up"],
  },
  messaging: {
    label: "Messaging",
    suggestedPrompts: ["Unread summary", "Draft reply", "Find conversation", "Action items"],
  },
  "files-internal": {
    label: "Files",
    suggestedPrompts: ["Find a document", "Recent files", "Summarise folder", "Prepare attachment pack"],
  },
  "unit311-details": {
    label: "Unit311 Details",
    suggestedPrompts: ["Explain this system", "Open architecture", "Related documentation", "Operational risks"],
  },
  "corporate-software": {
    label: "Software & Licences",
    suggestedPrompts: [
      "Renewals due soon",
      "Unused licences",
      "Monthly software spend",
      "Generate software report",
    ],
  },
  "executive-assistant": {
    label: "Executive Assistant",
    suggestedPrompts: [
      "Review today's priorities",
      "Summarise CRM",
      "Analyse cashflow",
      "Create Board Pack",
    ],
  },
  support: {
    label: "Support",
    suggestedPrompts: ["Open tickets", "Urgent issues", "Draft response", "Support summary"],
  },
  strategy: {
    label: "Strategy",
    suggestedPrompts: ["Strategic priorities", "Competitor risks", "Board pack outline", "Executive summary"],
  },
  "board-pack": {
    label: "Board deck",
    suggestedPrompts: ["Create Board Pack", "Executive summary", "Weekly summary", "Highlight risks"],
  },
};

export const HOME_BRIEFING_PRIORITIES = [
  "3 overdue tasks",
  "2 meetings",
  "1 invoice awaiting approval",
  "Revenue forecast available",
] as const;

export const HOME_SUGGESTED_ACTIONS = [
  "Review today's priorities",
  "Summarise CRM",
  "Create Board Pack",
  "Analyse cashflow",
  "Find client",
  "Draft proposal",
  "Generate project report",
] as const;

export const GENERATE_ACTIONS = [
  "PowerPoint Report",
  "PDF Report",
  "Board Pack",
  "Executive Summary",
  "Weekly Summary",
] as const;

export const FUTURE_ACTIONS = [
  "Create task",
  "Create meeting",
  "Create client",
  "Create invoice",
  "Create project",
  "Schedule follow-up",
] as const;

export function resolveExecutiveAssistantContext(
  activeView: string | null | undefined,
  mode: "survey" | "internal" = "internal",
): ExecutiveAssistantPageContext {
  if (!activeView) {
    return { label: "Workspace", suggestedPrompts: [...DEFAULT_PROMPTS] };
  }

  const mapped = CONTEXT_BY_VIEW[activeView];
  if (mapped) return mapped;

  if (mode === "internal" && isInternalOperationsView(activeView)) {
    const meta = internalViewTitles[activeView as InternalOperationsView];
    return {
      label: meta.subtitle || meta.title,
      suggestedPrompts: [...DEFAULT_PROMPTS],
    };
  }

  const surveyMeta = surveyViewTitles[activeView as SurveyOperationsView];
  if (surveyMeta) {
    return {
      label: surveyMeta.subtitle || surveyMeta.title,
      suggestedPrompts: [...DEFAULT_PROMPTS],
    };
  }

  return { label: "Workspace", suggestedPrompts: [...DEFAULT_PROMPTS] };
}

export function greetingForNow(name: string) {
  const hour = new Date().getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${hello} ${name}.`;
}

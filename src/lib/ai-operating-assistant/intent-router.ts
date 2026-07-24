import type { AssistantChatMessage } from "./types";
import {
  classifyReportIntent,
  inferReportTypeFromHistory,
  reportDisplayMeta,
  type AssistantReportType,
} from "./report-intent";

export type DirectAssistantIntent = {
  tool:
    | "generateEmployeeListPdf"
    | "generateFinancialReportPdf"
    | "generateReportPdf"
    | "generatePayrollPdf"
    | "emailAssistantArtifact"
    | "searchEmployees"
    | "searchPerformanceReviews"
    | "searchLeave"
    | "searchClients"
    | "searchProjects"
    | "searchInvoices"
    | "searchExpenses"
    | "getCashPosition"
    | "getMonthlyPayrollObligation"
    | "platformSearch"
    | "queryPayroll"
    | "proposeBusinessActionPlan"
    | "listBusinessActions"
    | "planBusinessGoal";
  args: Record<string, unknown>;
  reason: string;
};

function historyHasPdfArtifact(history: AssistantChatMessage[]) {
  return history.some((message) => (message.artifacts?.length ?? 0) > 0);
}

function isFollowUpPdfCommand(text: string) {
  return (
    /^(generate|create|make|export)\s+(a\s+|the\s+)?(pdf|report|file|it)\.?$/i.test(text) ||
    /^(generate|create|make|export)\s+it\.?$/i.test(text) ||
    /^(generate|create|make)\s*pdf\.?$/i.test(text) ||
    /^create\s+a\s+pdf\.?$/i.test(text) ||
    /^pdf\.?$/i.test(text) ||
    /^(do\s+it|yes|go ahead|proceed|export)\.?$/i.test(text)
  );
}

function intentForReportType(reportType: AssistantReportType, reason: string): DirectAssistantIntent {
  const meta = reportDisplayMeta(reportType);
  if (reportType === "employee") {
    return {
      tool: "generateEmployeeListPdf",
      args: { title: meta.title, filename: meta.filename },
      reason,
    };
  }
  if (reportType === "financial") {
    return {
      tool: "generateFinancialReportPdf",
      args: {
        period: "last month",
        title: meta.title,
        filename: meta.filename,
      },
      reason,
    };
  }
  return {
    tool: "generateReportPdf",
    args: {
      reportType,
      title: meta.title,
      filename: meta.filename,
    },
    reason,
  };
}

function proposeClientAction(
  actionId: string,
  input: Record<string, unknown>,
  request: string,
  reason: string,
): DirectAssistantIntent {
  return {
    tool: "proposeBusinessActionPlan",
    args: {
      request,
      title: actionId,
      steps: [{ actionId, input }],
    },
    reason,
  };
}

/**
 * Map clear natural-language client ops onto registered Action Framework ids.
 * Discovery still comes from the registry — this only selects known actionIds.
 */
function resolveClientMutationIntent(
  text: string,
  lower: string,
): DirectAssistantIntent | null {
  const mergeMatch = text.match(
    /merge\s+(.+?)\s+into\s+(.+?)(?:\.|$)/i,
  );
  if (mergeMatch) {
    return proposeClientAction(
      "clients.mergeDuplicateClients",
      {
        sourceClientName: mergeMatch[1]!.trim().replace(/[.“”"]/g, ""),
        targetClientName: mergeMatch[2]!.trim().replace(/[.“”"]/g, ""),
      },
      text,
      "clients_merge",
    );
  }

  const createMatch = text.match(
    /(?:create|add|new)\s+(?:a\s+)?(?:new\s+)?client(?:\s+(?:called|named|for))?\s+(.+?)(?:\.|$)/i,
  );
  if (createMatch && !/\b(contact|location|manager)\b/i.test(lower)) {
    const companyName = createMatch[1]!
      .trim()
      .replace(/[.“”"]/g, "")
      .replace(/\s+in\s+[A-Za-z][A-Za-z\s-]{0,40}$/i, "")
      .trim();
    return proposeClientAction(
      "clients.createClient",
      { companyName },
      text,
      "clients_create",
    );
  }

  const restoreMatch = text.match(/restore\s+(.+?)(?:\.|$)/i);
  if (restoreMatch && /\b(client|ltd|limited|holdings|inc|plc|co)\b/i.test(lower)) {
    return proposeClientAction(
      "clients.restoreClient",
      { clientName: restoreMatch[1]!.trim().replace(/[.“”"]/g, "") },
      text,
      "clients_restore",
    );
  }

  const archiveMatch = text.match(/archive\s+(.+?)(?:\.|$)/i);
  if (archiveMatch && !/\b(email|file|document|project)\b/i.test(lower)) {
    return proposeClientAction(
      "clients.archiveClient",
      { clientName: archiveMatch[1]!.trim().replace(/[.“”"]/g, "") },
      text,
      "clients_archive",
    );
  }

  const assignMatch = text.match(
    /assign\s+(.+?)\s+as\s+(?:the\s+)?account\s+manager\s+for\s+(.+?)(?:\.|$)/i,
  );
  if (assignMatch) {
    return proposeClientAction(
      "clients.assignAccountManager",
      {
        accountManagerName: assignMatch[1]!.trim().replace(/[.“”"]/g, ""),
        clientName: assignMatch[2]!.trim().replace(/[.“”"]/g, ""),
      },
      text,
      "clients_assign_manager",
    );
  }

  const phoneMatch = text.match(
    /(?:change|update|set)\s+(.+?)(?:'s|’s)?\s+phone(?:\s+number)?\s+to\s+(.+?)(?:\.|$)/i,
  );
  if (phoneMatch) {
    return proposeClientAction(
      "clients.updateClient",
      {
        clientName: phoneMatch[1]!.trim().replace(/[.“”"]/g, ""),
        phone: phoneMatch[2]!.trim().replace(/[.“”"]/g, ""),
      },
      text,
      "clients_update_phone",
    );
  }

  const emailMatch = text.match(
    /(?:change|update|set)\s+(.+?)(?:'s|’s)?\s+email\s+to\s+(.+?)(?:\.|$)/i,
  );
  if (emailMatch) {
    return proposeClientAction(
      "clients.updateClient",
      {
        clientName: emailMatch[1]!.trim().replace(/[.“”"]/g, ""),
        email: emailMatch[2]!.trim().replace(/[.“”"]/g, ""),
      },
      text,
      "clients_update_email",
    );
  }

  return null;
}

/**
 * Goal-shaped requests → Planning Engine (discovers actions from registry).
 */
function resolveGoalPlanningIntent(
  text: string,
  lower: string,
): DirectAssistantIntent | null {
  if (
    /^(open|set\s*up|setup|launch|establish)\s+(a\s+|an\s+|the\s+)?(new\s+)?(office|branch|location|site)\b/i.test(
      lower,
    ) ||
    /^(onboard|set\s*up|setup)\s+(a\s+|an\s+|the\s+)?(new\s+)?(customer|client|account)\b/i.test(
      lower,
    ) ||
    /^(hire|recruit)\s+(a\s+|an\s+)?/i.test(lower) ||
    /\b(open\s+a\s+new\s+office|onboard\s+a\s+new\s+(customer|client)|hire\s+a\s+)/i.test(
      lower,
    )
  ) {
    return {
      tool: "planBusinessGoal",
      args: { goal: text },
      reason: "planning_goal",
    };
  }
  return null;
}

/**
 * Deterministic short-circuit for clear executive follow-ups.
 * Prefer executing tools over asking the model what the user meant.
 */
export function resolveDirectIntent(
  message: string,
  history: AssistantChatMessage[],
): DirectAssistantIntent | null {
  const text = message.trim();
  const lower = text.toLowerCase();
  const hasPdf = historyHasPdfArtifact(history);

  // —— Client Action Framework mutations (registry actionIds) ——
  const clientMutation = resolveClientMutationIntent(text, lower);
  if (clientMutation) return clientMutation;

  // —— Goal-oriented Planning Engine ——
  const goalIntent = resolveGoalPlanningIntent(text, lower);
  if (goalIntent) return goalIntent;

  // —— Live data lists (never invent “no access”) ——

  if (
    /\b(performance\s+reviews?|reviews?\s+performance|appraisal|appraisals)\b/i.test(lower) &&
    !/\b(pdf|export|download|email)\b/i.test(lower)
  ) {
    return {
      tool: "searchPerformanceReviews",
      args: { pageSize: 100 },
      reason: "list_performance_reviews",
    };
  }

  if (
    (/\b(on\s+leave|currently\s+on\s+leave|who('?s| is)\s+on\s+leave|everyone\s+.*leave|people\s+.*leave)\b/i.test(
      lower,
    ) ||
      /^(list|show|get|give me|display)\s+(all\s+)?leave\b/i.test(text)) &&
    !/\b(pdf|export|download|balance|balances)\b/i.test(lower)
  ) {
    return {
      tool: "searchLeave",
      args: {
        currentlyOnLeave: /\bon\s+leave\b/i.test(lower),
        pageSize: 100,
      },
      reason: "list_leave",
    };
  }

  if (
    /^(list|show|get|give me|display)\s+(all\s+)?(employees|staff|people|headcount)\b/i.test(
      text,
    ) &&
    !/pdf|export|download|email|board pack|report/i.test(lower)
  ) {
    return {
      tool: "searchEmployees",
      args: { pageSize: 100 },
      reason: "list_employees_only",
    };
  }

  if (
    /\b(monthly\s+payroll|how\s+much\s+.*payroll|payroll\s+(cost|obligation|total|amount)|what\s+is\s+(the\s+)?payroll)\b/i.test(
      lower,
    ) &&
    !/\b(pdf|export|download|report)\b/i.test(lower)
  ) {
    return {
      tool: "getMonthlyPayrollObligation",
      args: {},
      reason: "monthly_payroll",
    };
  }

  if (
    /\b(top\s+\d+\s+clients?|top\s+clients?|biggest\s+clients?|who\s+are\s+my\s+top)\b/i.test(lower)
  ) {
    const topMatch = lower.match(/top\s+(\d+)/);
    const topN = topMatch ? Number(topMatch[1]) : 10;
    return {
      tool: "searchClients",
      args: { topN: Number.isFinite(topN) && topN > 0 ? topN : 10, pageSize: 50 },
      reason: "top_clients",
    };
  }

  if (
    /\b(clients?\s+in\s+[a-z]+|customers?\s+in\s+[a-z]+)\b/i.test(lower) &&
    !/\b(pdf|export)\b/i.test(lower)
  ) {
    const countryMatch = lower.match(/\b(?:clients?|customers?)\s+in\s+([a-z][a-z\s-]{1,40})\b/i);
    const country = countryMatch?.[1]?.trim();
    return {
      tool: "searchClients",
      args: country ? { country, pageSize: 50 } : { pageSize: 50 },
      reason: "clients_by_country",
    };
  }

  if (
    /\b(outstanding\s+invoices?|unpaid\s+invoices?|open\s+invoices?|accounts\s+receivable|who\s+owes)\b/i.test(
      lower,
    ) &&
    !/\b(pdf|export)\b/i.test(lower)
  ) {
    return {
      tool: "searchInvoices",
      args: { outstandingOnly: true, pageSize: 50 },
      reason: "outstanding_invoices",
    };
  }

  if (
    /\b(bank\s+balance|cash\s+balance|cash\s+position|treasury|wise\s+balance|how\s+much\s+cash)\b/i.test(
      lower,
    ) &&
    !/\b(pdf|export)\b/i.test(lower)
  ) {
    return {
      tool: "getCashPosition",
      args: {},
      reason: "cash_position",
    };
  }

  if (
    /\b(recent\s+expenses?|latest\s+expenses?|show\s+.*expenses?|expenses?\s+over|expenses?\s+above)\b/i.test(
      lower,
    ) &&
    !/\b(pdf|export)\b/i.test(lower)
  ) {
    const amountMatch = lower.match(/(?:over|above|more than)\s*[$£€]?\s*([\d,]+)/i);
    const minAmount = amountMatch
      ? Number(String(amountMatch[1]).replace(/,/g, ""))
      : undefined;
    return {
      tool: "searchExpenses",
      args: {
        recentOnly: true,
        ...(minAmount && Number.isFinite(minAmount) ? { minAmount } : {}),
        pageSize: 25,
      },
      reason: "recent_expenses",
    };
  }

  if (
    /\b(engineering\s+projects?|current\s+projects?|show\s+.*projects?|list\s+.*projects?|active\s+projects?)\b/i.test(
      lower,
    ) &&
    !/\b(pdf|export|report)\b/i.test(lower)
  ) {
    const wantsEngineering = /\bengineering\b/i.test(lower);
    return {
      tool: "searchProjects",
      args: {
        query: wantsEngineering ? "engineering" : undefined,
        phase: /\bcurrent|active|live\b/i.test(lower) ? "live" : "all",
        pageSize: 50,
      },
      reason: wantsEngineering ? "engineering_projects" : "list_projects",
    };
  }

  // Person / company style search (e.g. “John Smith”)
  if (
    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(text) ||
    /^(search|find|look\s+up|who\s+is)\s+.+/i.test(text)
  ) {
    const query = text.replace(/^(search|find|look\s+up|who\s+is)\s+/i, "").trim();
    if (query && !/\b(pdf|report|export)\b/i.test(query)) {
      return {
        tool: "platformSearch",
        args: { query },
        reason: "cross_module_search",
      };
    }
  }

  // —— Payroll PDF (before generic report classifier) ——
  if (
    /\bpayroll\b/i.test(lower) &&
    /\b(pdf|report|export|document)\b/i.test(lower) &&
    /\b(generate|create|make|export|produce|build|prepare|give|get|show)\b/i.test(lower)
  ) {
    const reportType = /\bboard\b/i.test(lower)
      ? "board"
      : /\bdepartment\b/i.test(lower)
        ? "department"
        : "summary";
    return {
      tool: "generatePayrollPdf",
      args: { reportType },
      reason: "payroll_pdf",
    };
  }

  // Explicit typed report / PDF request
  const classified = classifyReportIntent(text);
  if (classified) {
    if (classified.reportType === "financial") {
      return {
        tool: "generateFinancialReportPdf",
        args: {
          period: text,
          title: classified.title,
          filename: classified.filename,
        },
        reason: classified.reason,
      };
    }
    if (classified.reportType === "employee") {
      return {
        tool: "generateEmployeeListPdf",
        args: {
          title: classified.title,
          filename: classified.filename,
        },
        reason: classified.reason,
      };
    }
    return {
      tool: "generateReportPdf",
      args: {
        reportType: classified.reportType,
        title: classified.title,
        filename: classified.filename,
      },
      reason: classified.reason,
    };
  }

  // Follow-up PDF — infer type from conversation context (never assume financial).
  if (isFollowUpPdfCommand(text)) {
    const inferred = inferReportTypeFromHistory(history);
    if (inferred) {
      return intentForReportType(inferred, `followup_pdf_${inferred}`);
    }
    // No prior type — execute a board report rather than asking clarifying questions.
    return intentForReportType("board", "followup_pdf_default_board");
  }

  // Email the active PDF
  if (
    hasPdf &&
    (/email\s+(it|the\s+pdf|this|that|the\s+report|the\s+file)/i.test(lower) ||
      /^email\s+(to\s+)?(the\s+)?board/i.test(lower) ||
      /send\s+(it|the\s+pdf).*(board|email)/i.test(lower) ||
      /email\s+artifact\s+art_/i.test(lower))
  ) {
    const artifactIdMatch = text.match(/art_[a-z0-9]+/i);
    return {
      tool: "emailAssistantArtifact",
      args: artifactIdMatch ? { artifactId: artifactIdMatch[0] } : {},
      reason: "email_existing_pdf",
    };
  }

  return null;
}

export function topicHintFromHistory(history: AssistantChatMessage[]): string {
  if (historyHasPdfArtifact(history)) return "active_pdf";
  const inferred = inferReportTypeFromHistory(history);
  if (inferred) return inferred;
  return "general";
}

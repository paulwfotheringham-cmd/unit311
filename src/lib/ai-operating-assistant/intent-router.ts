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
    | "queryBusiness"
    | "getSmartInsights"
    | "getBusinessHealth"
    | "getDailyBrief"
    | "searchCRM"
    | "proposeBusinessActionPlan"
    | "listBusinessActions"
    | "searchCapabilities"
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
    /^(hire|recruit)\s+(a\s+|an\s+)?/i.test(lower) ||
    /\b(open\s+a\s+new\s+office|hire\s+a\s+)/i.test(lower)
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
 * Write mutations are NOT resolved here — only via Action Registry capability matching.
 */
export function resolveDirectIntent(
  message: string,
  history: AssistantChatMessage[],
): DirectAssistantIntent | null {
  const text = message.trim();
  const lower = text.toLowerCase();
  const hasPdf = historyHasPdfArtifact(history);

  // —— Goal-oriented Planning Engine ——
  const goalIntent = resolveGoalPlanningIntent(text, lower);
  if (goalIntent) return goalIntent;

  // —— Executive business reasoning (live data only) ——
  if (
    /\b(what\s+changed|changed\s+since\s+yesterday|overnight|since\s+yesterday|what'?s\s+new|what\s+happened)\b/i.test(
      lower,
    )
  ) {
    return {
      tool: "getDailyBrief",
      args: {},
      reason: "what_changed",
    };
  }

  if (
    /\b(requires?\s+my\s+attention|what\s+should\s+i\s+focus|focus\s+on\s+today|attention\s+today|priorit(y|ies)\s+today)\b/i.test(
      lower,
    )
  ) {
    return {
      tool: "getDailyBrief",
      args: {},
      reason: "attention_today",
    };
  }

  if (
    /\b(summarise|summarize)\s+(the\s+)?business\b|\bbusiness\s+summary\b|\bhow\s+is\s+(the\s+)?business\b|\bbusiness\s+health\b|\boperating\s+status\b/i.test(
      lower,
    )
  ) {
    return {
      tool: "queryBusiness",
      args: { question: text },
      reason: "business_summary",
    };
  }

  if (
    /\b(biggest\s+opportunities|pipeline|hot\s+leads|crm\s+opportunities|sales\s+pipeline)\b/i.test(
      lower,
    ) &&
    !/\b(pdf|export)\b/i.test(lower)
  ) {
    return {
      tool: "searchCRM",
      args: { status: "Hot", pageSize: 50 },
      reason: "sales_opportunities",
    };
  }

  if (
    /\b(customers?\s+are\s+at\s+risk|clients?\s+at\s+risk|which\s+customers?\s+.*risk|inactive\s+clients?)\b/i.test(
      lower,
    ) &&
    !/\b(pdf|export)\b/i.test(lower)
  ) {
    return {
      tool: "getSmartInsights",
      args: { category: "clients" },
      reason: "customers_at_risk",
    };
  }

  if (
    /\b(at\s+risk|miss\s+deadlines?|likely\s+to\s+miss|overdue\s+projects?|projects?\s+.*overdue|stale\s+projects?|behind\s+schedule|highest-?risk\s+projects?|highest\s+risk\s+projects?)\b/i.test(
      lower,
    ) &&
    !/\b(pdf|export|customer|client)\b/i.test(lower)
  ) {
    return {
      tool: "getSmartInsights",
      args: { category: "projects" },
      reason: "projects_at_risk",
    };
  }

  if (
    /\b(highest\s+overdue|overdue\s+balances?|customers?\s+.*overdue|overdue\s+invoices?|who\s+owes|owes\s+us\s+the\s+most|which\s+invoices?\s+are\s+overdue)\b/i.test(
      lower,
    ) &&
    !/\b(pdf|export)\b/i.test(lower)
  ) {
    return {
      tool: "searchInvoices",
      args: { overdueOnly: true, pageSize: 50 },
      reason: "overdue_balances",
    };
  }

  if (
    /\b(how\s+much\s+cash|cash\s+(do\s+we\s+have|position|balance)|bank\s+balance|treasury)\b/i.test(
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
    /\b(overloaded|workload|capacity|too\s+many\s+reports|over\s+capacity|who\s+is\s+overloaded)\b/i.test(
      lower,
    ) &&
    !/\b(pdf|export)\b/i.test(lower)
  ) {
    return {
      tool: "getSmartInsights",
      args: { category: "hr" },
      reason: "employee_workload",
    };
  }

  if (
    /\b(what\s+should\s+i\s+delegate|delegate|biggest\s+risks)\b/i.test(lower) &&
    !/\b(pdf|export)\b/i.test(lower)
  ) {
    return {
      tool: "getSmartInsights",
      args: {},
      reason: "executive_risks_or_delegate",
    };
  }

  if (
    /\b(prepare\s+for\s+(my\s+)?meeting|meeting\s+with)\b/i.test(lower) &&
    !/\b(pdf|export)\b/i.test(lower)
  ) {
    const person =
      text.match(/\b(?:with|meeting)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ||
      text.replace(/^.*meeting\s+with\s+/i, "").replace(/[?.!].*$/, "").trim();
    return {
      tool: "platformSearch",
      args: { query: person || text },
      reason: "meeting_prep",
    };
  }

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
    (/\b(on\s+leave|currently\s+on\s+leave|who('?s| is)\s+on\s+leave|everyone\s+.*leave|people\s+.*leave|today'?s\s+leave|leave\s+today|show\s+.*leave)\b/i.test(
      lower,
    ) ||
      /^(list|show|get|give me|display)\s+(all\s+|today'?s\s+|my\s+)?leave\b/i.test(text)) &&
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
    /\b(show|list|display)\s+(my\s+|all\s+|our\s+)?clients?\b/i.test(lower) &&
    !/\b(pdf|export|create|add|register|archive)\b/i.test(lower)
  ) {
    return {
      tool: "searchClients",
      args: { pageSize: 50 },
      reason: "list_clients",
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

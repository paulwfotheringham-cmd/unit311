import type { AssistantChatMessage } from "./types";

export type DirectAssistantIntent = {
  tool:
    | "generateEmployeeListPdf"
    | "generateFinancialReportPdf"
    | "emailAssistantArtifact"
    | "searchEmployees";
  args: Record<string, unknown>;
  reason: string;
};

function historyMentionsEmployees(history: AssistantChatMessage[]) {
  return history.some((message) => {
    if (/employee|headcount|staff directory|hr directory/i.test(message.content)) return true;
    return Boolean(
      message.artifacts?.some((artifact) => /employee|directory/i.test(artifact.title)),
    );
  });
}

function historyMentionsFinancials(history: AssistantChatMessage[]) {
  return history.some((message) => {
    if (
      /p\s*(&|and)\s*l\b|profit|loss|financial|board report|board pack|revenue|expenses|cash position/i.test(
        message.content,
      )
    ) {
      return true;
    }
    return Boolean(
      message.artifacts?.some((artifact) =>
        /financial|profit|p&l|board/i.test(`${artifact.title} ${artifact.filename}`),
      ),
    );
  });
}

function historyHasPdfArtifact(history: AssistantChatMessage[]) {
  return history.some((message) => (message.artifacts?.length ?? 0) > 0);
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
  const discussedEmployees = historyMentionsEmployees(history);
  const discussedFinancials = historyMentionsFinancials(history);
  const hasPdf = historyHasPdfArtifact(history);

  // List employees only (no PDF) — return the list, do not invent a file.
  if (
    /^(list|show|get|give me|display)\s+(all\s+)?(employees|staff|people|headcount)\b/i.test(
      text,
    ) &&
    !/pdf|export|download|email|board pack/i.test(lower)
  ) {
    return {
      tool: "searchEmployees",
      args: { pageSize: 100 },
      reason: "list_employees_only",
    };
  }

  // Explicit financial / P&L / board financials PDF
  if (
    (/p\s*(&|and)\s*l\b|profit\s*(and|&)\s*loss|financials?|board.*(finance|financial|report|pdf)|finance.*(pdf|report)/i.test(
      lower,
    ) ||
      (/pdf|report|pack/.test(lower) &&
        /board|finance|financial|revenue|expenses|cash/.test(lower))) &&
    /(generate|create|make|export|produce|build|want|need|get|give|show|prepare)/.test(lower)
  ) {
    return {
      tool: "generateFinancialReportPdf",
      args: { period: text, title: /board/i.test(lower) ? "Board Financial Report" : "Profit & Loss Report" },
      reason: "explicit_financial_pdf",
    };
  }

  // Explicit employee PDF requests
  if (
    /pdf/.test(lower) &&
    /employee|staff|headcount|directory|people/.test(lower) &&
    /(generate|create|make|export|list|produce|build|want)/.test(lower)
  ) {
    return {
      tool: "generateEmployeeListPdf",
      args: {},
      reason: "explicit_employee_pdf",
    };
  }

  // Follow-up PDF after financials were discussed (prefer over employees if both)
  if (
    discussedFinancials &&
    (/^(generate|create|make|export)\s+(a\s+|the\s+)?(pdf|report|file|it)\.?$/i.test(text) ||
      /^(generate|create|make|export)\s+it\.?$/i.test(text) ||
      /^(generate|create|make)\s*pdf\.?$/i.test(text) ||
      /^pdf\.?$/i.test(text) ||
      /^(do\s+it|yes|go ahead|proceed|export)\.?$/i.test(text))
  ) {
    return {
      tool: "generateFinancialReportPdf",
      args: { period: "last month" },
      reason: "followup_pdf_after_financials",
    };
  }

  // Follow-up: "Generate PDF" after employees were discussed
  if (
    discussedEmployees &&
    (/^(generate|create|make|export)\s+(a\s+|the\s+)?(pdf|report|file|it)\.?$/i.test(text) ||
      /^(generate|create|make|export)\s+it\.?$/i.test(text) ||
      /^(generate|create|make)\s*pdf\.?$/i.test(text) ||
      /^pdf\.?$/i.test(text) ||
      /^(do\s+it|yes|go ahead|proceed|export)\.?$/i.test(text))
  ) {
    return {
      tool: "generateEmployeeListPdf",
      args: {},
      reason: "followup_pdf_after_employees",
    };
  }

  // "Generate PDF" alone — prefer financial context, then employees
  if (/^(generate|create|make)\s+(a\s+|the\s+)?pdf\.?$/i.test(text)) {
    const recent = history.slice(-6);
    if (historyMentionsFinancials(recent) || discussedFinancials) {
      return {
        tool: "generateFinancialReportPdf",
        args: { period: "last month" },
        reason: "generate_pdf_with_financial_context",
      };
    }
    if (historyMentionsEmployees(recent) || discussedEmployees) {
      return {
        tool: "generateEmployeeListPdf",
        args: {},
        reason: "generate_pdf_with_employee_context",
      };
    }
  }

  // Email the active PDF
  if (
    hasPdf &&
    (/email\s+(it|the\s+pdf|this|that|the\s+report|the\s+file)/i.test(lower) ||
      /^email\s+(to\s+)?(the\s+)?board/i.test(lower) ||
      /send\s+(it|the\s+pdf).*(board|email)/i.test(lower))
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
  if (historyMentionsFinancials(history)) return "financials";
  if (historyMentionsEmployees(history)) return "employees";
  return "general";
}

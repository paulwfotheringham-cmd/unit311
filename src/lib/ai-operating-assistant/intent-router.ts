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
    | "emailAssistantArtifact"
    | "searchEmployees";
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

  // List employees only (no PDF) — return the list, do not invent a file.
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

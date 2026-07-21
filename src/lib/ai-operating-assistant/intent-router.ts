import type { AssistantChatMessage } from "./types";

export type DirectAssistantIntent = {
  tool: "generateEmployeeListPdf" | "emailAssistantArtifact" | "searchEmployees";
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

  // Follow-up: "Generate PDF" / "Create it" / "Export it" after employees were discussed
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

  // "Generate PDF" alone — if recent turn was about employees, or last assistant offered PDF
  if (/^(generate|create|make)\s+(a\s+|the\s+)?pdf\.?$/i.test(text)) {
    const recent = history.slice(-6);
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
  if (historyMentionsEmployees(history)) return "employees";
  return "general";
}

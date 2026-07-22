/**
 * Deterministic report-type classification for Executive Assistant PDFs.
 * Never default every PDF request to financials.
 */

export type AssistantReportType =
  | "engineering"
  | "board"
  | "financial"
  | "employee"
  | "project"
  | "client";

export type ClassifiedReportIntent = {
  reportType: AssistantReportType;
  title: string;
  filename: string;
  reason: string;
};

const MONTH_YEAR = () =>
  new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

export function reportDisplayMeta(reportType: AssistantReportType): {
  title: string;
  filename: string;
} {
  switch (reportType) {
    case "engineering":
      return {
        title: "Engineering Status Report",
        filename: "Engineering Status Report.pdf",
      };
    case "board":
      return {
        title: `Board Report - ${MONTH_YEAR()}`,
        filename: `Board Report - ${MONTH_YEAR()}.pdf`,
      };
    case "financial":
      return {
        title: `Financial Report - ${MONTH_YEAR()}`,
        filename: `Financial Report - ${MONTH_YEAR()}.pdf`,
      };
    case "employee":
      return {
        title: "Employee Directory",
        filename: "Employee Directory.pdf",
      };
    case "project":
      return {
        title: "Project Portfolio Report",
        filename: "Project Portfolio Report.pdf",
      };
    case "client":
      return {
        title: "Client Report",
        filename: "Client Report.pdf",
      };
    default: {
      const _exhaustive: never = reportType;
      return _exhaustive;
    }
  }
}

/**
 * Classify an explicit report/PDF request from the user prompt.
 * Returns null when the text is not a clear report-generation request.
 */
export function classifyReportIntent(message: string): ClassifiedReportIntent | null {
  const text = message.trim();
  const lower = text.toLowerCase();

  const wantsDocument =
    /\b(pdf|report|pack|directory|export|document)\b/.test(lower) ||
    /\b(generate|create|make|export|produce|build|prepare)\s+(a\s+|the\s+|me\s+a\s+|me\s+)?(pdf|report|pack|directory|document)\b/.test(
      lower,
    ) ||
    /\b(give me|get me)\s+(a\s+|the\s+)?(pdf|report|pack|directory)\b/.test(lower);

  // Open business questions (no explicit document ask) must not short-circuit to PDF tools.
  if (!wantsDocument) {
    return null;
  }

  // Order matters: more specific before broader “board/report” matches.
  if (
    /\b(engineer|engineering|delivery|milestone|tech\s*status|technical\s+status)\b/.test(
      lower,
    )
  ) {
    const meta = reportDisplayMeta("engineering");
    return { reportType: "engineering", ...meta, reason: "explicit_engineering" };
  }

  if (
    /\b(employees?|staff|headcount|people|directory|hr\s+list)\b/.test(lower) &&
    /\b(pdf|export|directory|list|report|document)\b/.test(lower)
  ) {
    const meta = reportDisplayMeta("employee");
    return { reportType: "employee", ...meta, reason: "explicit_employee" };
  }

  if (
    /\b(p\s*(&|and)\s*l|profit\s*(and|&)\s*loss|financials?|finance\s+report|cash\s+position|burn\s+rate)\b/.test(
      lower,
    ) ||
    (/\b(revenue|expenses|debtors|creditors)\b/.test(lower) &&
      /\b(pdf|report)\b/.test(lower))
  ) {
    const meta = reportDisplayMeta("financial");
    return { reportType: "financial", ...meta, reason: "explicit_financial" };
  }

  if (
    /\b(board\s+(financial|finance|p\s*(&|and)\s*l)|financial\s+board)\b/.test(lower)
  ) {
    const meta = reportDisplayMeta("financial");
    return {
      reportType: "financial",
      title: `Board Financial Report - ${MONTH_YEAR()}`,
      filename: `Board Financial Report - ${MONTH_YEAR()}.pdf`,
      reason: "explicit_board_financial",
    };
  }

  if (/\b(project\s+portfolio|portfolio\s+report|project\s+report|projects?\s+report)\b/.test(lower)) {
    const meta = reportDisplayMeta("project");
    return { reportType: "project", ...meta, reason: "explicit_project" };
  }

  if (/\b(client\s+report|clients?\s+report|customer\s+report|client\s+directory)\b/.test(lower)) {
    const meta = reportDisplayMeta("client");
    return { reportType: "client", ...meta, reason: "explicit_client" };
  }

  if (/\b(board\s+report|board\s+pack|board\s+update|board\s+brief)\b/.test(lower)) {
    const meta = reportDisplayMeta("board");
    return { reportType: "board", ...meta, reason: "explicit_board" };
  }

  // Generic “create/generate a report/PDF” without type — caller may use history.
  if (
    /^(generate|create|make|export|produce|build|prepare)\s+(a\s+|the\s+)?(pdf|report|file|it)\.?$/i.test(
      text,
    ) ||
    /^(generate|create|make)\s*pdf\.?$/i.test(text) ||
    /^pdf\.?$/i.test(text) ||
    /^(do\s+it|yes|go ahead|proceed|export)\.?$/i.test(text) ||
    /^create\s+a\s+pdf\.?$/i.test(text)
  ) {
    return null;
  }

  // “Create me a report PDF for my boss” without adjectives — still null; need type or history.
  if (
    /\b(pdf|report)\b/.test(lower) &&
    /(generate|create|make|export|produce|build|want|need|get|give|show|prepare)/.test(lower)
  ) {
    return null;
  }

  return null;
}

export function reportTypeFromArtifactTitle(titleOrFilename: string): AssistantReportType | null {
  const hay = titleOrFilename.toLowerCase();
  if (/engineer/.test(hay)) return "engineering";
  if (/employee|directory/.test(hay)) return "employee";
  if (/financial|profit|p&l|p and l/.test(hay)) return "financial";
  if (/project\s+portfolio|portfolio/.test(hay)) return "project";
  if (/client/.test(hay)) return "client";
  if (/board/.test(hay)) return "board";
  return null;
}

export function inferReportTypeFromHistory(
  history: Array<{ content: string; artifacts?: Array<{ title: string; filename: string }> }>,
): AssistantReportType | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const message = history[i];
    if (!message) continue;

    const artifacts = message.artifacts ?? [];
    for (let j = artifacts.length - 1; j >= 0; j -= 1) {
      const artifact = artifacts[j];
      if (!artifact) continue;
      const fromArtifact = reportTypeFromArtifactTitle(
        `${artifact.title} ${artifact.filename}`,
      );
      if (fromArtifact) return fromArtifact;
    }

    const classified = classifyReportIntent(message.content);
    if (classified) return classified.reportType;

    const lower = message.content.toLowerCase();
    if (/\b(engineer|engineering|milestone|delivery)\b/.test(lower)) return "engineering";
    if (/\b(employees?|staff|headcount|directory)\b/.test(lower)) return "employee";
    if (
      /\b(p\s*(&|and)\s*l|financials?|revenue|expenses|cash position|burn)\b/.test(lower)
    ) {
      return "financial";
    }
    if (/\b(project\s+portfolio|portfolio|project status)\b/.test(lower)) return "project";
    if (/\b(client|customer|onboarding|renewal)\b/.test(lower) && /\b(report|list)\b/.test(lower)) {
      return "client";
    }
    if (/\b(board\s+report|board\s+pack|board\s+update)\b/.test(lower)) return "board";
  }
  return null;
}

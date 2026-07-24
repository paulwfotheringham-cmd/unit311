import type { AssistantBusinessContext, AssistantPageSelection } from "./types";

export type AssistantToolResultStatus = "ok" | "error" | "forbidden" | "partial";

export type AssistantFollowUpAction = {
  id: string;
  label: string;
  kind:
    | "navigate"
    | "export"
    | "email"
    | "open"
    | "generate"
    | "confirm_action"
    | "download"
    | "email_artifact";
  href?: string;
  actionId?: string;
  artifactId?: string;
  requiresConfirmation?: boolean;
  /** Prefill for the next Action Framework propose (e.g. clientId from prior create). */
  input?: Record<string, unknown>;
};

export type AssistantCitation = {
  type: string;
  id: string;
  label: string;
};

export type AssistantToolResult<T = unknown> = {
  status: AssistantToolResultStatus;
  tool: string;
  source: string[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  items: T[];
  summary?: Record<string, unknown>;
  dataGaps?: string[];
  followUpActions?: AssistantFollowUpAction[];
  citations?: AssistantCitation[];
  appliedContext?: Partial<AssistantPageSelection> & { activeView?: string };
  /** Optional explainability payload for trust / drill-down. */
  explanation?: import("./explainability").AiExplanation;
  error?: string;
};

export type AssistantToolExecutionContext = {
  business: AssistantBusinessContext;
};

export function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20,
): { page: number; pageSize: number; total: number; hasMore: boolean; items: T[] } {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.min(50, Math.max(1, Math.floor(pageSize) || 20));
  const start = (safePage - 1) * safeSize;
  const slice = items.slice(start, start + safeSize);
  return {
    page: safePage,
    pageSize: safeSize,
    total: items.length,
    hasMore: start + safeSize < items.length,
    items: slice,
  };
}

export function toolOk<T>(
  tool: string,
  items: T[],
  options: {
    source: string[];
    page?: number;
    pageSize?: number;
    summary?: Record<string, unknown>;
    dataGaps?: string[];
    followUpActions?: AssistantFollowUpAction[];
    citations?: AssistantCitation[];
    appliedContext?: AssistantToolResult["appliedContext"];
    status?: AssistantToolResultStatus;
    explanation?: import("./explainability").AiExplanation;
  },
): AssistantToolResult<T> {
  const page = paginate(items, options.page, options.pageSize);
  return {
    status: options.status ?? "ok",
    tool,
    source: options.source,
    ...page,
    summary: options.summary,
    dataGaps: options.dataGaps,
    followUpActions: options.followUpActions,
    citations: options.citations,
    appliedContext: options.appliedContext,
    explanation: options.explanation,
  };
}

export function toolError(tool: string, error: string, source: string[] = []): AssistantToolResult {
  return {
    status: "error",
    tool,
    source,
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
    items: [],
    error,
  };
}

export function toolForbidden(tool: string, reason: string): AssistantToolResult {
  return toolError(tool, reason, []);
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function matchesQuery(haystack: string, query?: string) {
  if (!query?.trim()) return true;
  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

export function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isOverdue(endDate: string | null | undefined, now = new Date()) {
  const date = parseDate(endDate);
  if (!date) return false;
  return date.getTime() < now.getTime();
}

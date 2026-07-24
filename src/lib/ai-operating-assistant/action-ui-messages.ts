/**
 * Client-safe assistant message formatters.
 * Keep this module free of server-only imports (next/headers, db, pg, etc.).
 * Success copy must come from Action Registry capability metadata.
 */

import type {
  AssistantActionDefinition,
  AssistantActionExecuteResult,
} from "./actions/types";

function readPath(root: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let current: unknown = root;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function formatActionOutcomeMessage(input: {
  title: string;
  fields: Array<{ label: string; value: string }>;
  ctaLabel?: string | null;
  followUpQuestion?: string | null;
}): string {
  const lines = [`✓ ${input.title}`, ""];
  for (const field of input.fields) {
    lines.push(field.label);
    lines.push(field.value);
    lines.push("");
  }
  if (input.ctaLabel) {
    lines.push(input.ctaLabel);
    lines.push("");
  }
  if (input.followUpQuestion) {
    lines.push(input.followUpQuestion);
  }
  return lines.join("\n").trim();
}

export function formatPlanReadyMessage(input: {
  actionName: string;
  entityLabel?: string | null;
  detail?: string | null;
}): string {
  const name = input.entityLabel?.trim();
  const detail = input.detail?.trim();
  if (name && detail) {
    return `I'll ${input.actionName.toLowerCase()} for ${name} (${detail}). Approve to continue.`;
  }
  if (name) {
    return `I'll ${input.actionName.toLowerCase()} for ${name}. Approve to continue.`;
  }
  return `I'll ${input.actionName.toLowerCase()}. Approve to continue.`;
}

/**
 * Format execute success from capability.successFormatter.
 * Tokens: {recordLabel}, {recordId}, plus capability.fields token→path mappings.
 */
export function formatActionSuccess(input: {
  definition: AssistantActionDefinition;
  result: AssistantActionExecuteResult;
  stepInput?: Record<string, unknown>;
}): string {
  const { definition, result, stepInput = {} } = input;
  const formatter = definition.capability.successFormatter;
  const root: Record<string, unknown> = {
    result: {
      message: result.message,
      recordId: result.recordId ?? null,
      recordLabel: result.recordLabel ?? null,
      output: result.output ?? null,
      afterState: result.afterState ?? null,
    },
    input: stepInput,
  };

  const tokens: Record<string, string> = {
    recordLabel: String(result.recordLabel ?? result.message ?? definition.name),
    recordId: String(result.recordId ?? ""),
    message: result.message,
  };

  for (const field of formatter.fields ?? []) {
    const raw = readPath(root, field.path);
    if (field.token === "locationBlock") {
      const loc = typeof raw === "string" && raw.trim() ? raw.trim() : "";
      tokens[field.token] = loc ? `Location\n${loc}\n\n` : "";
      continue;
    }
    tokens[field.token] =
      raw == null || raw === ""
        ? ""
        : typeof raw === "string"
          ? raw
          : JSON.stringify(raw);
  }

  let text = formatter.template;
  for (const [token, value] of Object.entries(tokens)) {
    text = text.replaceAll(`{${token}}`, value);
  }

  const followUps =
    definition.capability.relationships?.suggestedNext?.length
      ? definition.capability.relationships.suggestedNext
      : definition.capability.suggestedFollowUps ?? [];
  if (followUps.length && !/would you like/i.test(text)) {
    text = `${text.trim()}\n\nWould you like to ${followUps
      .map((f) => f.label.toLowerCase())
      .join(", ")
      .replace(/, ([^,]*)$/, ", or $1")}?`;
  }

  return text.trim() || result.message;
}

/** @deprecated Use formatActionSuccess with registry capability */
export function formatExecutedClientOutcome(input: {
  companyName: string;
  location?: string | null;
  clientId?: string | null;
}): string {
  void input.clientId;
  return formatActionOutcomeMessage({
    title: "Client created",
    fields: [
      { label: "Name", value: input.companyName },
      ...(input.location ? [{ label: "Location", value: input.location }] : []),
    ],
    ctaLabel: "Open Client",
    followUpQuestion:
      "Would you like to add a contact, billing details or an account manager?",
  });
}

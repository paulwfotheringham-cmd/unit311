/**
 * Client-safe assistant message formatters.
 * Keep this module free of server-only imports (next/headers, db, pg, etc.).
 */

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
  companyName?: string | null;
  location?: string | null;
}): string {
  const name = input.companyName?.trim();
  const location = input.location?.trim();
  if (name && location) {
    return `I'll ${input.actionName.toLowerCase()} for ${name} (${location}). Approve to continue.`;
  }
  if (name) {
    return `I'll ${input.actionName.toLowerCase()} for ${name}. Approve to continue.`;
  }
  return `I'll ${input.actionName.toLowerCase()}. Approve to continue.`;
}

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

/**
 * Semantic business-action intent resolver.
 *
 * Maps natural language → registered Action Framework actions using the
 * live action registry (descriptions + inputSchema). No hard-coded command phrases.
 */

import {
  createAssistantResponse,
  formatOpenAIError,
  getAssistantModel,
} from "./openai-client";
import type { AssistantBusinessContext } from "./types";
import {
  getAssistantAction,
  listAssistantActionDescriptors,
} from "./actions/registry";
import type { AssistantActionDescriptor } from "./actions/types";

export type ResolvedBusinessActionIntent =
  | {
      kind: "propose";
      actionId: string;
      input: Record<string, unknown>;
      confidence: number;
      reason: string;
      missingFields: string[];
    }
  | {
      kind: "need_info";
      actionId: string;
      input: Record<string, unknown>;
      missingFields: string[];
      question: string;
      reason: string;
    }
  | {
      kind: "none";
      reason: string;
    };

/** Lightweight domain synonyms for scoring — not full utterance templates. */
const SEMANTIC_ALIASES: Record<string, string[]> = {
  client: ["client", "customer", "account", "company", "organisation", "organization"],
  create: ["create", "add", "register", "setup", "set up", "onboard", "new", "signed", "sign"],
  update: ["update", "change", "edit", "set", "amend"],
  archive: ["archive", "close", "deactivate", "retire"],
  restore: ["restore", "reactivate", "unarchive", "reopen"],
  assign: ["assign", "appoint", "give"],
  merge: ["merge", "combine", "dedupe", "duplicate"],
  contact: ["contact", "person", "stakeholder"],
  location: ["location", "office", "address", "site"],
  manager: ["manager", "account manager", "owner"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function stripLocationSuffix(name: string): string {
  return name
    .replace(/\s+in\s+[A-Za-z][A-Za-z\s-]{0,60}$/i, "")
    .replace(/[.“”"]/g, "")
    .trim();
}

function extractLocation(message: string): string | null {
  const match = message.match(/\bin\s+([A-Za-z][A-Za-z\s-]{1,40})(?:\.|$)/i);
  return match?.[1]?.trim() || null;
}

/**
 * Extract a likely entity / company name without requiring fixed command grammar.
 */
export function extractBusinessEntity(message: string): string | null {
  const text = message.trim();
  const quoted = text.match(/[“"']([^”"']{2,80})[”"']/);
  if (quoted?.[1]) return stripLocationSuffix(quoted[1].trim());

  const patterns = [
    /(?:called|named|titled)\s+(.+?)(?:\s+in\s+[A-Za-z].*)?(?:\.|$)/i,
    /(?:signed|signing)\s+(.+?)(?:\s+in\s+[A-Za-z].*)?(?:\.|$)/i,
    /(?:customer|client|company|account)\s+(?:called|named)?\s*(.+?)(?:\s+in\s+[A-Za-z].*)?(?:\.|$)/i,
    /(?:register|onboard|setup|set\s*up)\s+(.+?)(?:\s+as\s+(?:a\s+)?(?:client|customer).*)?(?:\.|$)/i,
    /(?:as\s+(?:a\s+)?(?:client|customer))\s+(.+?)(?:\.|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = stripLocationSuffix(
        match[1]
          .replace(/^(a|an|the|new)\s+/i, "")
          .replace(/\s+as\s+(a\s+)?(client|customer|account).*$/i, "")
          .trim(),
      );
      if (cleaned.length >= 2) return cleaned;
    }
  }

  // Capitalised multi-word company-like span
  const caps = text.match(
    /\b([A-Z][A-Za-z0-9&'.-]+(?:\s+[A-Z][A-Za-z0-9&'.-]+){0,5}(?:\s+(?:Ltd|Limited|LLC|Inc|PLC|LLP))?)\b/,
  );
  if (caps?.[1] && !/^(Create|Add|Register|Please|We|I|Set|Open)$/i.test(caps[1])) {
    return stripLocationSuffix(caps[1]);
  }

  return null;
}

function requiredFieldsFromSchema(descriptor: AssistantActionDescriptor): string[] {
  const schema = descriptor.inputSchema;
  if (!schema || typeof schema !== "object") return [];
  const required = (schema as { required?: unknown }).required;
  return Array.isArray(required)
    ? required.filter((field): field is string => typeof field === "string")
    : [];
}

function scoreDescriptor(message: string, descriptor: AssistantActionDescriptor): number {
  const lower = message.toLowerCase();
  const tokens = tokenize(message);
  const hay = `${descriptor.id} ${descriptor.name} ${descriptor.description} ${descriptor.module}`.toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (hay.includes(token)) score += 2;
  }

  for (const [concept, aliases] of Object.entries(SEMANTIC_ALIASES)) {
    const messageHas = aliases.some((alias) => lower.includes(alias));
    const actionHas =
      hay.includes(concept) || aliases.some((alias) => hay.includes(alias));
    if (messageHas && actionHas) score += 4;
  }

  // Prefer create* when message expresses creation/signing/new relationship
  if (
    /\b(signed|signing|new\s+customer|new\s+client|register|onboard|set\s*up)\b/i.test(lower) &&
    /create/i.test(descriptor.id)
  ) {
    score += 5;
  }

  return score;
}

function buildInputForAction(
  message: string,
  actionId: string,
  llmInput?: Record<string, unknown> | null,
): Record<string, unknown> {
  const input: Record<string, unknown> = { ...(llmInput ?? {}) };
  const entity = extractBusinessEntity(message);
  const location = extractLocation(message);
  const definition = getAssistantAction(actionId);
  const schema = definition?.inputSchema;
  const props =
    schema && typeof schema === "object" && "properties" in schema
      ? ((schema as { properties?: Record<string, unknown> }).properties ?? {})
      : {};

  if (entity) {
    if ("companyName" in props && input.companyName == null) input.companyName = entity;
    if ("clientName" in props && input.clientName == null) input.clientName = entity;
    if ("name" in props && input.name == null && !("companyName" in props)) input.name = entity;
    if (!Object.keys(props).length) {
      input.companyName = entity;
      input.clientName = entity;
    }
  }

  if (location) {
    // Cities belong in companyCity — region is a constrained ClientRegion enum, not free text.
    if ("companyCity" in props && input.companyCity == null) input.companyCity = location;
    if ("region" in props && input.region == null) {
      if (
        /\b(london|manchester|birmingham|oxford|cambridge|edinburgh|glasgow|bristol|leeds)\b/i.test(
          location,
        )
      ) {
        input.region = "United Kingdom";
      }
    }
  }

  return input;
}

function missingRequired(
  actionId: string,
  input: Record<string, unknown>,
): string[] {
  const definition = getAssistantAction(actionId);
  if (!definition) return ["action"];
  const required = requiredFieldsFromSchema(definition);
  return required.filter((field) => {
    const value = input[field];
    return value == null || (typeof value === "string" && !value.trim());
  });
}

function questionForMissing(actionId: string, missing: string[]): string {
  const definition = getAssistantAction(actionId);
  const name = definition?.name ?? actionId;
  if (missing.includes("companyName") || missing.includes("clientName") || missing.includes("name")) {
    return `I can ${name.toLowerCase()} — what is the company name?`;
  }
  return `I can ${name.toLowerCase()}, but I still need: ${missing.join(", ")}.`;
}

async function classifyWithLlm(
  message: string,
  business: AssistantBusinessContext,
  descriptors: AssistantActionDescriptor[],
): Promise<{ actionId: string; input: Record<string, unknown>; confidence: number } | null> {
  if (!process.env.OPENAI_API_KEY?.trim() || !descriptors.length) return null;

  const catalog = descriptors.map((d) => ({
    id: d.id,
    name: d.name,
    module: d.module,
    description: d.description,
    required: requiredFieldsFromSchema(d),
    properties: d.inputSchema && typeof d.inputSchema === "object"
      ? (d.inputSchema as { properties?: unknown }).properties ?? null
      : null,
  }));

  try {
    const response = await createAssistantResponse({
      model: getAssistantModel(),
      instructions: `You are the Unit311 Executive Assistant intent classifier.
Map the user's natural-language request to ONE registered business action from the catalogue, or null if it is not an executable write.
Rules:
- Choose by meaning, not exact wording (e.g. "signed Acme", "new customer Acme", "register Acme" → create client when that action exists).
- Only use actionIds from the catalogue.
- Fill input fields from the message when possible.
- confidence 0-1.
- Return JSON only: { "actionId": string|null, "input": object, "confidence": number, "reason": string }`,
      input: [
        {
          role: "user",
          content: JSON.stringify({
            message,
            workspace: business.workspace,
            page: business.page,
            catalogue: catalog,
          }),
        },
      ],
      text: { format: { type: "json_object" as const } },
      store: false,
    });

    const text =
      typeof (response as { output_text?: string }).output_text === "string"
        ? (response as { output_text: string }).output_text
        : "";
    if (!text.trim()) return null;
    const parsed = JSON.parse(text) as {
      actionId?: string | null;
      input?: Record<string, unknown>;
      confidence?: number;
    };
    const actionId = typeof parsed.actionId === "string" ? parsed.actionId.trim() : "";
    if (!actionId || !getAssistantAction(actionId)) return null;
    return {
      actionId,
      input: parsed.input && typeof parsed.input === "object" ? parsed.input : {},
      confidence:
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? parsed.confidence
          : 0.7,
    };
  } catch (error) {
    console.warn("[intent-action-resolver] LLM classify failed:", formatOpenAIError(error));
    return null;
  }
}

function classifyHeuristic(
  message: string,
  descriptors: AssistantActionDescriptor[],
): { actionId: string; confidence: number } | null {
  let best: { actionId: string; score: number } | null = null;
  for (const descriptor of descriptors) {
    const score = scoreDescriptor(message, descriptor);
    if (score > 0 && (!best || score > best.score)) {
      best = { actionId: descriptor.id, score };
    }
  }
  if (!best || best.score < 8) return null;
  return {
    actionId: best.actionId,
    confidence: Math.min(0.95, 0.45 + best.score / 30),
  };
}

/**
 * Resolve a natural-language request to a registered executable business action.
 */
export async function resolveBusinessActionIntent(
  message: string,
  business: AssistantBusinessContext,
): Promise<ResolvedBusinessActionIntent> {
  const text = message.trim();
  if (!text) return { kind: "none", reason: "empty" };

  // Pure read / report asks are not write intents.
  if (
    /\b(pdf|report|export|list|show|how many|what is|who is|brief|dashboard)\b/i.test(text) &&
    !/\b(create|add|register|update|assign|archive|restore|merge|signed|onboard|set\s*up)\b/i.test(
      text,
    )
  ) {
    return { kind: "none", reason: "read_or_report" };
  }

  const descriptors = listAssistantActionDescriptors({ business });
  if (!descriptors.length) {
    return { kind: "none", reason: "no_registered_actions" };
  }

  const llm = await classifyWithLlm(text, business, descriptors);
  const heuristic = classifyHeuristic(text, descriptors);

  const chosen =
    llm && llm.confidence >= 0.55
      ? llm
      : heuristic
        ? { actionId: heuristic.actionId, input: {}, confidence: heuristic.confidence }
        : llm;

  if (!chosen) {
    return { kind: "none", reason: "no_semantic_match" };
  }

  const input = buildInputForAction(text, chosen.actionId, chosen.input);
  const missing = missingRequired(chosen.actionId, input);

  if (missing.length) {
    return {
      kind: "need_info",
      actionId: chosen.actionId,
      input,
      missingFields: missing,
      question: questionForMissing(chosen.actionId, missing),
      reason: "missing_required_fields",
    };
  }

  return {
    kind: "propose",
    actionId: chosen.actionId,
    input,
    confidence: chosen.confidence,
    reason: llm && llm.actionId === chosen.actionId ? "llm_semantic" : "heuristic_semantic",
    missingFields: [],
  };
}

export function formatActionOutcomeMessage(input: {
  title: string;
  fields: Array<{ label: string; value: string }>;
  followUpQuestion?: string | null;
}): string {
  const lines = [`✓ ${input.title}`, ""];
  for (const field of input.fields) {
    lines.push(field.label);
    lines.push(field.value);
    lines.push("");
  }
  if (input.followUpQuestion) {
    lines.push(input.followUpQuestion);
  }
  return lines.join("\n").trim();
}

/**
 * Registry-driven business-action intent resolver.
 *
 * Maps natural language → registered Action Framework capabilities using only
 * descriptor metadata (intentExamples, semanticAliases, entityExtraction, inputSchema).
 * No module-specific hardcoding.
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

/** Tiny generic verb list only — domain nouns come from capability metadata. */
const GENERIC_VERBS: Record<string, string[]> = {
  create: ["create", "add", "register", "setup", "set up", "onboard", "new", "signed", "sign", "start", "launch"],
  update: ["update", "change", "edit", "set", "amend"],
  archive: ["archive", "close", "deactivate", "retire"],
  restore: ["restore", "reactivate", "unarchive", "reopen"],
  assign: ["assign", "appoint", "give"],
  merge: ["merge", "combine", "dedupe", "duplicate"],
  remove: ["remove", "delete"],
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

function extractQuoted(message: string): string | null {
  const quoted = message.match(/[“"']([^”"']{2,80})[”"']/);
  return quoted?.[1] ? stripLocationSuffix(quoted[1].trim()) : null;
}

function extractNamedEntity(message: string): string | null {
  const text = message.trim();
  const quoted = extractQuoted(text);
  if (quoted) return quoted;

  const patterns = [
    /(?:called|named|titled)\s+(.+?)(?:\s+in\s+[A-Za-z].*)?(?:\.|$)/i,
    /(?:signed|signing)\s+(.+?)(?:\s+in\s+[A-Za-z].*)?(?:\.|$)/i,
    /(?:for)\s+(.+?)(?:\.|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = stripLocationSuffix(
        match[1]
          .replace(/^(a|an|the|new)\s+/i, "")
          .trim(),
      );
      if (cleaned.length >= 2) return cleaned;
    }
  }

  const caps = text.match(
    /\b([A-Z][A-Za-z0-9&'.-]+(?:\s+[A-Z][A-Za-z0-9&'.-]+){0,5}(?:\s+(?:Ltd|Limited|LLC|Inc|PLC|LLP))?)\b/,
  );
  if (caps?.[1] && !/^(Create|Add|Register|Please|We|I|Set|Open|Start|Launch)$/i.test(caps[1])) {
    return stripLocationSuffix(caps[1]);
  }
  return null;
}

function extractLocation(message: string): string | null {
  const match = message.match(/\bin\s+([A-Za-z][A-Za-z\s-]{1,40})(?:\.|$)/i);
  return match?.[1]?.trim() || null;
}

function extractEmail(message: string): string | null {
  const match = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? null;
}

function extractPhone(message: string): string | null {
  const match = message.match(
    /(?:\+?\d[\d\s().-]{6,}\d)/,
  );
  return match?.[0]?.trim() ?? null;
}

function extractPerson(message: string): string | null {
  const assign = message.match(
    /(?:assign|appoint)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+as\b/i,
  );
  if (assign?.[1]) return assign[1].trim();
  const contact = message.match(
    /(?:contact|person)\s+(?:called|named)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  );
  return contact?.[1]?.trim() ?? null;
}

function extractUrl(message: string): string | null {
  const match = message.match(/https?:\/\/\S+/i);
  return match?.[0] ?? null;
}

function requiredFieldsFromSchema(descriptor: AssistantActionDescriptor): string[] {
  const schema = descriptor.inputSchema;
  if (!schema || typeof schema !== "object") return [];
  const required = (schema as { required?: unknown }).required;
  return Array.isArray(required)
    ? required.filter((field): field is string => typeof field === "string")
    : [];
}

function optionalFieldsFromSchema(descriptor: AssistantActionDescriptor): string[] {
  const schema = descriptor.inputSchema;
  if (!schema || typeof schema !== "object") return [];
  const props = (schema as { properties?: Record<string, unknown> }).properties;
  if (!props) return [];
  const required = new Set(requiredFieldsFromSchema(descriptor));
  return Object.keys(props).filter((key) => !required.has(key));
}

function scoreDescriptor(message: string, descriptor: AssistantActionDescriptor): number {
  const lower = message.toLowerCase();
  const tokens = tokenize(message);
  const cap = descriptor.capability;
  const hay = [
    descriptor.id,
    descriptor.name,
    descriptor.description,
    descriptor.module,
    cap.businessObject,
    ...(cap.intentExamples ?? []),
    ...(cap.semanticAliases ?? []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (hay.includes(token)) score += 2;
  }

  for (const example of cap.intentExamples ?? []) {
    const exampleTokens = tokenize(example);
    const overlap = exampleTokens.filter((t) => lower.includes(t)).length;
    if (overlap >= 2) score += 6;
    if (overlap >= 3) score += 4;
  }

  for (const alias of cap.semanticAliases ?? []) {
    if (lower.includes(alias.toLowerCase())) score += 3;
  }

  for (const [verb, aliases] of Object.entries(GENERIC_VERBS)) {
    const messageHas = aliases.some((alias) => lower.includes(alias));
    const actionHas =
      hay.includes(verb) ||
      aliases.some((alias) => hay.includes(alias)) ||
      descriptor.id.toLowerCase().includes(verb);
    if (messageHas && actionHas) score += 4;
  }

  return score;
}

function valueForExtraction(
  from: NonNullable<
    NonNullable<AssistantActionDescriptor["capability"]["entityExtraction"]>["fields"]
  >[number]["from"],
  message: string,
): string | null {
  switch (from) {
    case "quoted":
      return extractQuoted(message);
    case "named_entity":
      return extractNamedEntity(message);
    case "location":
      return extractLocation(message);
    case "email":
      return extractEmail(message);
    case "phone":
      return extractPhone(message);
    case "person":
      return extractPerson(message);
    case "url":
      return extractUrl(message);
    default:
      return null;
  }
}

function buildInputForAction(
  message: string,
  actionId: string,
  llmInput?: Record<string, unknown> | null,
): Record<string, unknown> {
  const input: Record<string, unknown> = { ...(llmInput ?? {}) };
  const definition = getAssistantAction(actionId);
  if (!definition) return input;

  const schema = definition.inputSchema;
  const props =
    schema && typeof schema === "object" && "properties" in schema
      ? ((schema as { properties?: Record<string, unknown> }).properties ?? {})
      : {};

  const extraction = definition.capability.entityExtraction;
  const primaryFields = extraction?.primaryNameFields ?? [];
  const named = extractNamedEntity(message);

  if (named) {
    for (const field of primaryFields) {
      if (field in props && input[field] == null) {
        input[field] = named;
      }
    }
  }

  for (const rule of extraction?.fields ?? []) {
    if (!(rule.field in props) || input[rule.field] != null) continue;
    const value = valueForExtraction(rule.from, message);
    if (value) input[rule.field] = value;
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
    if (value != null && !(typeof value === "string" && !value.trim())) return false;
    // Accept alternate primary name fields from capability.
    const primaries = definition.capability.entityExtraction?.primaryNameFields ?? [];
    if (primaries.includes(field)) {
      const filled = primaries.some((alt) => {
        const altVal = input[alt];
        return altVal != null && !(typeof altVal === "string" && !altVal.trim());
      });
      if (filled) {
        // Promote first filled primary into the required field.
        if (input[field] == null) {
          const donor = primaries.find((alt) => {
            const altVal = input[alt];
            return altVal != null && !(typeof altVal === "string" && !altVal.trim());
          });
          if (donor) input[field] = input[donor];
        }
        return false;
      }
    }
    return true;
  });
}

function questionForMissing(actionId: string, missing: string[]): string {
  const definition = getAssistantAction(actionId);
  const name = definition?.name ?? actionId;
  const object = definition?.capability.businessObject ?? "record";
  const primary = definition?.capability.entityExtraction?.primaryNameFields?.[0];
  if (primary && missing.includes(primary)) {
    return `I can ${name.toLowerCase()} — what is the ${object.toLowerCase()} name?`;
  }
  const labels = missing.map((field) =>
    field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim(),
  );
  return `I can ${name.toLowerCase()}, but I still need: ${labels.join(", ")}.`;
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
    businessObject: d.capability.businessObject,
    description: d.description,
    intentExamples: d.capability.intentExamples,
    required: requiredFieldsFromSchema(d),
    optional: optionalFieldsFromSchema(d),
    properties:
      d.inputSchema && typeof d.inputSchema === "object"
        ? ((d.inputSchema as { properties?: unknown }).properties ?? null)
        : null,
  }));

  try {
    const response = await createAssistantResponse({
      model: getAssistantModel(),
      instructions: `You are the Unit311 Executive Assistant intent classifier.
Map the user's natural-language request to ONE registered business capability from the catalogue, or null if it is not an executable write.
Rules:
- Choose by meaning using businessObject, description, and intentExamples — never invent actionIds.
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
    !/\b(create|add|register|update|assign|archive|restore|merge|signed|onboard|set\s*up|start|launch)\b/i.test(
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

/** @deprecated Prefer capability.entityExtraction via resolveBusinessActionIntent */
export function extractBusinessEntity(message: string): string | null {
  return extractNamedEntity(message);
}

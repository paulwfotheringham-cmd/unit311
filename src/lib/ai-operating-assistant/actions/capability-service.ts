/**
 * Capability Service — self-describing EA surface over the Action Registry.
 *
 * The assistant must not contain business knowledge. Everything is discovered
 * from registered action capability metadata and the Capability Graph built at startup.
 */

import type { AssistantBusinessContext } from "../types";
import { listAssistantActions } from "./registry";
import type {
  AssistantActionCapability,
  AssistantActionDefinition,
  AssistantCapabilityRelationship,
} from "./types";
import { userHasActionPermissions } from "./permissions";

export type CapabilityRecord = {
  actionId: string;
  capabilityId: string;
  title: string;
  businessObject: string;
  module: string;
  description: string;
  intentExamples: string[];
  semanticAliases: string[];
  requiredFields: string[];
  optionalFields: string[];
  validationSchema: Record<string, unknown> | null;
  permissions: string[];
  confirmationPolicy: AssistantActionCapability["confirmationPolicy"];
  successFormatter: AssistantActionCapability["successFormatter"];
  suggestedFollowUpActions: AssistantCapabilityRelationship[];
  relationships: {
    suggestedNext: AssistantCapabilityRelationship[];
    related: AssistantCapabilityRelationship[];
  };
  /** Human statement: "I can create Clients." */
  statement: string;
};

export type CapabilityGraphEdge = {
  fromCapabilityId: string;
  toCapabilityId: string;
  toActionId: string;
  label: string;
  kind: "suggestedNext" | "related";
  reason?: string;
};

export type CapabilityGraph = {
  builtAt: string;
  capabilities: CapabilityRecord[];
  byCapabilityId: Record<string, CapabilityRecord>;
  byActionId: Record<string, CapabilityRecord>;
  byBusinessObject: Record<string, CapabilityRecord[]>;
  edges: CapabilityGraphEdge[];
  statements: string[];
};

let cachedGraph: CapabilityGraph | null = null;

function schemaFields(definition: AssistantActionDefinition): {
  required: string[];
  optional: string[];
  schema: Record<string, unknown> | null;
} {
  const schema =
    definition.inputSchema && typeof definition.inputSchema === "object"
      ? (definition.inputSchema as Record<string, unknown>)
      : null;
  const required = Array.isArray(schema?.required)
    ? (schema!.required as unknown[]).filter((f): f is string => typeof f === "string")
    : [];
  const props =
    schema?.properties && typeof schema.properties === "object"
      ? Object.keys(schema.properties as Record<string, unknown>)
      : [];
  const optional = props.filter((p) => !required.includes(p));
  return { required, optional, schema };
}

function verbPhraseFromAction(definition: AssistantActionDefinition): string {
  const name = definition.name.trim();
  if (!name) return `work with ${definition.capability.businessObject}`;
  // Prefer "create Clients" style from name + pluralized object when useful.
  const object = definition.capability.businessObject;
  const lower = name.toLowerCase();
  if (lower.startsWith("create ")) return `create ${pluralize(object)}`;
  if (lower.startsWith("update ")) return `update ${pluralize(object)}`;
  if (lower.startsWith("archive ")) return `archive ${pluralize(object)}`;
  if (lower.startsWith("restore ")) return `restore ${pluralize(object)}`;
  if (lower.startsWith("assign ")) return lower;
  if (lower.startsWith("add ")) return lower;
  if (lower.startsWith("merge ")) return lower;
  if (lower.startsWith("remove ")) return lower;
  return lower;
}

function pluralize(object: string): string {
  const trimmed = object.trim();
  if (!trimmed) return "records";
  if (/s$/i.test(trimmed)) return trimmed;
  if (/y$/i.test(trimmed) && !/[aeiou]y$/i.test(trimmed)) {
    return `${trimmed.slice(0, -1)}ies`;
  }
  return `${trimmed}s`;
}

function mergeSuggestedNext(
  definition: AssistantActionDefinition,
): AssistantCapabilityRelationship[] {
  const fromRelationships = definition.capability.relationships?.suggestedNext ?? [];
  const fromFollowUps: AssistantCapabilityRelationship[] = (
    definition.capability.suggestedFollowUps ?? []
  ).map((f) => ({
    label: f.label,
    actionId: f.actionId,
  }));
  const seen = new Set<string>();
  const merged: AssistantCapabilityRelationship[] = [];
  for (const edge of [...fromRelationships, ...fromFollowUps]) {
    const key = `${edge.actionId ?? ""}|${edge.capabilityId ?? ""}|${edge.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(edge);
  }
  return merged;
}

export function toCapabilityRecord(definition: AssistantActionDefinition): CapabilityRecord {
  const { required, optional, schema } = schemaFields(definition);
  const capabilityId = definition.capability.id?.trim() || definition.id;
  const suggestedNext = mergeSuggestedNext(definition);
  const related = definition.capability.relationships?.related ?? [];

  return {
    actionId: definition.id,
    capabilityId,
    title: definition.name,
    businessObject: definition.capability.businessObject,
    module: definition.module,
    description: definition.description,
    intentExamples: definition.capability.intentExamples,
    semanticAliases: definition.capability.semanticAliases ?? [],
    requiredFields: required,
    optionalFields: optional,
    validationSchema: schema,
    permissions: definition.requiredPermissions,
    confirmationPolicy: definition.capability.confirmationPolicy,
    successFormatter: definition.capability.successFormatter,
    suggestedFollowUpActions: suggestedNext,
    relationships: {
      suggestedNext,
      related,
    },
    statement: `I can ${verbPhraseFromAction(definition)}.`,
  };
}

function resolveTargetActionId(
  edge: AssistantCapabilityRelationship,
  byCapabilityId: Map<string, CapabilityRecord>,
  byActionId: Map<string, CapabilityRecord>,
): string | null {
  if (edge.actionId && byActionId.has(edge.actionId)) return edge.actionId;
  if (edge.capabilityId && byCapabilityId.has(edge.capabilityId)) {
    return byCapabilityId.get(edge.capabilityId)!.actionId;
  }
  if (edge.actionId) return edge.actionId;
  return null;
}

/**
 * Build (or rebuild) the Capability Graph from the live Action Registry.
 */
export function buildCapabilityGraph(options?: { force?: boolean }): CapabilityGraph {
  if (cachedGraph && !options?.force) return cachedGraph;

  const actions = listAssistantActions();
  const capabilities = actions.map(toCapabilityRecord);
  const byCapabilityId = new Map(capabilities.map((c) => [c.capabilityId, c]));
  const byActionId = new Map(capabilities.map((c) => [c.actionId, c]));

  const edges: CapabilityGraphEdge[] = [];
  for (const cap of capabilities) {
    for (const edge of cap.relationships.suggestedNext) {
      const toActionId = resolveTargetActionId(edge, byCapabilityId, byActionId);
      if (!toActionId) continue;
      const target = byActionId.get(toActionId);
      edges.push({
        fromCapabilityId: cap.capabilityId,
        toCapabilityId: target?.capabilityId ?? toActionId,
        toActionId,
        label: edge.label,
        kind: "suggestedNext",
        reason: edge.reason,
      });
    }
    for (const edge of cap.relationships.related) {
      const toActionId = resolveTargetActionId(edge, byCapabilityId, byActionId);
      if (!toActionId) continue;
      const target = byActionId.get(toActionId);
      edges.push({
        fromCapabilityId: cap.capabilityId,
        toCapabilityId: target?.capabilityId ?? toActionId,
        toActionId,
        label: edge.label,
        kind: "related",
        reason: edge.reason,
      });
    }
  }

  const byBusinessObject: Record<string, CapabilityRecord[]> = {};
  for (const cap of capabilities) {
    const key = cap.businessObject;
    if (!byBusinessObject[key]) byBusinessObject[key] = [];
    byBusinessObject[key]!.push(cap);
  }

  const statements = [...new Set(capabilities.map((c) => c.statement))].sort((a, b) =>
    a.localeCompare(b),
  );

  cachedGraph = {
    builtAt: new Date().toISOString(),
    capabilities,
    byCapabilityId: Object.fromEntries(byCapabilityId),
    byActionId: Object.fromEntries(byActionId),
    byBusinessObject,
    edges,
    statements,
  };

  console.info(
    `[EA] Capability Graph ready: ${capabilities.length} capabilities, ${edges.length} relationships, objects=[${Object.keys(byBusinessObject).sort().join(", ")}]`,
  );

  return cachedGraph;
}

export function getCapabilityGraph(): CapabilityGraph {
  return buildCapabilityGraph();
}

export function invalidateCapabilityGraph() {
  cachedGraph = null;
}

export function listCapabilities(filter?: {
  business?: AssistantBusinessContext;
  module?: string;
  businessObject?: string;
}): CapabilityRecord[] {
  const graph = buildCapabilityGraph();
  let list = graph.capabilities;
  if (filter?.module) {
    list = list.filter((c) => c.module === filter.module);
  }
  if (filter?.businessObject) {
    const needle = filter.businessObject.toLowerCase();
    list = list.filter((c) => c.businessObject.toLowerCase() === needle);
  }
  if (filter?.business) {
    list = list.filter((c) => {
      const action = listAssistantActions().find((a) => a.id === c.actionId);
      if (!action) return false;
      return userHasActionPermissions(filter.business!, action.requiredPermissions);
    });
  }
  return list;
}

export function getCapabilityByActionId(actionId: string): CapabilityRecord | null {
  return buildCapabilityGraph().byActionId[actionId] ?? null;
}

export function getSuggestedNextCapabilities(actionId: string): CapabilityRecord[] {
  const graph = buildCapabilityGraph();
  const source = graph.byActionId[actionId];
  if (!source) return [];
  return graph.edges
    .filter((e) => e.fromCapabilityId === source.capabilityId && e.kind === "suggestedNext")
    .map((e) => graph.byActionId[e.toActionId])
    .filter((c): c is CapabilityRecord => Boolean(c));
}

export type CapabilitySearchHit = {
  capability: CapabilityRecord;
  score: number;
  matchedOn: string[];
};

/**
 * Search the Capability Graph by natural language / keywords.
 * Used for "What can you do?" and "Can you create suppliers?"
 */
export function searchCapabilities(
  query: string,
  filter?: { business?: AssistantBusinessContext },
): CapabilitySearchHit[] {
  const text = query.trim().toLowerCase();
  if (!text) {
    return listCapabilities({ business: filter?.business }).map((capability) => ({
      capability,
      score: 1,
      matchedOn: ["catalogue"],
    }));
  }

  const tokens = text
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !["can", "you", "do", "what", "are", "able", "to", "a", "an", "the", "please"].includes(t));

  const hits: CapabilitySearchHit[] = [];
  for (const capability of listCapabilities({ business: filter?.business })) {
    const hay = [
      capability.actionId,
      capability.capabilityId,
      capability.title,
      capability.description,
      capability.businessObject,
      capability.module,
      ...capability.intentExamples,
      ...capability.semanticAliases,
      capability.statement,
    ]
      .join(" ")
      .toLowerCase();

    let score = 0;
    const matchedOn: string[] = [];
    for (const token of tokens) {
      if (capability.businessObject.toLowerCase().includes(token)) {
        score += 8;
        matchedOn.push(`object:${token}`);
      }
      if (capability.semanticAliases.some((a) => a.toLowerCase().includes(token))) {
        score += 5;
        matchedOn.push(`alias:${token}`);
      }
      if (hay.includes(token)) {
        score += 2;
        matchedOn.push(`text:${token}`);
      }
    }
    if (/\bcreate\b/.test(text) && /create/i.test(capability.actionId + capability.title)) {
      score += 4;
      matchedOn.push("verb:create");
    }
    if (/\binvoice\b/.test(text) && /invoice/i.test(hay)) {
      score += 6;
      matchedOn.push("verb:invoice");
    }
    if (score > 0) hits.push({ capability, score, matchedOn: [...new Set(matchedOn)] });
  }

  return hits.sort((a, b) => b.score - a.score || a.capability.title.localeCompare(b.capability.title));
}

export type CapabilityQuestionAnswer = {
  kind: "catalogue" | "search" | "unsupported";
  answer: string;
  capabilities: CapabilityRecord[];
  statements: string[];
};

/**
 * Answer capability questions purely from the registry / graph.
 */
export function answerCapabilityQuestion(
  message: string,
  filter?: { business?: AssistantBusinessContext },
): CapabilityQuestionAnswer | null {
  const text = message.trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  const isCatalogue =
    /^(what\s+can\s+you\s+do|what\s+are\s+you\s+(able|capable)\s+of|list\s+(your\s+)?(capabilities|actions)|show\s+(me\s+)?(what\s+you\s+can\s+do|your\s+capabilities))\??$/i.test(
      lower,
    ) ||
    /\b(what\s+can\s+you\s+do|list\s+your\s+capabilities|what\s+actions\s+(are\s+)?available)\b/i.test(
      lower,
    );

  const isCanYou =
    /\b(can\s+you|are\s+you\s+able\s+to|do\s+you\s+support|is\s+it\s+possible\s+to)\b/i.test(lower);

  if (!isCatalogue && !isCanYou) return null;

  if (isCatalogue && !isCanYou) {
    const capabilities = listCapabilities({ business: filter?.business });
    const statements = capabilities.map((c) => c.statement);
    const byObject = Object.entries(
      capabilities.reduce<Record<string, string[]>>((acc, cap) => {
        const key = cap.businessObject;
        if (!acc[key]) acc[key] = [];
        acc[key]!.push(cap.title);
        return acc;
      }, {}),
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([object, titles]) => `• ${object}: ${titles.join(", ")}`)
      .join("\n");

    return {
      kind: "catalogue",
      answer: [
        "Here is what I can do from the live Action Registry:",
        "",
        ...statements.map((s) => `• ${s}`),
        "",
        "By business object:",
        byObject || "• (none registered)",
      ].join("\n"),
      capabilities,
      statements,
    };
  }

  const hits = searchCapabilities(text, filter);
  const strong = hits.filter((h) => h.score >= 8);
  if (strong.length) {
    const top = strong.slice(0, 8);
    return {
      kind: "search",
      answer: [
        "Yes — matching capabilities from the Action Registry:",
        "",
        ...top.map(
          (h) =>
            `• ${h.capability.statement} (${h.capability.actionId})`,
        ),
        "",
        "Tell me what you want done and I will propose an Action Plan for approval.",
      ].join("\n"),
      capabilities: top.map((h) => h.capability),
      statements: top.map((h) => h.capability.statement),
    };
  }

  // Explicit "can you X?" with no registry match → unsupported (not invented).
  const graph = buildCapabilityGraph();
  return {
    kind: "unsupported",
    answer: [
      "I do not currently have a registered capability that matches that request.",
      "",
      "Registered business objects:",
      ...Object.keys(graph.byBusinessObject)
        .sort()
        .map((o) => `• ${o}`),
      "",
      "Ask “What can you do?” to see the full catalogue, or register a new action with capability metadata to enable it.",
    ].join("\n"),
    capabilities: [],
    statements: graph.statements,
  };
}

/** Detect capability Q&A without treating it as a write intent. */
export function isCapabilityQuestion(message: string): boolean {
  return answerCapabilityQuestion(message) != null;
}

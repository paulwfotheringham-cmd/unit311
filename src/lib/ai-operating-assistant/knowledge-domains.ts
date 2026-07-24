/**
 * Executive Assistant knowledge domains — permanent foundation.
 *
 * These three domains are completely independent. Routing must choose one
 * before tools are selected. Never answer a domain from another domain’s source.
 *
 * 1) PLATFORM   → Application Catalogue (modules / apps / pages / views)
 * 2) CAPABILITY → Action Registry / Capability Graph (executable actions)
 * 3) BUSINESS   → Live business data tools (clients, projects, invoices, …)
 *
 * Write requests are a CAPABILITY path that ends in the Action Framework
 * (propose → Plan Viewer → executeActionPlan), not a fourth knowledge source.
 */

export type EaKnowledgeDomain =
  | "platform"
  | "capability"
  | "business"
  | "write"
  | "unknown";

export type EaKnowledgeClassification = {
  domain: EaKnowledgeDomain;
  reason: string;
};

const PLATFORM_HINT =
  /\b(modules?|application\s+catalogue|platform\s+structure|what\s+is\s+under|applications?\s+(are\s+)?under|apps?\s+(are\s+)?under|pages?\s+(are\s+)?under|open\s+(financials|human\s+resources|hr|operations|settings|business\s+central)|where\s+(do\s+i|can\s+i|is)|go\s+to\s+(financials|hr|human\s+resources))\b/i;

const CAPABILITY_HINT =
  /\b(what\s+can\s+you\s+do|what\s+are\s+you\s+(able|capable)\s+of|list\s+(your\s+)?(capabilities|actions)|what\s+actions?\s+(exist|are\s+(there|available)|for)|can\s+you\s+(create|add|archive|update|assign|merge)|capabilities?\s+for|actions?\s+for)\b/i;

const WRITE_HINT =
  /\b(create|add|register|archive|restore|assign|merge|update|delete|terminate|approve\s+payment|signed|signing|we've\s+just\s+signed|just\s+signed)\b/i;

const BUSINESS_HINT =
  /\b(show\s+(my\s+)?|list\s+(my\s+)?|how\s+many|how\s+much\s+cash|who\s+(manages|owns|is|owes)|overdue|at\s+risk|biggest\s+risks|outstanding|which\s+projects|clients?\b|employees?\b|invoices?\b|headcount|cash\s+(position|do\s+we\s+have|balance)|overloaded|workload|what\s+(has\s+)?changed|what\s+happened|miss\s+deadlines?|highest\s+overdue|summarise|summarize|attention|focus\s+on\s+today|opportunities|pipeline|behind\s+schedule|delegate|meeting\s+with|leave|overnight|since\s+yesterday)\b/i;

/**
 * Coarse domain classification used before tool selection.
 * Fine-grained handlers (Application Catalogue / Capability Graph / intent router)
 * remain the source of truth for answers — this only enforces domain priority.
 */
export function classifyKnowledgeDomain(message: string): EaKnowledgeClassification {
  const text = message.trim();
  if (!text) return { domain: "unknown", reason: "empty" };
  const lower = text.toLowerCase();

  // Platform structure first — never confuse with Action Registry.
  if (
    PLATFORM_HINT.test(lower) &&
    !/\b(what\s+can\s+you\s+do|what\s+actions?\s+exist\s+for|capabilities?\s+for)\b/i.test(lower)
  ) {
    // "Show my clients" is business data, not "show me [module]".
    if (
      /\b(show|list)\s+(my\s+)?(clients?|projects?|employees?|invoices?|tasks?)\b/i.test(lower)
    ) {
      return { domain: "business", reason: "live_list_request" };
    }
    return { domain: "platform", reason: "platform_structure_language" };
  }

  // Capability catalogue / discovery (not execution yet).
  if (
    CAPABILITY_HINT.test(lower) &&
    !/\b(called|named)\b/i.test(lower) &&
    !/\b(ltd|limited|llc|inc|plc)\b/i.test(lower)
  ) {
    return { domain: "capability", reason: "capability_discovery_language" };
  }

  // Explicit write with entity → Action Framework.
  if (
    WRITE_HINT.test(lower) &&
    (/\b(called|named|titled)\b/i.test(lower) ||
      /\b(ltd|limited|llc|inc|plc|holdings|engineering)\b/i.test(lower) ||
      /\b(this|that|the)\s+(client|project|employee|invoice)\b/i.test(lower))
  ) {
    return { domain: "write", reason: "write_with_entity" };
  }

  if (WRITE_HINT.test(lower) && !/\b(what|which|where|how\s+many|show|list)\b/i.test(lower)) {
    return { domain: "write", reason: "write_language" };
  }

  if (BUSINESS_HINT.test(lower)) {
    return { domain: "business", reason: "live_business_language" };
  }

  return { domain: "unknown", reason: "fallback" };
}

export const KNOWLEDGE_DOMAIN_SOURCES = {
  platform: {
    name: "Application Catalogue",
    purpose: "Understand the Unit311 Central platform (modules → applications → pages/views).",
    tools: ["listPlatformModules", "searchApplications"],
  },
  capability: {
    name: "Action Registry",
    purpose: "Understand executable business capabilities.",
    tools: ["listBusinessActions", "searchCapabilities"],
  },
  business: {
    name: "Live business data",
    purpose: "Understand the user’s organisation records.",
    tools: ["queryBusiness", "searchClients", "searchProjects", "searchInvoices", "searchEmployees"],
  },
  write: {
    name: "Action Framework",
    purpose: "Propose and execute registered write capabilities via Plan Viewer.",
    tools: ["proposeBusinessActionPlan", "planBusinessGoal"],
  },
} as const;

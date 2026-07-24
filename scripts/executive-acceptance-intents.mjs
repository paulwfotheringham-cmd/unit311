/**
 * Fast local gate: CEO acceptance prompts → expected direct intents / domains.
 * Does not hit production. Run before deploy; pair with executive-acceptance-suite.mjs.
 *
 * Usage: node --import tsx scripts/executive-acceptance-intents.mjs
 */
import { resolveDirectIntent } from "../src/lib/ai-operating-assistant/intent-router.ts";
import { classifyKnowledgeDomain } from "../src/lib/ai-operating-assistant/knowledge-domains.ts";

/** @type {{ id: string; prompt: string; domain: string; tool?: string; writeOk?: boolean }[]} */
const CASES = [
  { id: "overview.overnight", prompt: "What happened overnight?", domain: "business", tool: "getDailyBrief" },
  {
    id: "overview.attention",
    prompt: "What requires my attention today?",
    domain: "business",
    tool: "getDailyBrief",
  },
  {
    id: "overview.summarise",
    prompt: "Summarise the business.",
    domain: "business",
    tool: "queryBusiness",
  },
  {
    id: "overview.changed",
    prompt: "What has changed since yesterday?",
    domain: "business",
    tool: "getDailyBrief",
  },
  {
    id: "sales.signed",
    prompt: "We've signed a new client.",
    domain: "write",
    writeOk: true,
  },
  {
    id: "sales.opportunities",
    prompt: "Show my biggest opportunities.",
    domain: "business",
    tool: "searchCRM",
  },
  {
    id: "sales.customers_at_risk",
    prompt: "Which customers are at risk?",
    domain: "business",
    tool: "getSmartInsights",
  },
  {
    id: "projects.create_acme",
    prompt: "Create a project for Acme.",
    domain: "write",
    writeOk: true,
  },
  {
    id: "projects.behind",
    prompt: "Which projects are behind schedule?",
    domain: "business",
    tool: "getSmartInsights",
  },
  {
    id: "projects.highest_risk",
    prompt: "Show my highest-risk projects.",
    domain: "business",
    tool: "getSmartInsights",
  },
  {
    id: "finance.cash",
    prompt: "How much cash do we have?",
    domain: "business",
    tool: "getCashPosition",
  },
  {
    id: "finance.overdue_invoices",
    prompt: "Which invoices are overdue?",
    domain: "business",
    tool: "searchInvoices",
  },
  {
    id: "finance.who_owes",
    prompt: "Who owes us the most money?",
    domain: "business",
    tool: "searchInvoices",
  },
  {
    id: "people.overloaded",
    prompt: "Who is overloaded?",
    domain: "business",
    tool: "getSmartInsights",
  },
  {
    id: "people.leave",
    prompt: "Show me today's leave.",
    domain: "business",
    tool: "searchLeave",
  },
  {
    id: "people.meeting_sarah",
    prompt: "Prepare for my meeting with Sarah.",
    domain: "business",
    tool: "platformSearch",
  },
  {
    id: "ops.focus",
    prompt: "What should I focus on today?",
    domain: "business",
    tool: "getDailyBrief",
  },
  {
    id: "ops.risks",
    prompt: "What are the biggest risks?",
    domain: "business",
    tool: "getSmartInsights",
  },
  {
    id: "ops.delegate",
    prompt: "What should I delegate?",
    domain: "business",
    tool: "getSmartInsights",
  },
];

let failed = 0;
for (const c of CASES) {
  const domain = classifyKnowledgeDomain(c.prompt);
  const intent = resolveDirectIntent(c.prompt, []);
  /** @type {string[]} */
  const errs = [];

  if (c.writeOk) {
    if (domain.domain !== "write" && domain.domain !== "capability") {
      errs.push(`domain=${domain.domain} (want write)`);
    }
  } else if (domain.domain !== c.domain && !(c.domain === "business" && domain.domain === "business")) {
    // business expected; platform/capability/write are wrong
    if (["platform", "capability", "write"].includes(domain.domain)) {
      errs.push(`domain=${domain.domain} (want ${c.domain})`);
    } else if (domain.domain !== c.domain) {
      errs.push(`domain=${domain.domain} (want ${c.domain})`);
    }
  }

  if (c.tool) {
    if (!intent || intent.tool !== c.tool) {
      errs.push(`tool=${intent?.tool || "none"} (want ${c.tool})`);
    }
  }

  if (errs.length) {
    failed += 1;
    console.log(`FAIL ${c.id}: ${errs.join("; ")}`);
  } else {
    console.log(
      `PASS ${c.id} → domain=${domain.domain}` +
        (intent ? ` tool=${intent.tool}` : " (write/orchestration)"),
    );
  }
}

if (failed) {
  console.error(`\nIntent gate failed: ${failed}/${CASES.length}`);
  process.exit(1);
}
console.log(`\nIntent gate passed: ${CASES.length}/${CASES.length}`);

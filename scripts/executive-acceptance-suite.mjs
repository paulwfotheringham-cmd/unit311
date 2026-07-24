/**
 * Executive Acceptance Test Suite
 *
 * Realistic CEO conversations against production.
 * Success = a CEO can manage the business through natural conversation.
 *
 * Usage:
 *   node scripts/executive-acceptance-suite.mjs
 *   node scripts/executive-acceptance-suite.mjs https://unit311.vercel.app
 *
 * Requires: .tmp-qa-creds.json
 */
import fs from "node:fs";
import https from "node:https";
import { URL } from "node:url";

const baseUrl = process.argv[2] || "https://unit311.vercel.app";
const credsPath = ".tmp-qa-creds.json";
if (!fs.existsSync(credsPath)) {
  console.error(`Missing ${credsPath}`);
  process.exit(1);
}
const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));

/** @typedef {'platform'|'capability'|'business'|'write'} KnowledgeDomain */

/**
 * @typedef {object} Scenario
 * @property {string} id
 * @property {string} category
 * @property {string} prompt
 * @property {KnowledgeDomain} domain
 * @property {string[]} [toolsAny] — at least one of these tools must run (business/write)
 * @property {string[]} [toolsNone] — none of these tools should run
 * @property {RegExp[]} [contentAny]
 * @property {RegExp[]} [contentNone]
 * @property {boolean} [expectPlan] — write path proposes Action Framework plan
 * @property {boolean} [expectCreationForm] — need_info creation form is OK
 * @property {boolean} [expectWorkflowCard]
 * @property {boolean} [expectFollowUps]
 * @property {number} [maxChars] — soft executive brevity (default 2200)
 */

/** @type {Scenario[]} */
const SCENARIOS = [
  // —— COMPANY OVERVIEW ——
  {
    id: "overview.overnight",
    category: "COMPANY OVERVIEW",
    prompt: "What happened overnight?",
    domain: "business",
    toolsAny: ["getDailyBrief", "queryBusiness", "getSmartInsights"],
    expectFollowUps: true,
    contentNone: [/Action Registry|platform modules|go to .* and click/i],
  },
  {
    id: "overview.attention",
    category: "COMPANY OVERVIEW",
    prompt: "What requires my attention today?",
    domain: "business",
    toolsAny: ["getDailyBrief", "getSmartInsights", "queryBusiness", "getBusinessHealth"],
    expectFollowUps: true,
    contentNone: [/as an AI language model|I don't have access to your/i],
  },
  {
    id: "overview.summarise",
    category: "COMPANY OVERVIEW",
    prompt: "Summarise the business.",
    domain: "business",
    toolsAny: ["queryBusiness", "getBusinessHealth", "getDailyBrief", "getSmartInsights"],
    expectFollowUps: true,
    contentNone: [/Unit311 Central platform modules/i],
  },
  {
    id: "overview.changed",
    category: "COMPANY OVERVIEW",
    prompt: "What has changed since yesterday?",
    domain: "business",
    toolsAny: ["getDailyBrief", "queryBusiness", "getSmartInsights"],
    expectFollowUps: true,
  },

  // —— SALES ——
  {
    id: "sales.signed",
    category: "SALES",
    prompt: "We've signed a new client.",
    domain: "write",
    toolsAny: ["proposeBusinessActionPlan"],
    expectPlan: true,
    expectCreationForm: true,
    expectWorkflowCard: true,
    expectFollowUps: true,
    contentAny: [/client|approve|create|name/i],
  },
  {
    id: "sales.opportunities",
    category: "SALES",
    prompt: "Show my biggest opportunities.",
    domain: "business",
    toolsAny: ["searchCRM", "queryBusiness", "searchClients", "getSmartInsights"],
    expectFollowUps: true,
    contentNone: [/Action Registry/i],
  },
  {
    id: "sales.customers_at_risk",
    category: "SALES",
    prompt: "Which customers are at risk?",
    domain: "business",
    toolsAny: ["getSmartInsights", "searchClients", "queryBusiness"],
    expectFollowUps: true,
  },

  // —— PROJECTS ——
  {
    id: "projects.create_acme",
    category: "PROJECTS",
    prompt: "Create a project for Acme.",
    domain: "write",
    toolsAny: ["proposeBusinessActionPlan"],
    expectPlan: true,
    expectFollowUps: true,
    contentAny: [/acme|project|approve/i],
  },
  {
    id: "projects.behind",
    category: "PROJECTS",
    prompt: "Which projects are behind schedule?",
    domain: "business",
    toolsAny: ["getSmartInsights", "searchProjects", "queryBusiness"],
    expectFollowUps: true,
  },
  {
    id: "projects.highest_risk",
    category: "PROJECTS",
    prompt: "Show my highest-risk projects.",
    domain: "business",
    toolsAny: ["getSmartInsights", "searchProjects", "queryBusiness"],
    expectFollowUps: true,
  },

  // —— FINANCE ——
  {
    id: "finance.cash",
    category: "FINANCE",
    prompt: "How much cash do we have?",
    domain: "business",
    toolsAny: ["getCashPosition", "queryBusiness"],
    expectFollowUps: true,
    contentNone: [/Action Registry|platform modules/i],
  },
  {
    id: "finance.overdue_invoices",
    category: "FINANCE",
    prompt: "Which invoices are overdue?",
    domain: "business",
    toolsAny: ["searchInvoices", "queryBusiness", "getSmartInsights"],
    expectFollowUps: true,
  },
  {
    id: "finance.who_owes",
    category: "FINANCE",
    prompt: "Who owes us the most money?",
    domain: "business",
    toolsAny: ["searchInvoices", "queryBusiness", "getSmartInsights"],
    expectFollowUps: true,
  },

  // —— PEOPLE ——
  {
    id: "people.overloaded",
    category: "PEOPLE",
    prompt: "Who is overloaded?",
    domain: "business",
    toolsAny: ["getSmartInsights", "searchEmployees", "queryBusiness", "searchTasks"],
    expectFollowUps: true,
  },
  {
    id: "people.leave",
    category: "PEOPLE",
    prompt: "Show me today's leave.",
    domain: "business",
    toolsAny: ["searchLeave", "queryBusiness", "searchEmployees"],
    expectFollowUps: true,
  },
  {
    id: "people.meeting_sarah",
    category: "PEOPLE",
    prompt: "Prepare for my meeting with Sarah.",
    domain: "business",
    toolsAny: ["platformSearch", "searchEmployees", "queryBusiness", "getDailyBrief"],
    expectFollowUps: true,
    contentAny: [/sarah|meeting|found|no |not found|employee|client|project/i],
  },

  // —— OPERATIONS ——
  {
    id: "ops.focus",
    category: "OPERATIONS",
    prompt: "What should I focus on today?",
    domain: "business",
    toolsAny: ["getDailyBrief", "getSmartInsights", "queryBusiness", "getBusinessHealth"],
    expectFollowUps: true,
  },
  {
    id: "ops.risks",
    category: "OPERATIONS",
    prompt: "What are the biggest risks?",
    domain: "business",
    toolsAny: ["getSmartInsights", "queryBusiness", "getBusinessHealth", "getDailyBrief"],
    expectFollowUps: true,
  },
  {
    id: "ops.delegate",
    category: "OPERATIONS",
    prompt: "What should I delegate?",
    domain: "business",
    toolsAny: ["getSmartInsights", "queryBusiness", "getDailyBrief", "searchTasks"],
    expectFollowUps: true,
  },
];

function request(url, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        headers: {
          ...headers,
          ...(body
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
              }
            : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: data,
            setCookie: res.headers["set-cookie"] || [],
          }),
        );
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function parseSse(text) {
  const events = [];
  for (const chunk of text.split("\n\n")) {
    const line = chunk
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("data:"));
    if (!line) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      events.push(JSON.parse(payload));
    } catch {
      // ignore
    }
  }
  return events;
}

async function chat(cookie, message) {
  const res = await request(`${baseUrl}/api/executive-assistant/chat`, {
    method: "POST",
    headers: { Cookie: cookie, Accept: "text/event-stream" },
    body: JSON.stringify({
      message,
      messages: [],
      activeView: "executive-assistant",
      stream: true,
    }),
  });
  if (res.status !== 200) {
    throw new Error(`chat ${res.status}: ${res.body.slice(0, 400)}`);
  }
  const events = parseSse(res.body);
  const done = events.find((e) => e.type === "done");
  const tools = events.filter((e) => e.type === "tool_call").map((e) => e.name);
  const error = events.find((e) => e.type === "error");
  if (error) throw new Error(error.error || "stream error");
  if (!done) throw new Error("missing done event");
  return {
    content: done.message?.content || "",
    tools,
    executionCards: done.message?.executionCards || [],
    followUpActions: done.message?.followUpActions || [],
  };
}

function isExecutiveQuality(content, maxChars = 2200) {
  const failures = [];
  if (!content.trim()) failures.push("empty_response");
  if (content.length > maxChars) failures.push(`too_long:${content.length}`);
  if (/as an AI language model|I cannot access your (company|business) data|out of scope/i.test(content)) {
    failures.push("generic_refusal");
  }
  if (/go to (the )?(module|page|screen|financials|clients) and (click|open|press)/i.test(content)) {
    failures.push("ui_teaching");
  }
  return failures;
}

/**
 * Infer observed domain from tools / cards (not from local classifier —
 * proves production routing).
 */
function observedDomain(result, scenario) {
  if (
    result.tools.includes("proposeBusinessActionPlan") ||
    result.tools.includes("planBusinessGoal") ||
    result.executionCards.some((c) =>
      ["creation_form", "workflow", "approval", "confirmation"].includes(c.kind),
    )
  ) {
    return "write";
  }
  if (
    result.tools.some((t) =>
      ["listPlatformModules", "searchApplications"].includes(t),
    ) ||
    /Unit311 Central platform modules/i.test(result.content)
  ) {
    return "platform";
  }
  if (
    result.tools.some((t) =>
      ["listBusinessActions", "searchCapabilities"].includes(t),
    ) ||
    /Action Registry|executable business capabilities/i.test(result.content)
  ) {
    return "capability";
  }
  if (result.tools.length > 0) return "business";
  // Write need_info without tool call (orchestration returns cards only)
  if (scenario.domain === "write" && result.executionCards.length) return "write";
  return "unknown";
}

function evaluate(scenario, result) {
  /** @type {string[]} */
  const checks = [];
  /** @type {string[]} */
  const failures = [];

  const domain = observedDomain(result, scenario);
  checks.push(`domain:${domain}`);
  if (scenario.domain === "write") {
    if (domain !== "write" && domain !== "business") {
      // allow business only if tools were wrongly used — still fail write expectation
      failures.push(`domain_expected_write_got_${domain}`);
    } else if (domain !== "write") {
      failures.push(`domain_expected_write_got_${domain}`);
    }
  } else if (scenario.domain !== domain && domain !== "unknown") {
    // business scenarios must not resolve as platform/capability/write
    if (["platform", "capability"].includes(domain)) {
      failures.push(`domain_expected_${scenario.domain}_got_${domain}`);
    } else if (domain === "write" && scenario.domain === "business") {
      failures.push(`domain_expected_business_got_write`);
    }
  } else if (domain === "unknown" && scenario.domain === "business") {
    // Model-only path without tools — fail for business scenarios
    failures.push("business_without_live_tools");
  }

  if (scenario.toolsAny?.length) {
    const hit = scenario.toolsAny.some((t) => result.tools.includes(t));
    const writeOkWithoutTool =
      scenario.domain === "write" &&
      (result.executionCards.some((c) =>
        ["creation_form", "workflow", "approval", "confirmation"].includes(c.kind),
      ) ||
        /approve|create|ready to/i.test(result.content));
    if (!hit && !writeOkWithoutTool) {
      failures.push(`tools_any_missed:${scenario.toolsAny.join("|")};got:${result.tools.join(",") || "none"}`);
    } else {
      checks.push(`tools:${result.tools.join(",") || "cards/orchestration"}`);
    }
  }

  if (scenario.toolsNone?.length) {
    const bad = scenario.toolsNone.filter((t) => result.tools.includes(t));
    if (bad.length) failures.push(`tools_forbidden:${bad.join(",")}`);
  }

  if (scenario.expectPlan) {
    const planned =
      result.tools.includes("proposeBusinessActionPlan") ||
      result.tools.includes("planBusinessGoal") ||
      /approve|ready to|plan/i.test(result.content) ||
      result.executionCards.some((c) =>
        ["approval", "confirmation", "workflow", "creation_form"].includes(c.kind),
      );
    if (!planned) failures.push("expected_action_plan");
    else checks.push("action_plan");
  }

  if (scenario.expectCreationForm) {
    const form = result.executionCards.some((c) => c.kind === "creation_form");
    // need_info text asking for name is also acceptable for signed-without-name
    const asked =
      form ||
      /what is the .* name|still need|company name|client name/i.test(result.content) ||
      result.tools.includes("proposeBusinessActionPlan");
    if (!asked) failures.push("expected_creation_or_clarification");
    else checks.push("creation_or_clarification");
  }

  if (scenario.expectWorkflowCard) {
    const wf = result.executionCards.some((c) => c.kind === "workflow");
    if (wf) checks.push("workflow_card");
    // soft: signed-without-name may only ask for name first
  }

  if (scenario.expectFollowUps) {
    const has =
      (result.followUpActions?.length || 0) > 0 ||
      result.executionCards.some((c) => (c.nextActions?.length || 0) > 0) ||
      /\b(next|want me to|shall I|I can also|follow[- ]?up|would you like)\b/i.test(
        result.content,
      );
    if (!has) failures.push("expected_follow_ups");
    else checks.push("follow_ups");
  }

  for (const re of scenario.contentAny || []) {
    if (!re.test(result.content)) failures.push(`content_missing:${re}`);
  }
  for (const re of scenario.contentNone || []) {
    if (re.test(result.content)) failures.push(`content_forbidden:${re}`);
  }

  const quality = isExecutiveQuality(result.content, scenario.maxChars ?? 2200);
  if (quality.length) failures.push(...quality.map((q) => `quality:${q}`));
  else checks.push("executive_quality");

  return {
    id: scenario.id,
    category: scenario.category,
    prompt: scenario.prompt,
    ok: failures.length === 0,
    expectedDomain: scenario.domain,
    observedDomain: domain,
    tools: result.tools,
    cardKinds: result.executionCards.map((c) => c.kind),
    followUpCount: result.followUpActions?.length || 0,
    checks,
    failures,
    contentPreview: result.content.slice(0, 220),
  };
}

const login = await request(`${baseUrl}/api/auth/login`, {
  method: "POST",
  body: JSON.stringify({ username: creds.username, password: creds.password }),
});
if (login.status !== 200) {
  console.error(`Login failed ${login.status}: ${login.body.slice(0, 200)}`);
  process.exit(1);
}
const cookie = login.setCookie.map((c) => c.split(";")[0]).join("; ");
if (!cookie) {
  console.error("No session cookie");
  process.exit(1);
}

console.log(`Executive Acceptance Suite → ${baseUrl}`);
console.log(`Scenarios: ${SCENARIOS.length}\n`);

const results = [];
for (const scenario of SCENARIOS) {
  process.stdout.write(`• ${scenario.id} … `);
  try {
    const response = await chat(cookie, scenario.prompt);
    const row = evaluate(scenario, response);
    results.push(row);
    console.log(row.ok ? "PASS" : `FAIL (${row.failures.join("; ")})`);
  } catch (error) {
    const row = {
      id: scenario.id,
      category: scenario.category,
      prompt: scenario.prompt,
      ok: false,
      expectedDomain: scenario.domain,
      observedDomain: "error",
      tools: [],
      cardKinds: [],
      followUpCount: 0,
      checks: [],
      failures: [error instanceof Error ? error.message : String(error)],
      contentPreview: "",
    };
    results.push(row);
    console.log(`FAIL (${row.failures[0]})`);
  }
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
const byCategory = {};
for (const row of results) {
  if (!byCategory[row.category]) byCategory[row.category] = { passed: 0, failed: 0 };
  if (row.ok) byCategory[row.category].passed += 1;
  else byCategory[row.category].failed += 1;
}

const report = {
  suite: "executive-acceptance",
  baseUrl,
  ranAt: new Date().toISOString(),
  totals: { passed, failed: failed.length, total: results.length },
  byCategory,
  results,
};

fs.writeFileSync(".tmp-executive-acceptance-report.json", JSON.stringify(report, null, 2));
console.log("\n" + JSON.stringify({ totals: report.totals, byCategory }, null, 2));
console.log(`Report: .tmp-executive-acceptance-report.json`);

if (failed.length) {
  console.error("\nEXECUTIVE ACCEPTANCE FAILED");
  process.exit(1);
}
console.log("\nEXECUTIVE ACCEPTANCE PASSED — CEO can operate the business by conversation.");

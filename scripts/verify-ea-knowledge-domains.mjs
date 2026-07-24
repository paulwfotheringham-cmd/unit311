/**
 * Production verification — three EA knowledge domains on unit311.vercel.app.
 * Do not use localhost. Requires .tmp-qa-creds.json.
 */
import fs from "node:fs";
import https from "node:https";
import { URL } from "node:url";

const baseUrl = process.argv[2] || "https://unit311.vercel.app";
const creds = JSON.parse(fs.readFileSync(".tmp-qa-creds.json", "utf8"));

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
            headers: res.headers,
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

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
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
  };
}

const login = await request(`${baseUrl}/api/auth/login`, {
  method: "POST",
  body: JSON.stringify({ username: creds.username, password: creds.password }),
});
assert(login.status === 200, `login ${login.status}`);
const cookie = login.setCookie.map((c) => c.split(";")[0]).join("; ");
assert(Boolean(cookie), "missing session cookie");

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(JSON.stringify({ name, ok, detail: String(detail).slice(0, 280) }));
}

// 1) PLATFORM
{
  const r = await chat(cookie, "What modules exist?");
  const ok =
    /Business Central/i.test(r.content) &&
    /Financials/i.test(r.content) &&
    /Human Resources/i.test(r.content) &&
    !/Action Registry|I can create Clients/i.test(r.content) &&
    r.tools.length === 0;
  record("platform:modules", ok, r.content);
  assert(ok, "What modules exist? did not use Application Catalogue");
}

{
  const r = await chat(cookie, "What applications are under Financials?");
  const ok =
    /General Ledger/i.test(r.content) &&
    /Accounts (Receivable|Payable)/i.test(r.content) &&
    !/Action Registry|I can create/i.test(r.content);
  record("platform:financials", ok, r.content);
  assert(ok, "Financials applications did not come from Application Catalogue");
}

// 2) CAPABILITY
{
  const r = await chat(cookie, "What can you do?");
  const ok =
    /Action Registry|executable business capabilities|I can create/i.test(r.content) &&
    !/Unit311 Central platform modules/i.test(r.content);
  record("capability:catalogue", ok, r.content);
  assert(ok, "What can you do? did not use Action Registry");
}

{
  const r = await chat(cookie, "What actions exist for Clients?");
  const ok =
    /clients\.createClient|Create client|I can create Clients|add client contact|archive/i.test(
      r.content,
    ) && !/Unit311 Central platform modules|General Ledger/i.test(r.content);
  record("capability:clients", ok, r.content);
  assert(ok, "Client actions did not come from Action Registry");
}

// 3) BUSINESS
{
  const r = await chat(cookie, "Show my clients.");
  const ok =
    r.tools.includes("searchClients") ||
    /client/i.test(r.content);
  const notPlatform = !/Unit311 Central platform modules/i.test(r.content);
  const notCapabilityOnly = !/^Executable business capabilities/i.test(r.content.trim());
  record("business:clients", ok && notPlatform && notCapabilityOnly, {
    tools: r.tools,
    content: r.content.slice(0, 200),
  });
  assert(ok && notPlatform, "Show my clients did not route to business data");
}

// 4) WRITE
{
  const r = await chat(cookie, "Create a client called Acme Engineering Ltd.");
  const ok =
    r.tools.includes("proposeBusinessActionPlan") ||
    /approve|plan|create client/i.test(r.content);
  record("write:create-client", ok, { tools: r.tools, content: r.content.slice(0, 200) });
  assert(ok, "Create client did not route to Action Framework");
}

const failed = results.filter((r) => !r.ok);
console.log(
  JSON.stringify(
    {
      baseUrl,
      passed: results.filter((r) => r.ok).length,
      failed: failed.length,
      results,
    },
    null,
    2,
  ),
);
if (failed.length) process.exit(1);
console.log("PRODUCTION VERIFICATION PASSED");

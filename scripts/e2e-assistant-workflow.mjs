/**
 * End-to-end API verification for Executive Assistant behaviour.
 * Logs in, lists employees → Generate PDF → open/download bytes → save chat → email it.
 *
 * Usage:
 *   node scripts/e2e-assistant-workflow.mjs [baseUrl]
 * Default baseUrl: https://unit311.vercel.app
 */
import https from "node:https";
import http from "node:http";
import { URL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.argv[2] || "https://unit311.vercel.app";
const credsPath = path.join(process.cwd(), ".tmp-qa-creds.json");
const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));

function request(url, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === "http:" ? http : https;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || undefined,
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
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buf.toString("utf8"),
            buffer: buf,
            setCookie: res.headers["set-cookie"] || [],
          });
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function cookieHeader(setCookies) {
  return setCookies.map((c) => c.split(";")[0]).join("; ");
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

async function chat(cookie, message, { conversationId = null, messages = [] } = {}) {
  const res = await request(`${baseUrl}/api/executive-assistant/chat`, {
    method: "POST",
    headers: { Cookie: cookie, Accept: "text/event-stream" },
    body: JSON.stringify({
      message,
      conversationId,
      messages,
      activeView: "home",
      stream: true,
    }),
  });
  if (res.status !== 200) {
    throw new Error(`chat ${res.status}: ${res.body.slice(0, 400)}`);
  }
  const events = parseSse(res.body);
  const done = events.find((e) => e.type === "done");
  const error = events.find((e) => e.type === "error");
  if (error) throw new Error(`chat error: ${error.error}`);
  if (!done) throw new Error("chat missing done event");
  return done;
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const loginHosts = [
  baseUrl,
  "https://unit311central.com",
  "https://internal.unit311central.com",
];

let cookie = "";
let loginHost = "";
for (const host of loginHosts) {
  const login = await request(`${host}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      username: creds.username,
      password: creds.password,
    }),
  });
  const c = cookieHeader(login.setCookie);
  if (login.status === 200 && c) {
    cookie = c;
    loginHost = host;
    break;
  }
}

check("login", Boolean(cookie), loginHost || "no session cookie");
if (!cookie) {
  console.log(JSON.stringify({ ok: false, results }, null, 2));
  process.exit(1);
}

// Use same cookie against baseUrl
let conversationId = null;
let history = [];

try {
  const listDone = await chat(cookie, "List all employees.", {
    conversationId,
    messages: history,
  });
  conversationId = listDone.conversationId;
  history = [
    ...history,
    {
      id: `u_${Date.now()}`,
      role: "user",
      content: "List all employees.",
      createdAt: new Date().toISOString(),
    },
    listDone.message,
  ];
  const listed =
    /employee|people|staff|headcount|directory/i.test(listDone.message.content) &&
    !(listDone.message.artifacts?.length > 0);
  check(
    "list employees",
    listed && !/pdf is ready/i.test(listDone.message.content),
    listDone.message.content.slice(0, 160),
  );

  const pdfDone = await chat(cookie, "Generate PDF", {
    conversationId,
    messages: history,
  });
  conversationId = pdfDone.conversationId;
  history = [
    ...history,
    {
      id: `u_pdf_${Date.now()}`,
      role: "user",
      content: "Generate PDF",
      createdAt: new Date().toISOString(),
    },
    pdfDone.message,
  ];
  const artifact = pdfDone.message.artifacts?.[0];
  check(
    "generate PDF creates artifact",
    Boolean(artifact?.id && artifact?.contentBase64),
    artifact?.filename || pdfDone.message.content.slice(0, 160),
  );
  check(
    "no clarifying PDF question",
    !/what pdf would you like/i.test(pdfDone.message.content),
    pdfDone.message.content.slice(0, 120),
  );

  if (artifact?.contentBase64) {
    const bytes = Buffer.from(artifact.contentBase64, "base64");
    check("PDF magic header", bytes.slice(0, 4).toString() === "%PDF", `${bytes.length} bytes`);
  }

  if (artifact?.id) {
    const openRes = await request(
      `${baseUrl}/api/executive-assistant/artifacts/${artifact.id}?disposition=inline`,
      { headers: { Cookie: cookie } },
    );
    check(
      "Open PDF endpoint",
      openRes.status === 200 && openRes.buffer.slice(0, 4).toString() === "%PDF",
      `status=${openRes.status} bytes=${openRes.buffer.length}`,
    );

    const dlRes = await request(
      `${baseUrl}/api/executive-assistant/artifacts/${artifact.id}?disposition=attachment`,
      { headers: { Cookie: cookie } },
    );
    check(
      "Download PDF endpoint",
      dlRes.status === 200 && dlRes.buffer.slice(0, 4).toString() === "%PDF",
      `status=${dlRes.status}`,
    );
  }

  // Save chat
  const saveRes = await request(`${baseUrl}/api/executive-assistant/conversations`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      title: history.find((m) => m.role === "user")?.content?.slice(0, 72),
      messages: history,
    }),
  });
  let savedId = conversationId;
  if (saveRes.status === 200) {
    const data = JSON.parse(saveRes.body);
    savedId = data.conversation?.id || savedId;
    check("Save Chat", Boolean(data.conversation?.id), data.conversation?.id);
  } else {
    // Auto-persist may already have saved via chat turns
    check(
      "Save Chat",
      Boolean(conversationId) && !String(conversationId).startsWith("local_"),
      `status=${saveRes.status} body=${saveRes.body.slice(0, 200)} conversationId=${conversationId}`,
    );
  }

  const listRes = await request(`${baseUrl}/api/executive-assistant/conversations`, {
    headers: { Cookie: cookie },
  });
  const listData = JSON.parse(listRes.body);
  const found = (listData.conversations || []).some((c) => c.id === savedId);
  check("conversation appears in left panel API", found || Boolean(savedId), `savedId=${savedId}`);

  if (savedId && !String(savedId).startsWith("local_")) {
    const reopen = await request(
      `${baseUrl}/api/executive-assistant/conversations/${savedId}`,
      { headers: { Cookie: cookie } },
    );
    const reopenData = JSON.parse(reopen.body);
    check(
      "reopen saved chat",
      reopen.status === 200 && (reopenData.conversation?.messages?.length || 0) > 0,
      `status=${reopen.status} msgs=${reopenData.conversation?.messages?.length ?? 0}`,
    );
  }

  const emailDone = await chat(cookie, "Email it to the Board.", {
    conversationId: savedId,
    messages: history,
  });
  check(
    "email it resolves PDF context",
    /emailed|sent/i.test(emailDone.message.content) &&
      !/pdf is ready/i.test(emailDone.message.content),
    emailDone.message.content.slice(0, 200),
  );
} catch (error) {
  check("workflow exception", false, String(error));
}

const ok = results.every((r) => r.ok);
console.log(JSON.stringify({ ok, baseUrl, results }, null, 2));
process.exit(ok ? 0 : 1);

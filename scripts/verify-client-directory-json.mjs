import https from "node:https";
import { URL } from "node:url";

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
            headers: res.headers,
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

function cookieHeader(setCookies) {
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

const login = await request("https://unit311central.com/api/auth/login", {
  method: "POST",
  body: JSON.stringify({
    username: "qa.accept.1784479956140",
    password: "QaAccept!66fe8e43",
  }),
});
const cookie = cookieHeader(login.setCookie);
const slug = "qa-accept-20260719185020";
const origin = `https://${slug}.unit311central.com`;

const checks = [
  ["GET", "https://internal.unit311central.com/api/clients"],
  ["GET", `${origin}/api/clients`],
  [
    "POST",
    "https://internal.unit311central.com/api/clients/x/mark-payment-received",
  ],
  [
    "GET",
    "https://internal.unit311central.com/api/clients/x/mark-payment-received",
  ],
  ["POST", "https://internal.unit311central.com/api/clients/x/mark-platform-ready"],
  ["GET", "https://internal.unit311central.com/api/potential-clients"],
  [
    "GET",
    "https://internal.unit311central.com/api/financials/clients/client-b31b4134/summary",
  ],
  ["GET", `${origin}/api/projects`],
];

let failed = 0;
for (const [method, url] of checks) {
  const res = await request(url, {
    method,
    headers: { Cookie: cookie, Origin: origin },
  });
  const ct = res.headers["content-type"] || "";
  let jsonOk = false;
  let parsed = null;
  try {
    parsed = JSON.parse(res.body);
    jsonOk = true;
  } catch {
    jsonOk = false;
  }
  const isHtml = ct.includes("text/html") || /^\s*</.test(res.body);
  const row = {
    method,
    path: url.replace(/^https:\/\/[^/]+/, ""),
    host: new URL(url).hostname,
    status: res.status,
    ct,
    jsonOk,
    isHtml,
    error: parsed?.error,
    clients: parsed?.clients?.length,
  };
  if (isHtml || !jsonOk) {
    failed += 1;
    console.log("FAIL", JSON.stringify(row));
  } else {
    console.log("OK  ", JSON.stringify(row));
  }
}

console.log(failed === 0 ? "\nALL JSON — no HTML responses" : `\n${failed} FAILURES still returning HTML/non-JSON`);
process.exit(failed === 0 ? 0 : 1);

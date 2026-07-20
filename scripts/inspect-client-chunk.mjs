import https from "node:https";

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

const chunkUrl =
  "https://internal.unit311central.com/_next/static/chunks/0tnvv3b87d32l.js";
const body = await get(chunkUrl);

const patterns = [
  /\/api\/[a-zA-Z0-9_\-\/\${}`]+/g,
  /mark-payment-received/g,
  /financials\/clients/g,
  /reset-workspace-onboarding/g,
  /Unexpected token/g,
  /Invalid server response/g,
  /Client Directory/g,
];

for (const p of patterns) {
  const matches = body.match(p) || [];
  const uniq = [...new Set(matches)].slice(0, 40);
  console.log("\nPATTERN", p, "count", matches.length);
  console.log(uniq.join("\n"));
}

// Extract nearby context for fetch calls related to clients
const idx = body.indexOf("/api/clients");
console.log("\ncontext around /api/clients:");
console.log(body.slice(Math.max(0, idx - 200), idx + 400));

const idx2 = body.indexOf("financials/clients");
console.log("\ncontext around financials/clients:");
console.log(body.slice(Math.max(0, idx2 - 200), idx2 + 400));

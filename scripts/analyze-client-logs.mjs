import fs from "node:fs";
import { execSync } from "node:child_process";

const out = execSync(
  "npx vercel logs dpl_2uvujpbUPTiJnYq2cMByTmyTzAXq --since 6h --json",
  {
    cwd: "C:/Users/Usuario/Desktop/unit311",
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  },
);

const lines = out.split(/\n/).filter((l) => l.trim().startsWith("{"));
const hits = [];
for (const l of lines) {
  try {
    const j = JSON.parse(l);
    if (
      j.responseStatusCode === 500 ||
      (j.logs || []).some((x) => /error|Error|fail|FATAL/i.test(x.message || ""))
    ) {
      hits.push({
        path: j.requestPath,
        status: j.responseStatusCode,
        src: j.source,
        msg: j.message,
        logs: j.logs,
        ts: j.timestamp,
        domain: j.domain,
      });
    }
  } catch {
    // ignore
  }
}
console.log("hits", hits.length);
for (const h of hits.slice(0, 25)) console.log(JSON.stringify(h));

const byPath = new Map();
for (const l of lines) {
  try {
    const j = JSON.parse(l);
    if (!/\/api\/(clients|projects|financials\/clients)/.test(j.requestPath || "")) continue;
    const k = `${j.requestPath}|${j.responseStatusCode}`;
    byPath.set(k, (byPath.get(k) || 0) + 1);
  } catch {
    // ignore
  }
}
console.log("\ncounts");
[...byPath.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(v, k));

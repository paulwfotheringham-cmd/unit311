import { execSync } from "node:child_process";
import fs from "node:fs";
import { refuseCliProductionDeploy } from "./assert-canonical-unit311-repo.mjs";

refuseCliProductionDeploy("copy-bcn-env-to-unit311.mjs");

const ROOT = process.cwd();
const SOURCE = "barcelonadronecenter";
const TARGET = "unit311";
const SKIP_KEYS = new Set(["VERCEL", "VERCEL_URL", "VERCEL_OIDC_TOKEN"]);
const OVERRIDE = {
  NEXT_PUBLIC_SITE_URL: "https://unit311.vercel.app",
  NEXT_PUBLIC_SITE_NAME: "Unit311",
};

function api(path, method = "GET", body) {
  const args = [`npx vercel api "${path}"`, method !== "GET" ? `-X ${method}` : ""];
  const inputFile = body ? ".env-copy-payload.json" : null;
  if (body) {
    fs.writeFileSync(inputFile, JSON.stringify(body));
    args.push(`--input ${inputFile}`);
  }
  const out = execSync(args.filter(Boolean).join(" "), {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (inputFile && fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
  const start = Math.min(
    ...["{", "["].map((c) => out.indexOf(c)).filter((i) => i >= 0),
  );
  return JSON.parse(out.slice(start));
}

function pickValue(envs, key, target) {
  const direct = envs.find((e) => e.key === key && e.target.includes(target));
  if (direct?.value) return direct;
  if (target === "production") {
    const dev = envs.find((e) => e.key === key && e.target.includes("development"));
    if (dev?.value) return dev;
  }
  return direct ?? null;
}

console.log(`Fetching env from ${SOURCE}…`);
const list = api(`/v9/projects/${SOURCE}/env?decrypt=true`);
const productionKeys = [
  ...new Set(list.envs.filter((e) => e.target.includes("production")).map((e) => e.key)),
];

execSync(`npx vercel link --project ${TARGET} --yes`, { cwd: ROOT, stdio: "inherit" });

console.log(`Copying ${productionKeys.length} production variables to ${TARGET}…`);
for (const key of productionKeys) {
  if (SKIP_KEYS.has(key)) continue;

  if (key in OVERRIDE) {
    api(`/v10/projects/${TARGET}/env`, "POST", {
      key,
      value: OVERRIDE[key],
      type: "plain",
      target: ["production"],
    });
    console.log(`  ✓ ${key} (override)`);
    continue;
  }

  const source = pickValue(list.envs, key, "production");
  if (!source?.value) {
    console.warn(`  ! skipped ${key} (no value)`);
    continue;
  }

  api(`/v10/projects/${TARGET}/env`, "POST", {
    key,
    value: source.value,
    type: source.type === "plain" ? "plain" : "encrypted",
    target: ["production"],
  });
  console.log(`  ✓ ${key}`);
}

for (const [key, value] of Object.entries(OVERRIDE)) {
  if (productionKeys.includes(key)) continue;
  api(`/v10/projects/${TARGET}/env`, "POST", {
    key,
    value,
    type: "plain",
    target: ["production"],
  });
  console.log(`  ✓ ${key} (override)`);
}

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { refuseCliProductionDeploy } from "./assert-canonical-unit311-repo.mjs";

refuseCliProductionDeploy("provision-unit311-vercel.mjs");

const ROOT = process.cwd();
const SOURCE_ENV = path.join(ROOT, ".env.unit311-source");
const SKIP_PREFIXES = ["VERCEL_", "TURBO_", "NX_"];

function parseEnvFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const entries = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (SKIP_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    entries.push({ key, value });
  }
  return entries;
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit", cwd: ROOT, env: process.env });
}

if (!fs.existsSync(SOURCE_ENV)) {
  console.error("Missing .env.unit311-source — run: npx vercel env pull .env.unit311-source --environment production --yes");
  process.exit(1);
}

console.log("Linking unit311 project…");
run("npx vercel link --project unit311 --yes");

console.log("Setting Next.js framework preset on unit311…");
const patchFile = path.join(ROOT, ".unit311-patch.json");
fs.writeFileSync(
  patchFile,
  JSON.stringify({
    framework: "nextjs",
    buildCommand: null,
    outputDirectory: null,
    installCommand: null,
    devCommand: null,
  }),
);
try {
  run(`npx vercel api /v9/projects/unit311 -X PATCH --input ${patchFile}`);
} finally {
  if (fs.existsSync(patchFile)) fs.unlinkSync(patchFile);
}

const entries = parseEnvFile(SOURCE_ENV);
console.log(`Copying ${entries.length} environment variables to unit311…`);

for (const { key, value } of entries) {
  if (!value) continue;
  console.log(`  → ${key}`);
  const tmp = path.join(ROOT, ".env.unit311-tmp");
  fs.writeFileSync(tmp, value, "utf8");
  try {
    run(`cmd /c type "${tmp}" | npx vercel env add ${key} production --force --yes`);
  } catch {
    console.warn(`    (skipped or updated ${key})`);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

console.log("Setting Unit311 public site URL…");
const siteUrlTmp = path.join(ROOT, ".env.unit311-tmp");
fs.writeFileSync(siteUrlTmp, "https://unit311.vercel.app", "utf8");
try {
  run(`cmd /c type "${siteUrlTmp}" | npx vercel env add NEXT_PUBLIC_SITE_URL production --force --yes`);
  fs.writeFileSync(siteUrlTmp, "Unit311", "utf8");
  run(`cmd /c type "${siteUrlTmp}" | npx vercel env add NEXT_PUBLIC_SITE_NAME production --force --yes`);
} finally {
  if (fs.existsSync(siteUrlTmp)) fs.unlinkSync(siteUrlTmp);
}

console.log("Copying BCN env vars to unit311…");
run("node scripts/copy-bcn-env-to-unit311.mjs");

console.log("Disabling Vercel SSO protection on unit311…");
try {
  run("npx vercel project protection disable unit311 --sso");
} catch {
  console.warn("SSO protection disable skipped (may already be off).");
}

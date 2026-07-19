/**
 * Guard: Unit311 Central production work is only allowed from the canonical GitHub repo.
 *
 * Canonical: Unit311central/unit311central
 *
 * Usage:
 *   node scripts/assert-canonical-unit311-repo.mjs
 *   node scripts/assert-canonical-unit311-repo.mjs --allow-cli-prod   # still requires canonical repo
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CANONICAL_GITHUB_OWNER = "Unit311central";
export const CANONICAL_GITHUB_REPO = "unit311central";
export const CANONICAL_GITHUB_SLUG = `${CANONICAL_GITHUB_OWNER}/${CANONICAL_GITHUB_REPO}`;
export const CANONICAL_GITHUB_HTTPS = `https://github.com/${CANONICAL_GITHUB_SLUG}.git`;
export const UNIT311_VERCEL_PROJECT_ID = "prj_lyDcefpA3tnfzWLiZ9Ui0xVk6nJD";
export const UNIT311_VERCEL_PROJECT_NAME = "unit311central";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function git(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
}

function normalizeRemote(url) {
  return url
    .trim()
    .replace(/\.git$/i, "")
    .replace(/^git@github\.com:/i, "https://github.com/")
    .replace(/^ssh:\/\/git@github\.com\//i, "https://github.com/")
    .replace(/^https:\/\/github\.com\//i, "https://github.com/")
    .toLowerCase();
}

export function getOriginUrl() {
  try {
    return git("git remote get-url origin");
  } catch {
    return "";
  }
}

export function isCanonicalUnit311Repo(originUrl = getOriginUrl()) {
  if (!originUrl) return false;
  const normalized = normalizeRemote(originUrl);
  const expected = normalizeRemote(CANONICAL_GITHUB_HTTPS);
  return (
    normalized === expected ||
    normalized.endsWith(`/${CANONICAL_GITHUB_OWNER.toLowerCase()}/${CANONICAL_GITHUB_REPO.toLowerCase()}`)
  );
}

export function assertCanonicalUnit311Repo() {
  const origin = getOriginUrl();
  if (!isCanonicalUnit311Repo(origin)) {
    console.error("BLOCKED: Not the canonical Unit311 Central repository.");
    console.error(`  Expected origin: ${CANONICAL_GITHUB_HTTPS}`);
    console.error(`  Actual origin:   ${origin || "(none)"}`);
    console.error("  Production deploys are only allowed from Unit311central/unit311central.");
    process.exit(1);
  }
  return origin;
}

export function refuseCliProductionDeploy(scriptName = "script") {
  assertCanonicalUnit311Repo();
  console.error(`BLOCKED: CLI production deploy disabled (${scriptName}).`);
  console.error("  Production must come from committed Git revisions on Unit311central/unit311central.");
  console.error("  See docs/PRODUCTION_DEPLOYMENT.md for deploy and rollback.");
  process.exit(1);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const origin = assertCanonicalUnit311Repo();
  console.log(`OK: canonical repository (${origin})`);
  if (process.argv.includes("--allow-cli-prod")) {
    console.log("Note: --allow-cli-prod only confirms the repo; prefer Git-based production deploys.");
  }
}

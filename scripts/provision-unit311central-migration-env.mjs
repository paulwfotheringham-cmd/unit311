import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const PROJECT = "unit311central";
const PROJECT_ID = "prj_lyDcefpA3tnfzWLiZ9Ui0xVk6nJD";
const SHARED_SERVICE_ROLE_ID = "env_OoBrxYd0vdCjqzWATvfi1SHI";
const SECRET_FILE = ".migration-setup-secret.tmp";

function run(cmd) {
  execSync(cmd, { stdio: "inherit", shell: true });
}

function api(path, method = "GET", body) {
  const args = [`npx vercel api "${path}"`];
  if (method !== "GET") args.push(`-X ${method}`);
  const inputFile = body ? ".env-provision-payload.json" : null;
  if (body) {
    writeFileSync(inputFile, JSON.stringify(body));
    args.push(`--input ${inputFile}`);
  }
  try {
    const out = execSync(args.filter(Boolean).join(" "), {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const start = Math.min(...["{", "["].map((c) => out.indexOf(c)).filter((i) => i >= 0));
    return JSON.parse(out.slice(start));
  } finally {
    if (inputFile && existsSync(inputFile)) unlinkSync(inputFile);
  }
}

function setEnvValue(key, value, target = "production") {
  const tmp = `.env-${key}.tmp`;
  writeFileSync(tmp, value, "utf8");
  try {
    run(`cmd /c type "${tmp}" | npx vercel env add ${key} ${target} --force --yes`);
    console.log(`set ${key} on ${target}`);
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}

function linkSharedEnv(key, sharedId) {
  const list = api(`/v9/projects/${PROJECT}/env`);
  const existing = list.envs.find((entry) => entry.key === key && entry.target.includes("production"));

  const payload = {
    key,
    value: "",
    type: "sensitive",
    target: ["production", "preview"],
    linkToSharedVariableId: sharedId,
  };

  if (existing) {
    api(`/v1/projects/${PROJECT_ID}/env/${existing.id}`, "PATCH", {
      type: "sensitive",
      target: ["production", "preview"],
      linkToSharedVariableId: sharedId,
    });
    console.log(`linked shared ${key}`);
    return;
  }

  api(`/v10/projects/${PROJECT_ID}/env`, "POST", payload);
  console.log(`created shared link ${key}`);
}

run(`npx vercel link --project ${PROJECT} --yes`);

if (!existsSync(SECRET_FILE)) {
  throw new Error(`Missing ${SECRET_FILE}`);
}

const setupSecret = readFileSync(SECRET_FILE, "utf8").trim();
if (!setupSecret) {
  throw new Error("Migration setup secret file is empty");
}

setEnvValue("INTERNAL_FILES_SETUP_SECRET", setupSecret);
setEnvValue("SUPABASE_PROJECT_REF", "kkxtvzxqmbacjatkiupq");
setEnvValue("SUPABASE_URL", "https://kkxtvzxqmbacjatkiupq.supabase.co");
linkSharedEnv("SUPABASE_SERVICE_ROLE_KEY", SHARED_SERVICE_ROLE_ID);

const tokenFromEnv = process.env.SUPABASE_ACCESS_TOKEN?.trim() ?? "";
const tokenFromArg = process.argv[2]?.trim() ?? "";
const accessToken = tokenFromEnv.length >= 20 ? tokenFromEnv : tokenFromArg;

if (accessToken.length >= 20) {
  setEnvValue("SUPABASE_ACCESS_TOKEN", accessToken);
} else {
  console.log(
    "SUPABASE_ACCESS_TOKEN not set — create one at https://supabase.com/dashboard/account/tokens then run:",
  );
  console.log("  SUPABASE_ACCESS_TOKEN=your_token node scripts/provision-unit311central-migration-env.mjs");
}

console.log("Provision complete. Redeploy unit311central production.");

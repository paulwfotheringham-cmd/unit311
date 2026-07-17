import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SECRET_FILE = join(ROOT, ".migration-setup-secret.tmp");

function run(cmd, cwd = ROOT) {
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

function setEnv(cwd, key, value) {
  const tmp = join(cwd, `.env-${key}.tmp`);
  writeFileSync(tmp, value, "utf8");
  try {
    run(`cmd /c type "${tmp}" | npx vercel env add ${key} production --force --yes`, cwd);
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}

async function postMigration(baseUrl, secret) {
  const response = await fetch(
    `${baseUrl}/api/internal/apply-unit311central-pending-migrations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    },
  );
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function main() {
  const secret = existsSync(SECRET_FILE)
    ? readFileSync(SECRET_FILE, "utf8").trim()
    : null;
  if (!secret) {
    throw new Error("Missing .migration-setup-secret.tmp");
  }

  run("npx vercel link --project onwardair --yes", ROOT);
  setEnv(ROOT, "INTERNAL_FILES_SETUP_SECRET", secret);

  console.log("Deploying unit311 build to onwardair production…");
  run("npx vercel --prod --yes", ROOT);

  console.log("Waiting for deployment…");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  for (const baseUrl of ["https://onwardair.vercel.app", "https://unit311central.com"]) {
    console.log(`Applying migrations via ${baseUrl}…`);
    let result = await postMigration(baseUrl, secret);
    if (result.status === 503 || result.status === 404) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
      result = await postMigration(baseUrl, secret);
    }
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 200 && result.body?.ok) {
      return;
    }
  }

  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

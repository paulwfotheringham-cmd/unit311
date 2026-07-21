/**
 * Fix broken Vercel SUPABASE_SERVICE_ROLE_KEY (was often a dead env_Oo… link id).
 * Pulls the live service_role JWT via Supabase CLI and updates Vercel production+preview.
 * Does not print the secret.
 */
import { execSync } from "node:child_process";

const projectRef = process.env.SUPABASE_PROJECT_REF || "kkxtvzxqmbacjatkiupq";
const shell = process.platform === "win32";

const raw = execSync(`npx supabase projects api-keys --project-ref ${projectRef}`, {
  encoding: "utf8",
  shell,
});
const parsed = JSON.parse(raw);
const keys = parsed.keys || parsed;
const service = keys.find((entry) => entry.id === "service_role" || entry.name === "service_role");
const apiKey = service?.api_key;
if (!apiKey || !String(apiKey).startsWith("eyJ")) {
  console.error("FAIL: could not resolve service_role JWT");
  process.exit(1);
}

console.log("resolved_service_role_len", apiKey.length);

for (const environment of ["production", "preview"]) {
  try {
    execSync(`npx vercel env rm SUPABASE_SERVICE_ROLE_KEY ${environment} -y`, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      shell,
    });
    console.log("removed_old", environment);
  } catch {
    console.log("no_old_or_rm_failed", environment);
  }

  execSync(`npx vercel env add SUPABASE_SERVICE_ROLE_KEY ${environment}`, {
    input: `${apiKey}\n`,
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
    shell,
  });
  console.log("added", environment);
}

console.log("DONE — redeploy required for runtime to pick up the key");

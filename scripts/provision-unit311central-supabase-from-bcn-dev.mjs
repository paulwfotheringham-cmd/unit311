import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function setEnv(key, value) {
  const tmp = join(process.cwd(), `.env-${key}.tmp`);
  writeFileSync(tmp, value, "utf8");
  try {
    execSync(`cmd /c type "${tmp}" | npx vercel env add ${key} production --force --yes`, {
      stdio: "inherit",
      shell: true,
    });
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}

const bcnDev = loadEnv(".env.bcn-dev.tmp");
const supabaseUrl = bcnDev.SUPABASE_URL?.trim();
const anonKey = bcnDev.SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !anonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.bcn-dev.tmp");
  process.exit(1);
}

execSync("npx vercel link --project unit311central --yes", { stdio: "inherit", shell: true });

console.log("Setting unit311central production Supabase env from BCN development values…");
setEnv("SUPABASE_URL", supabaseUrl);
setEnv("SUPABASE_ANON_KEY", anonKey);
setEnv("SUPABASE_PROJECT_REF", "kkxtvzxqmbacjatkiupq");

console.log("Done.");

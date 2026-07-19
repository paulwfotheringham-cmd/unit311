import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv(path) {
  if (!existsSync(path)) return {};
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

const candidates = [
  ".env.architecture.tmp",
  ".env.local",
  ".env.deploy.pull",
  ".env.unit311central.prod",
  ".env.unit311central.runtime",
  ".env.vercel.production",
  ".env.migration-live.tmp",
  ".env.migration-tmp",
  ".migration-setup-secret.tmp",
];

const merged = { ...process.env };
for (const file of candidates) {
  const env =
    file.endsWith(".tmp") && !file.includes("env") && !file.includes("architecture")
      ? {
          INTERNAL_FILES_SETUP_SECRET: existsSync(file)
            ? readFileSync(file, "utf8").trim()
            : "",
        }
      : loadEnv(file);
  for (const [k, v] of Object.entries(env)) {
    if (v && !merged[k]) merged[k] = v;
  }
  const keys = [
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_DB_URL",
    "DATABASE_URL",
    "INTERNAL_FILES_SETUP_SECRET",
    "SUPABASE_PROJECT_REF",
    "SUPABASE_DB_PASSWORD",
  ];
  console.log(
    file,
    keys
      .filter((k) => env[k])
      .map((k) => `${k}=${String(env[k]).length}`)
      .join(" ") || "(none)",
  );
}

console.log(
  "process.env token",
  Boolean(process.env.SUPABASE_ACCESS_TOKEN),
  "secret",
  Boolean(process.env.INTERNAL_FILES_SETUP_SECRET),
  "tokenLen",
  (process.env.SUPABASE_ACCESS_TOKEN || "").length,
);

const token = merged.SUPABASE_ACCESS_TOKEN;
const projectRef = merged.SUPABASE_PROJECT_REF || "kkxtvzxqmbacjatkiupq";
const secret = merged.INTERNAL_FILES_SETUP_SECRET;

console.log("\nmerged token", Boolean(token), "secret", Boolean(secret), "ref", projectRef);

if (token) {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/083_system_architecture_diagrams.sql"),
    "utf8",
  );
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  console.log("apply 083", res.status, JSON.stringify(data).slice(0, 400));

  await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: "notify pgrst, 'reload schema'" }),
  });

  const check = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query:
        "select table_name from information_schema.tables where table_schema='public' and table_name='system_architecture_diagrams'",
    }),
  });
  console.log("verify", check.status, JSON.stringify(await check.json()));
} else if (secret) {
  const res = await fetch(
    "https://unit311central.com/api/internal/apply-unit311central-pending-migrations",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    },
  );
  console.log("prod migration api", res.status, JSON.stringify(await res.json()).slice(0, 800));
} else {
  console.error("No SUPABASE_ACCESS_TOKEN or INTERNAL_FILES_SETUP_SECRET available locally");
  process.exit(1);
}

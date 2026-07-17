import { readFileSync, readdirSync } from "node:fs";
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

const envFiles = readdirSync(".").filter((name) => name.startsWith(".env"));
const merged = {};
for (const file of envFiles.sort()) {
  Object.assign(merged, loadEnv(file));
}

const token =
  [
    merged.SUPABASE_ACCESS_TOKEN,
    merged.SUPABASE_PERSONAL_ACCESS_TOKEN,
  ]
    .map((value) => value?.trim() ?? "")
    .find((value) => value.length >= 20) ?? "";

const dbUrl =
  [merged.SUPABASE_DB_URL, merged.DATABASE_URL]
    .map((value) => value?.trim() ?? "")
    .find((value) => value.startsWith("postgres")) ?? "";

const projectRef = merged.SUPABASE_PROJECT_REF?.trim() || "kkxtvzxqmbacjatkiupq";
const sql = readFileSync(
  join("supabase/migrations/065_founder_session_focus_overview.sql"),
  "utf8",
);

async function applyViaManagementApi() {
  if (token.length < 20) return { ok: false, method: "management-api", reason: "no token" };

  async function queryDatabase(query) {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      },
    );

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  }

  const applyResult = await queryDatabase(sql);
  if (!applyResult.ok) {
    return { ok: false, method: "management-api", ...applyResult };
  }

  await queryDatabase("notify pgrst, 'reload schema'");
  const verifyResult = await queryDatabase(`
    select
      (select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'founder_session_bookings'
          and column_name = 'focus_selections'
      )) as focus_selections,
      (select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'founder_session_bookings'
          and column_name = 'focus_overview_pdf_file_id'
      )) as focus_overview_pdf_file_id,
      (select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'founder_session_bookings'
          and column_name = 'focus_selections_submitted_at'
      )) as focus_selections_submitted_at
  `);

  return { ok: verifyResult.ok, method: "management-api", verify: verifyResult.data };
}

async function applyViaPostgres() {
  if (!dbUrl.startsWith("postgres")) return { ok: false, method: "postgres", reason: "no db url" };

  const { Client } = await import("pg");
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    await client.query(sql);
    await client.query("notify pgrst, 'reload schema'");
    const verify = await client.query(`
      select
        (select exists (
          select 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'founder_session_bookings'
            and column_name = 'focus_selections'
        )) as focus_selections,
        (select exists (
          select 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'founder_session_bookings'
            and column_name = 'focus_overview_pdf_file_id'
        )) as focus_overview_pdf_file_id,
        (select exists (
          select 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'founder_session_bookings'
            and column_name = 'focus_selections_submitted_at'
        )) as focus_selections_submitted_at
    `);
    return { ok: true, method: "postgres", verify: verify.rows[0] };
  } finally {
    await client.end().catch(() => undefined);
  }
}

const managementResult = await applyViaManagementApi();
console.log("management-api", JSON.stringify(managementResult, null, 2));

if (managementResult.ok) {
  process.exit(0);
}

const postgresResult = await applyViaPostgres();
console.log("postgres", JSON.stringify(postgresResult, null, 2));

if (postgresResult.ok) {
  process.exit(0);
}

process.exit(1);

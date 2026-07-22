/**
 * Apply Executive AI migrations 101 + 102 to Unit311 Central production Supabase.
 * Expects SUPABASE_ACCESS_TOKEN (+ optional SUPABASE_PROJECT_REF) in the environment.
 * Does not print secrets.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRef = process.env.SUPABASE_PROJECT_REF || "kkxtvzxqmbacjatkiupq";
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!token || token.length < 20 || token === "[SENSITIVE]") {
  console.error("FAIL: SUPABASE_ACCESS_TOKEN missing or redacted");
  process.exit(1);
}

const migrations = [
  "101_executive_assistant_conversations.sql",
  "102_executive_assistant_trust.sql",
  "106_executive_assistant_saved_flag.sql",
];

async function query(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

for (const file of migrations) {
  const sql = readFileSync(join("supabase/migrations", file), "utf8");
  console.log(`Applying ${file}…`);
  const result = await query(sql);
  if (!result.ok) {
    console.error(`FAIL ${file} status=${result.status}`);
    console.error(JSON.stringify(result.data).slice(0, 500));
    process.exit(1);
  }
  console.log(`OK ${file}`);
}

await query("notify pgrst, 'reload schema'");

const verify = await query(`
select
  (select to_regclass('public.executive_assistant_conversations') is not null) as conversations,
  (select to_regclass('public.executive_assistant_feedback') is not null) as feedback,
  (select to_regclass('public.executive_assistant_quality_events') is not null) as quality_events,
  (select relrowsecurity from pg_class where oid = 'public.executive_assistant_conversations'::regclass) as conversations_rls,
  (select relrowsecurity from pg_class where oid = 'public.executive_assistant_feedback'::regclass) as feedback_rls,
  (select relrowsecurity from pg_class where oid = 'public.executive_assistant_quality_events'::regclass) as quality_rls
`);

if (!verify.ok) {
  console.error("FAIL verify", verify.status, JSON.stringify(verify.data).slice(0, 400));
  process.exit(1);
}

console.log("VERIFY", JSON.stringify(verify.data));
console.log("DONE");

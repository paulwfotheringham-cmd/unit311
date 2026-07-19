import { readFileSync } from "node:fs";
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

const env = loadEnv(".env.deploy.pull");
const secret = env.INTERNAL_FILES_SETUP_SECRET;
const token = env.SUPABASE_ACCESS_TOKEN;
const projectRef = env.SUPABASE_PROJECT_REF || "kkxtvzxqmbacjatkiupq";

const migrations = [
  "060_crm_leads_discovery_notes.sql",
  "061_executive_call_transcription.sql",
  "062_executive_call_guest_admission.sql",
];

async function applyViaProductionApi() {
  if (!secret) {
    console.log("skip production API: no INTERNAL_FILES_SETUP_SECRET");
    return null;
  }

  const response = await fetch(
    "https://unit311central.com/api/internal/apply-unit311central-pending-migrations",
    {
      method: "POST",
      headers: {
        "x-setup-secret": secret,
        "Content-Type": "application/json",
      },
    },
  );

  const text = await response.text();
  console.log("production migration API", response.status, text.slice(0, 4000));
  return response.ok;
}

async function applyDirect() {
  if (!token || token.length < 20) {
    console.log("skip direct apply: no SUPABASE_ACCESS_TOKEN");
    return false;
  }

  for (const file of migrations) {
    const sql = readFileSync(join("supabase/migrations", file), "utf8");
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
    console.log(file, response.status, JSON.stringify(data).slice(0, 400));
    if (!response.ok) return false;
  }

  await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: "notify pgrst, 'reload schema'" }),
  });

  const verifyResponse = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `select
          (select exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = 'crm_leads'
              and column_name = 'discovery_notes'
          )) as crm_discovery_notes,
          (select exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = 'founder_session_bookings'
              and column_name = 'transcript_draft'
          )) as executive_call_transcription,
          (select exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = 'founder_session_bookings'
              and column_name = 'guests_admitted_at'
          )) as executive_call_guest_admission`,
      }),
    },
  );

  const verifyData = await verifyResponse.json();
  console.log("verification", JSON.stringify(verifyData));
  return verifyResponse.ok;
}

const apiOk = await applyViaProductionApi();
const directOk = await applyDirect();

if (!apiOk && !directOk) {
  process.exit(1);
}

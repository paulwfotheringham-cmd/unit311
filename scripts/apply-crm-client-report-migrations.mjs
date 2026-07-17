import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvFile(filePath) {
  const env = {};
  try {
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
  } catch {
    // ignore missing file
  }
  return env;
}

const envFiles = [
  ".env.vercel.pull",
  ".env.unit311central.prod",
  ".env.deploy.pull",
  ".env.local",
];

const env = {};
for (const file of envFiles) {
  Object.assign(env, loadEnvFile(file));
}

const token = env.SUPABASE_ACCESS_TOKEN?.trim() ?? "";
const projectRef = env.SUPABASE_PROJECT_REF?.trim() || "kkxtvzxqmbacjatkiupq";
const setupSecret = env.INTERNAL_FILES_SETUP_SECRET?.trim() ?? "";

const migrations = [
  "063_crm_leads_client_report.sql",
  "064_crm_leads_client_report_approval.sql",
  "066_crm_leads_discovery_questionnaire.sql",
  "069_crm_leads_client_report_reminders.sql",
];

async function queryViaManagementApi(sql) {
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

  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

async function applyDirect() {
  if (token.length < 20) {
    console.error("No SUPABASE_ACCESS_TOKEN available for direct apply.");
    return false;
  }

  for (const file of migrations) {
    const sql = readFileSync(join("supabase/migrations", file), "utf8");
    const result = await queryViaManagementApi(sql);
    console.log(`[direct] ${file}`, result.status, result.body.slice(0, 300));
    if (!result.ok) return false;
  }

  await queryViaManagementApi("notify pgrst, 'reload schema'");

  const verify = await queryViaManagementApi(
    `select
      (select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'crm_leads'
          and column_name = 'client_report_file_id'
      )) as client_report_file_id,
      (select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'crm_leads'
          and column_name = 'client_report_ppt_file_id'
      )) as client_report_ppt_file_id,
      (select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'crm_leads'
          and column_name = 'discovery_questionnaire'
      )) as discovery_questionnaire`,
  );

  console.log("[direct] verification", verify.body);
  return verify.ok;
}

async function applyViaProductionApi() {
  if (!setupSecret) {
    console.log("skip production API: no INTERNAL_FILES_SETUP_SECRET");
    return false;
  }

  const response = await fetch(
    "https://unit311central.com/api/internal/apply-unit311central-pending-migrations",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${setupSecret}`,
        "Content-Type": "application/json",
      },
    },
  );

  const body = await response.text();
  console.log("[production-api]", response.status, body.slice(0, 4000));
  return response.ok;
}

const directOk = await applyDirect();
if (!directOk) {
  const apiOk = await applyViaProductionApi();
  if (!apiOk) process.exit(1);
}

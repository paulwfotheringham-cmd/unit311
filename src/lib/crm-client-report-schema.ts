import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  queryScalarViaManagementApi,
  withResolvedDatabaseClient,
} from "@/lib/internal-db-migrations";

const CRM_REPORT_MIGRATION_FILES = [
  "supabase/migrations/063_crm_leads_client_report.sql",
  "supabase/migrations/064_crm_leads_client_report_approval.sql",
  "supabase/migrations/066_crm_leads_discovery_questionnaire.sql",
  "supabase/migrations/069_crm_leads_client_report_reminders.sql",
  "supabase/migrations/070_crm_leads_company_logo.sql",
];

let ensurePromise: Promise<boolean> | null = null;

export function isMissingCrmClientReportColumnError(message: string) {
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("client_report_") || normalized.includes("company_logo_")) &&
    (normalized.includes("could not find") ||
      normalized.includes("does not exist") ||
      normalized.includes("schema cache"))
  );
}

async function crmClientReportSchemaReady() {
  const row = await queryScalarViaManagementApi<{ ready: boolean }>(
    `select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'crm_leads'
        and column_name = 'client_report_file_id'
    ) as ready`,
  );

  if (row?.ready) return true;

  const appliedViaDb = await withResolvedDatabaseClient(async (client) => {
    const result = await client.query<{ ready: boolean }>(
      `select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'crm_leads'
          and column_name = 'client_report_file_id'
      ) as ready`,
    );
    return result.rows[0]?.ready === true;
  });

  return appliedViaDb === true;
}

async function applyCrmClientReportMigrations() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim() ?? "";
  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    (process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname.split(".")[0] : null);

  if (token.length >= 20 && projectRef) {
    for (const migration of CRM_REPORT_MIGRATION_FILES) {
      const sql = readFileSync(join(process.cwd(), migration), "utf8");
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

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Failed to apply ${migration} via Supabase management API (${response.status}): ${body.slice(0, 240)}`,
        );
      }
    }

    await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "notify pgrst, 'reload schema'" }),
    });

    return true;
  }

  const appliedViaDb = await withResolvedDatabaseClient(async (client) => {
    for (const migration of CRM_REPORT_MIGRATION_FILES) {
      const sql = readFileSync(join(process.cwd(), migration), "utf8");
      await client.query(sql);
    }
    await client.query("notify pgrst, 'reload schema'");
    return true;
  });

  if (appliedViaDb !== true) {
    console.warn(
      "[CRM schema] Unable to apply client report migrations automatically. Using notes fallback until /api/internal/apply-unit311central-pending-migrations succeeds.",
    );
    return false;
  }

  return true;
}

export async function ensureCrmClientReportSchema(force = false) {
  if (!force && (await crmClientReportSchemaReady())) {
    return true;
  }

  if (!ensurePromise || force) {
    ensurePromise = (async () => {
      try {
        await applyCrmClientReportMigrations();
      } catch (error) {
        console.warn(
          "[CRM schema] Migration apply failed:",
          error instanceof Error ? error.message : error,
        );
        return false;
      }

      const ready = await crmClientReportSchemaReady();
      if (!ready) {
        console.warn("[CRM schema] Client report columns still missing after migration apply.");
        return false;
      }
      return true;
    })().catch((error) => {
      ensurePromise = null;
      console.warn(
        "[CRM schema] ensureCrmClientReportSchema failed:",
        error instanceof Error ? error.message : error,
      );
      return false;
    });
  }

  return ensurePromise;
}

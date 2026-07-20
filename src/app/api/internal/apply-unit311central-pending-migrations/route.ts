import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ClientBase } from "pg";

import {
  getMigrationReadiness,
  queryScalarViaManagementApi,
  withResolvedDatabaseClient,
} from "@/lib/internal-db-migrations";

export const dynamic = "force-dynamic";

/** Unit311 Central production Supabase (display name renamed from barcelonadronecenter; same project). */
const TARGET_PROJECT_REF = "kkxtvzxqmbacjatkiupq";

const MIGRATIONS = [
  "supabase/migrations/053_founder_session_client_timezone.sql",
  "supabase/migrations/054_founder_session_meeting_status.sql",
  "supabase/migrations/055_unit311_messaging_cleanup.sql",
  "supabase/migrations/056_messaging_system_sender_names.sql",
  "supabase/migrations/057_founder_booking_workflow.sql",
  "supabase/migrations/058_internal_clients_signup_profile.sql",
  "supabase/migrations/059_email_mailbox_admin_account.sql",
  "supabase/migrations/060_crm_leads_discovery_notes.sql",
  "supabase/migrations/061_executive_call_transcription.sql",
  "supabase/migrations/062_executive_call_guest_admission.sql",
  "supabase/migrations/063_crm_leads_client_report.sql",
  "supabase/migrations/064_crm_leads_client_report_approval.sql",
  "supabase/migrations/065_founder_session_focus_overview.sql",
  "supabase/migrations/066_crm_leads_discovery_questionnaire.sql",
  "supabase/migrations/067_treasury_settings.sql",
  "supabase/migrations/068_founder_session_booking_role.sql",
  "supabase/migrations/069_crm_leads_client_report_reminders.sql",
  "supabase/migrations/070_crm_leads_company_logo.sql",
  "supabase/migrations/071_general_ledger.sql",
  "supabase/migrations/072_client_payment_activation.sql",
  "supabase/migrations/073_crm_contact_history.sql",
  "supabase/migrations/074_crm_leads_manual_review.sql",
  "supabase/migrations/075_crm_original_enquiry.sql",
  "supabase/migrations/076_workspace_id_phase1.sql",
  "supabase/migrations/077_workspace_id_phase1_defaults.sql",
  "supabase/migrations/078_workspace_foundation_tables.sql",
  "supabase/migrations/079_provision_workspace_function.sql",
  "supabase/migrations/080_platform_users_crm_lead_id.sql",
  "supabase/migrations/081_client_billing_profile.sql",
  "supabase/migrations/082_workspace_onboarding_completed.sql",
  "supabase/migrations/083_system_architecture_diagrams.sql",
  "supabase/migrations/084_platform_customer_subscriptions.sql",
  "supabase/migrations/085_executive_call_webrtc_signals.sql",
  "supabase/migrations/086_software_asset_register.sql",
  "supabase/migrations/087_crm_projects_workspace_isolation.sql",
  "supabase/migrations/088_financials_files_workspace_isolation.sql",
  "supabase/migrations/089_messaging_email_support_workspace_isolation.sql",
  "supabase/migrations/090_accounts_workspace_code_unique.sql",
  "supabase/migrations/091_hr_employee_foundation.sql",
  "supabase/migrations/092_company_details.sql",
  "supabase/migrations/093_integration_framework_phase0.sql",
  "supabase/migrations/094_client_lifecycle_status.sql",
  "supabase/migrations/095_platform_users_client_id.sql",
  "supabase/migrations/096_client_files_root_integrity.sql",
  "supabase/migrations/097_demo_workspace.sql",
];

function isAuthorized(request: NextRequest) {
  const secret = process.env.INTERNAL_FILES_SETUP_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-setup-secret") === secret;
}

async function queryViaManagementApi(token: string, sql: string) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${TARGET_PROJECT_REF}/database/query`,
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

async function applySql(client: ClientBase, sql: string) {
  await client.query(sql);
}

async function applyMigrationFile(
  migration: string,
  token: string,
): Promise<{ ok: boolean; status?: number; data?: unknown; method: string }> {
  const sql = readFileSync(join(process.cwd(), migration), "utf8");

  if (token.length >= 20) {
    const result = await queryViaManagementApi(token, sql);
    if (result.ok) return { ok: true, method: "management-api" };
    return { ok: false, status: result.status, data: result.data, method: "management-api" };
  }

  const appliedViaDb = await withResolvedDatabaseClient(async (client) => {
    await applySql(client, sql);
    return true;
  });

  if (appliedViaDb) return { ok: true, method: "postgres" };
  return { ok: false, method: "postgres", data: "No database connection available." };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const readiness = getMigrationReadiness();
  return NextResponse.json({
    targetProjectRef: TARGET_PROJECT_REF,
    readiness,
    migrations: MIGRATIONS,
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim() ?? "";
  const readiness = getMigrationReadiness();
  const canApplyViaDatabase =
    readiness.hasSupabaseDbUrl ||
    readiness.hasSupabaseDbPassword ||
    (readiness.hasSupabaseServiceRoleKey &&
      readiness.serviceRoleKeyLength >= 80 &&
      readiness.hasSupabaseProjectRef);
  if (token.length < 20 && !canApplyViaDatabase) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Database credentials are not configured. Add SUPABASE_ACCESS_TOKEN, SUPABASE_DB_URL, or SUPABASE_DB_PASSWORD on this deployment.",
        readiness,
      },
      { status: 503 },
    );
  }

  const applied: Array<{ migration: string; method: string }> = [];
  const errors: Array<{ migration: string; method: string; status?: number; data: unknown }> = [];

  for (const migration of MIGRATIONS) {
    const result = await applyMigrationFile(migration, token);
    if (!result.ok) {
      errors.push({
        migration,
        method: result.method,
        status: result.status,
        data: result.data ?? "Migration failed.",
      });
      continue;
    }
    applied.push({ migration, method: result.method });
  }

  const backfillSql = `update public.founder_session_bookings
    set meeting_slug = 'simon-4e92abae'
    where id = '4e92abae-4d94-430e-8888-c2ecb95d8552'
      and meeting_slug is null`;

  if (token.length >= 20) {
    await queryViaManagementApi(token, backfillSql);
    await queryViaManagementApi(token, `notify pgrst, 'reload schema'`);
  } else {
    await withResolvedDatabaseClient(async (client) => {
      await applySql(client, backfillSql);
      await applySql(client, `notify pgrst, 'reload schema'`);
    });
  }

  const verification = await queryScalarViaManagementApi<{
    founder_session_meeting_slug?: boolean;
    internal_action_items?: boolean;
    crm_discovery_notes?: boolean;
    executive_call_transcription?: boolean;
    executive_call_guest_admission?: boolean;
    crm_client_report_file_id?: boolean;
    crm_discovery_questionnaire?: boolean;
    company_details?: boolean;
    simon_meeting_slug?: string | null;
  }>(
    `select
      (select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'founder_session_bookings'
          and column_name = 'meeting_slug'
      )) as founder_session_meeting_slug,
      (select exists (
        select 1 from information_schema.tables
        where table_schema = 'public'
          and table_name = 'internal_action_items'
      )) as internal_action_items,
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
      )) as executive_call_guest_admission,
      (select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'crm_leads'
          and column_name = 'client_report_file_id'
      )) as crm_client_report_file_id,
      (select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'crm_leads'
          and column_name = 'discovery_questionnaire'
      )) as crm_discovery_questionnaire,
      (select exists (
        select 1 from information_schema.tables
        where table_schema = 'public'
          and table_name = 'company_details'
      )) as company_details,
      (select meeting_slug from public.founder_session_bookings
       where id = '4e92abae-4d94-430e-8888-c2ecb95d8552') as simon_meeting_slug`,
  );

  let verificationViaDb: typeof verification = null;
  if (!verification) {
    verificationViaDb = await withResolvedDatabaseClient(async (client) => {
      const result = await client.query<{
        founder_session_meeting_slug: boolean;
        internal_action_items: boolean;
        crm_discovery_notes: boolean;
        executive_call_transcription: boolean;
        executive_call_guest_admission: boolean;
        crm_client_report_file_id: boolean;
        crm_discovery_questionnaire: boolean;
        company_details: boolean;
        simon_meeting_slug: string | null;
      }>(
        `select
          (select exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = 'founder_session_bookings'
              and column_name = 'meeting_slug'
          )) as founder_session_meeting_slug,
          (select exists (
            select 1 from information_schema.tables
            where table_schema = 'public'
              and table_name = 'internal_action_items'
          )) as internal_action_items,
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
          )) as executive_call_guest_admission,
          (select exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = 'crm_leads'
              and column_name = 'client_report_file_id'
          )) as crm_client_report_file_id,
          (select exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = 'crm_leads'
              and column_name = 'discovery_questionnaire'
          )) as crm_discovery_questionnaire,
          (select exists (
            select 1 from information_schema.tables
            where table_schema = 'public'
              and table_name = 'company_details'
          )) as company_details,
          (select meeting_slug from public.founder_session_bookings
           where id = '4e92abae-4d94-430e-8888-c2ecb95d8552') as simon_meeting_slug`,
      );
      return result.rows[0] ?? null;
    });
  }

  return NextResponse.json({
    ok: errors.length === 0,
    targetProjectRef: TARGET_PROJECT_REF,
    applied,
    errors,
    readiness,
    verification: verification ?? verificationViaDb,
  });
}

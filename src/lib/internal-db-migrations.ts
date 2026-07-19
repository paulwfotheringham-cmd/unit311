import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Client, type ClientBase } from "pg";

export const COMPETITORS_MIGRATION_PATH = "supabase/migrations/007_create_competitors.sql";
export const COMPETITORS_AFRICA_MIGRATION_PATH =
  "supabase/migrations/025_competitors_africa_regions.sql";
export const SUPPORT_TICKETS_MIGRATION_PATH =
  "supabase/migrations/026_create_support_tickets.sql";
export const CRM_CONNECTIONS_MIGRATION_PATH =
  "supabase/migrations/020_create_crm_connections.sql";
export const HR_EMPLOYEES_MIGRATION_PATH =
  "supabase/migrations/024_create_hr_employees.sql";
export const HR_EMPLOYEES_EXTENDED_MIGRATION_PATH =
  "supabase/migrations/034_hr_employees_extended_fields.sql";
export const INTERNAL_OPERATORS_MIGRATION_PATH =
  "supabase/migrations/019_create_internal_operators.sql";
export const FINANCIAL_EXPENSES_MIGRATION_PATH =
  "supabase/migrations/021_create_financial_expenses.sql";
export const GENERAL_LEDGER_MIGRATION_PATH =
  "supabase/migrations/071_general_ledger.sql";
export const CLIENT_PAYMENT_ACTIVATION_MIGRATION_PATH =
  "supabase/migrations/072_client_payment_activation.sql";
export const CRM_CONTACT_HISTORY_MIGRATION_PATH =
  "supabase/migrations/073_crm_contact_history.sql";
export const CRM_LEADS_MANUAL_REVIEW_MIGRATION_PATH =
  "supabase/migrations/074_crm_leads_manual_review.sql";
export const CRM_ORIGINAL_ENQUIRY_MIGRATION_PATH =
  "supabase/migrations/075_crm_original_enquiry.sql";
export const WORKSPACE_ID_PHASE1_MIGRATION_PATH =
  "supabase/migrations/076_workspace_id_phase1.sql";
export const WORKSPACE_ID_PHASE1_DEFAULTS_MIGRATION_PATH =
  "supabase/migrations/077_workspace_id_phase1_defaults.sql";
export const WORKSPACE_FOUNDATION_TABLES_MIGRATION_PATH =
  "supabase/migrations/078_workspace_foundation_tables.sql";
export const EMAIL_INFRASTRUCTURE_MIGRATION_PATH =
  "supabase/migrations/035_email_infrastructure.sql";
export const EMAIL_MAILBOX_ADMIN_ACCOUNT_MIGRATION_PATH =
  "supabase/migrations/059_email_mailbox_admin_account.sql";
export const INTERNAL_CLIENTS_MIGRATION_PATH =
  "supabase/migrations/037_create_internal_clients.sql";
export const INTERNAL_CLIENTS_FILES_FOLDER_MIGRATION_PATH =
  "supabase/migrations/038_internal_clients_files_folder.sql";
export const INTERNAL_CLIENTS_SIGNUP_PROFILE_MIGRATION_PATH =
  "supabase/migrations/058_internal_clients_signup_profile.sql";
export const FOUNDER_SESSION_BOOKINGS_MIGRATION_PATH =
  "supabase/migrations/039_founder_session_bookings.sql";
export const FOUNDER_BOOKING_WORKFLOW_MIGRATION_PATH =
  "supabase/migrations/057_founder_booking_workflow.sql";
export const FOUNDER_SESSION_FOCUS_OVERVIEW_MIGRATION_PATH =
  "supabase/migrations/065_founder_session_focus_overview.sql";
export const PLATFORM_PASSWORD_RESET_TOKENS_MIGRATION_PATH =
  "supabase/migrations/040_platform_password_reset_tokens.sql";
export const CLIENT_ONBOARDING_MIGRATION_PATH =
  "supabase/migrations/041_client_onboarding_records.sql";
export const PLATFORM_USERS_LAST_LOGIN_MIGRATION_PATH =
  "supabase/migrations/036_platform_users_last_login.sql";
export const PLATFORM_USERS_EMAIL_MIGRATION_PATH =
  "supabase/migrations/046_platform_users_email.sql";
export const PLATFORM_ORGANISATIONS_MIGRATION_PATH =
  "supabase/migrations/048_platform_organisations.sql";
export const PLATFORM_ORGANISATION_ONBOARDING_MIGRATION_PATH =
  "supabase/migrations/049_platform_organisation_onboarding.sql";
export const PLATFORM_SIGNUP_PAYMENT_MIGRATION_PATH =
  "supabase/migrations/050_platform_signup_payment.sql";
export const PLATFORM_USERS_CRM_LEAD_ID_MIGRATION_PATH =
  "supabase/migrations/080_platform_users_crm_lead_id.sql";
export const CLIENT_BILLING_PROFILE_MIGRATION_PATH =
  "supabase/migrations/081_client_billing_profile.sql";
export const WORKSPACE_ONBOARDING_COMPLETED_MIGRATION_PATH =
  "supabase/migrations/082_workspace_onboarding_completed.sql";
export const SYSTEM_ARCHITECTURE_DIAGRAMS_MIGRATION_PATH =
  "supabase/migrations/083_system_architecture_diagrams.sql";
export const PLATFORM_CUSTOMER_SUBSCRIPTIONS_MIGRATION_PATH =
  "supabase/migrations/084_platform_customer_subscriptions.sql";
export const EXECUTIVE_CALL_WEBRTC_SIGNALS_MIGRATION_PATH =
  "supabase/migrations/085_executive_call_webrtc_signals.sql";
export const SOFTWARE_ASSET_REGISTER_MIGRATION_PATH =
  "supabase/migrations/086_software_asset_register.sql";
export const CRM_PROJECTS_WORKSPACE_ISOLATION_MIGRATION_PATH =
  "supabase/migrations/087_crm_projects_workspace_isolation.sql";
export const FINANCIALS_FILES_WORKSPACE_ISOLATION_MIGRATION_PATH =
  "supabase/migrations/088_financials_files_workspace_isolation.sql";
export const MESSAGING_EMAIL_SUPPORT_WORKSPACE_ISOLATION_MIGRATION_PATH =
  "supabase/migrations/089_messaging_email_support_workspace_isolation.sql";
export const CLIENT_PLATFORM_SUBDOMAIN_MIGRATION_PATH =
  "supabase/migrations/051_client_platform_subdomain.sql";
export const PAYMENT_RECEIPT_FILE_ID_MIGRATION_PATH =
  "supabase/migrations/052_payment_receipt_file_id.sql";
export const WHITEBOARD_MIGRATION_PATH = "supabase/migrations/008_create_internal_whiteboard.sql";
export const WHITEBOARD_PROJECTS_MIGRATION_PATH =
  "supabase/migrations/010_create_whiteboard_projects.sql";

export async function ensureSoftwareAssetRegisterTables(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("software_assets");
  if (exists === true) return true;

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      if (await tableExists(client, "software_assets")) return true;
      await applyMigration(client, SOFTWARE_ASSET_REGISTER_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } catch (error) {
      if (!isDirectDbConnectionError(error)) {
        console.warn("[software-assets] direct DB ensure failed", error);
      }
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  const applied = await applyMigrationViaManagementApi(SOFTWARE_ASSET_REGISTER_MIGRATION_PATH);
  if (applied) {
    await reloadPostgrestSchema();
    return true;
  }

  return false;
}

export async function withSoftwareAssetRegisterTables<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "software_assets")) throw error;
      await ensureSoftwareAssetRegisterTables();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("software_assets table is unavailable.");
}

export async function ensureExecutiveCallWebrtcSignalsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("executive_call_webrtc_signals");
  if (exists === true) return true;

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      if (await tableExists(client, "executive_call_webrtc_signals")) return true;
      await applyMigration(client, EXECUTIVE_CALL_WEBRTC_SIGNALS_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } catch (error) {
      if (!isDirectDbConnectionError(error)) {
        console.warn("[executive-call-webrtc] direct DB ensure failed", error);
      }
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  const applied = await applyMigrationViaManagementApi(EXECUTIVE_CALL_WEBRTC_SIGNALS_MIGRATION_PATH);
  if (applied) {
    await reloadPostgrestSchema();
    return true;
  }

  return false;
}

export async function withExecutiveCallWebrtcSignalsTable<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "executive_call_webrtc_signals")) throw error;
      await ensureExecutiveCallWebrtcSignalsTable();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("executive_call_webrtc_signals table is unavailable.");
}

export async function ensurePlatformCustomerSubscriptionsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("platform_customer_subscriptions");
  if (exists === true) return true;

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      if (await tableExists(client, "platform_customer_subscriptions")) return true;
      await applyMigration(client, PLATFORM_CUSTOMER_SUBSCRIPTIONS_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } catch (error) {
      if (!isDirectDbConnectionError(error)) {
        // Fall through to management API when direct DB fails.
        console.warn("[platform-billing] direct DB ensure failed", error);
      }
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  // Apply when missing (false) or unknown (null) — null previously returned false without applying.
  const applied = await applyMigrationViaManagementApi(
    PLATFORM_CUSTOMER_SUBSCRIPTIONS_MIGRATION_PATH,
  );
  if (applied) {
    await reloadPostgrestSchema();
    return true;
  }

  return false;
}

export async function withPlatformCustomerSubscriptionsTable<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "platform_customer_subscriptions")) throw error;
      await ensurePlatformCustomerSubscriptionsTable();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("platform_customer_subscriptions table is unavailable.");
}

function getDatabaseUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    null
  );
}

function getSupabaseAccessToken() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  return token && token.length >= 20 ? token : null;
}

function getDatabasePassword() {
  return (
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    process.env.DATABASE_PASSWORD?.trim() ||
    process.env.POSTGRES_PASSWORD?.trim() ||
    null
  );
}

function getServiceRolePoolerUrl() {
  const projectRef = getSupabaseProjectRef();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!projectRef || !serviceRole || serviceRole.length < 80) return null;

  return `postgresql://postgres.${projectRef}:${encodeURIComponent(serviceRole)}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres`;
}

export function getMigrationReadiness() {
  const dbPassword = getDatabasePassword();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const accessToken = getSupabaseAccessToken();

  return {
    hasSupabaseAccessToken: Boolean(accessToken),
    hasSupabaseDbUrl: Boolean(getDatabaseUrl()),
    hasSupabaseDbPassword: Boolean(dbPassword),
    hasSupabaseServiceRoleKey: serviceRole.length > 0,
    serviceRoleKeyLength: serviceRole.length,
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseProjectRef: Boolean(getSupabaseProjectRef()),
    hasSetupSecret: Boolean(process.env.INTERNAL_FILES_SETUP_SECRET),
  };
}

export function listDatabaseConnectionCandidates() {
  const candidates: Array<{ label: string; url: string }> = [];
  const seen = new Set<string>();
  const projectRef = getSupabaseProjectRef();
  const dbPassword = getDatabasePassword();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const add = (label: string, url: string | null) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push({ label, url });
  };

  add("configured-db-url", getDatabaseUrl());

  if (projectRef && dbPassword) {
    add(
      "pooler-session-db-password",
      `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres`,
    );
    add(
      "pooler-transaction-db-password",
      `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-1-eu-west-2.pooler.supabase.com:6543/postgres`,
    );
    add(
      "direct-db-password",
      `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
    );
  }

  if (projectRef && serviceRole && serviceRole.length >= 80) {
    add(
      "pooler-session-service-role",
      `postgresql://postgres.${projectRef}:${encodeURIComponent(serviceRole)}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres`,
    );
    add(
      "pooler-transaction-service-role",
      `postgresql://postgres.${projectRef}:${encodeURIComponent(serviceRole)}@aws-1-eu-west-2.pooler.supabase.com:6543/postgres`,
    );
    add("pooler-session-service-role-aws0", getServiceRolePoolerUrl()?.replace("aws-1-", "aws-0-") ?? null);
  }

  return candidates;
}

export function resolveDatabaseUrl() {
  return listDatabaseConnectionCandidates()[0]?.url ?? null;
}

export async function probeDatabaseConnection(url: string) {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query("select 1 as ok");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function withResolvedDatabaseClient<T>(
  operation: (client: ClientBase) => Promise<T>,
): Promise<T | null> {
  for (const candidate of listDatabaseConnectionCandidates()) {
    const client = new Client({
      connectionString: candidate.url,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      return await operation(client);
    } catch (error) {
      if (!isDirectDbConnectionError(error)) throw error;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  return null;
}

function getSupabaseProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

function readMigrationSql(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function isDirectDbConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("getaddrinfo") ||
    message.includes("password authentication failed") ||
    message.includes("SASL authentication failed")
  );
}

async function tableExistsViaManagementApi(tableName: string) {
  const token = getSupabaseAccessToken();
  const projectRef = getSupabaseProjectRef();
  if (!token || !projectRef) return null;

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `select exists (
          select 1 from information_schema.tables
          where table_schema = 'public' and table_name = '${tableName}'
        ) as exists`,
      }),
    },
  );

  const data = (await response.json()) as Array<{ exists?: boolean }> | { message?: string };
  if (!response.ok) return null;
  if (Array.isArray(data)) return data[0]?.exists === true;
  return null;
}

async function applyMigrationViaManagementApi(relativePath: string) {
  const token = getSupabaseAccessToken();
  const projectRef = getSupabaseProjectRef();
  if (!token || !projectRef) return false;

  const sql = readMigrationSql(relativePath);
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
    console.error(
      `[migrations] management API apply failed for ${relativePath}:`,
      response.status,
      body.slice(0, 500),
    );
    // Stash last error for one-shot diagnostics.
    (globalThis as { __lastMigrationApiError?: string }).__lastMigrationApiError =
      `${response.status}: ${body.slice(0, 800)}`;
    return false;
  }

  await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: `notify pgrst, 'reload schema'` }),
  });

  return true;
}

export function getLastMigrationApiError() {
  return (globalThis as { __lastMigrationApiError?: string }).__lastMigrationApiError ?? null;
}

async function reloadPostgrestSchema() {
  const token = getSupabaseAccessToken();
  const projectRef = getSupabaseProjectRef();
  if (token && projectRef) {
    await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: `notify pgrst, 'reload schema'` }),
    });
    return true;
  }

  const dbUrl = resolveDatabaseUrl();
  if (!dbUrl) return false;

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(`notify pgrst, 'reload schema'`);
    return true;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function tableExists(client: ClientBase, tableName: string) {
  const result = await client.query<{ exists: boolean }>(
    `select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = $1
    ) as exists`,
    [tableName],
  );

  return result.rows[0]?.exists === true;
}

async function applyMigration(client: ClientBase, relativePath: string) {
  const sql = readMigrationSql(relativePath);
  await client.query(sql);
  await client.query(`notify pgrst, 'reload schema'`);
}

export async function queryScalarViaManagementApi<T>(query: string): Promise<T | null> {
  const token = getSupabaseAccessToken();
  const projectRef = getSupabaseProjectRef();
  if (!token || !projectRef) return null;

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

  const data = (await response.json()) as Array<T> | { message?: string };
  if (!response.ok || !Array.isArray(data)) return null;
  return data[0] ?? null;
}

async function countCompetitorsInRegion(region: string): Promise<number | null> {
  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const result = await client.query<{ count: string }>(
        `select count(*)::int as count from public.competitors where region = $1`,
        [region],
      );
      return Number(result.rows[0]?.count ?? 0);
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  const row = await queryScalarViaManagementApi<{ count: number }>(
    `select count(*)::int as count from public.competitors where region = '${region}'`,
  );
  return row?.count ?? null;
}

export async function ensureCompetitorsSeedData(): Promise<void> {
  await ensureCompetitorsTable();

  const kenyaCount = await countCompetitorsInRegion("kenya");
  if (kenyaCount !== 0) return;

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await applyMigration(client, COMPETITORS_AFRICA_MIGRATION_PATH);
      return;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  const applied = await applyMigrationViaManagementApi(COMPETITORS_AFRICA_MIGRATION_PATH);
  if (applied) await reloadPostgrestSchema();
}

export function isMissingTableError(error: unknown, tableName: string) {
  const message = error instanceof Error ? error.message : String(error);

  // PostgREST column errors mention the table name but are not missing-table errors.
  if (message.includes(" column ") || message.includes("' column")) {
    return false;
  }

  return (
    (message.includes("schema cache") && message.includes("table")) ||
    message.includes(`relation "${tableName}" does not exist`) ||
    message.includes(`relation "public.${tableName}" does not exist`) ||
    (message.includes(`'public.${tableName}'`) && !message.includes("column")) ||
    (message.includes(`public.${tableName}`) &&
      !message.includes("column") &&
      (message.includes("schema cache") || message.includes("does not exist")))
  );
}

export function isMissingColumnError(error: unknown, columnName: string) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes(columnName) &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}

async function columnExistsViaManagementApi(
  tableName: string,
  columnName: string,
): Promise<boolean | null> {
  const row = await queryScalarViaManagementApi<{ exists: boolean }>(
    `select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = '${tableName}'
        and column_name = '${columnName}'
    ) as exists`,
  );
  if (row == null) return null;
  return row.exists === true;
}

async function columnExists(client: ClientBase, tableName: string, columnName: string) {
  const result = await client.query<{ exists: boolean }>(
    `select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
    ) as exists`,
    [tableName, columnName],
  );
  return result.rows[0]?.exists === true;
}

export async function ensureCompetitorsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("competitors");
  if (exists === true) return true;

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "competitors")) return true;
      await applyMigration(client, COMPETITORS_MIGRATION_PATH);
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    return applyMigrationViaManagementApi(COMPETITORS_MIGRATION_PATH);
  }

  return false;
}

export async function ensureWhiteboardTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("internal_whiteboard");
  if (exists === true) return true;

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "internal_whiteboard")) return true;
      await applyMigration(client, WHITEBOARD_MIGRATION_PATH);
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(WHITEBOARD_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function ensureWhiteboardProjectsTable(): Promise<boolean> {
  await ensureWhiteboardTable();

  const exists = await tableExistsViaManagementApi("whiteboard_projects");
  if (exists === true) return true;

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "whiteboard_projects")) return true;
      await applyMigration(client, WHITEBOARD_PROJECTS_MIGRATION_PATH);
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(WHITEBOARD_PROJECTS_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function ensureInternalFeatureTables() {
  await Promise.all([
    ensureCompetitorsTable(),
    ensureWhiteboardTable(),
    ensureWhiteboardProjectsTable(),
  ]);
}

export async function withCompetitorsTable<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isMissingTableError(error, "competitors")) throw error;
    const applied = await ensureCompetitorsTable();
    if (!applied) throw error;
    return operation();
  }
}

export async function withWhiteboardTable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "internal_whiteboard")) throw error;
      await ensureWhiteboardTable();
      await reloadPostgrestSchema();
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  throw new Error("Failed to access internal whiteboard table.");
}

export async function ensureSupportTicketsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("support_tickets");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "support_tickets")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, SUPPORT_TICKETS_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(SUPPORT_TICKETS_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withSupportTicketsTable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "support_tickets")) throw error;
      await ensureSupportTicketsTable();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access support tickets table.");
}

export async function ensureCrmConnectionsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("crm_connections");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "crm_connections")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, CRM_CONNECTIONS_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(CRM_CONNECTIONS_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withCrmConnectionsTable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "crm_connections")) throw error;
      await ensureCrmConnectionsTable();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access CRM connections table.");
}

async function applyHrEmployeesMigrations(client: ClientBase) {
  if (!(await tableExists(client, "hr_employees"))) {
    await applyMigration(client, HR_EMPLOYEES_MIGRATION_PATH);
  }
  await applyMigration(client, HR_EMPLOYEES_EXTENDED_MIGRATION_PATH);
}

export async function ensureHrEmployeesTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("hr_employees");
  if (exists === true) {
    const extended = await applyMigrationViaManagementApi(HR_EMPLOYEES_EXTENDED_MIGRATION_PATH);
    if (extended) await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "hr_employees")) {
        await applyMigration(client, HR_EMPLOYEES_EXTENDED_MIGRATION_PATH);
        await reloadPostgrestSchema();
        return true;
      }
      await applyHrEmployeesMigrations(client);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const baseApplied = await applyMigrationViaManagementApi(HR_EMPLOYEES_MIGRATION_PATH);
    const extendedApplied = await applyMigrationViaManagementApi(HR_EMPLOYEES_EXTENDED_MIGRATION_PATH);
    if (baseApplied || extendedApplied) await reloadPostgrestSchema();
    return baseApplied || extendedApplied;
  }

  return false;
}

export async function withHrEmployeesTable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "hr_employees")) throw error;
      await ensureHrEmployeesTable();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access HR employees table.");
}

export async function ensureInternalOperatorsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("internal_operators");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "internal_operators")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, INTERNAL_OPERATORS_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(INTERNAL_OPERATORS_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withInternalOperatorsTable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "internal_operators")) throw error;
      await ensureInternalOperatorsTable();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access internal operators table.");
}

export async function ensureFinancialExpensesTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("financial_expenses");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "financial_expenses")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, FINANCIAL_EXPENSES_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(FINANCIAL_EXPENSES_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withFinancialExpensesTable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "financial_expenses")) throw error;
      await ensureFinancialExpensesTable();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access financial expenses table.");
}

export async function ensureEmailInfrastructureTables(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("email_mailbox_credentials");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "email_mailbox_credentials")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, EMAIL_INFRASTRUCTURE_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(EMAIL_INFRASTRUCTURE_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withEmailInfrastructureTables<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        !isMissingTableError(error, "email_mailbox_credentials") &&
        !isMissingTableError(error, "email_whatsapp_settings") &&
        !isMissingTableError(error, "email_whatsapp_notification_log")
      ) {
        throw error;
      }
      await ensureEmailInfrastructureTables();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access email infrastructure tables.");
}

function isEmailMailboxAdminConstraintError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("email_mailbox_credentials_account_id_check");
}

async function adminMailboxConstraintReadyViaManagementApi(): Promise<boolean | null> {
  const token = getSupabaseAccessToken();
  const projectRef = getSupabaseProjectRef();
  if (!token || !projectRef) return null;

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `select pg_get_constraintdef(c.oid) as definition
          from pg_constraint c
          join pg_class t on t.oid = c.conrelid
          join pg_namespace n on n.oid = t.relnamespace
          where n.nspname = 'public'
            and t.relname = 'email_mailbox_credentials'
            and c.conname = 'email_mailbox_credentials_account_id_check'`,
      }),
    },
  );

  const data = (await response.json()) as Array<{ definition?: string }> | { message?: string };
  if (!response.ok) return null;
  if (!Array.isArray(data)) return null;
  return data[0]?.definition?.includes("'admin'") === true;
}

async function adminMailboxConstraintReady(client: ClientBase): Promise<boolean> {
  const result = await client.query<{ definition?: string }>(
    `select pg_get_constraintdef(c.oid) as definition
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'email_mailbox_credentials'
        and c.conname = 'email_mailbox_credentials_account_id_check'`,
  );

  return result.rows[0]?.definition?.includes("'admin'") === true;
}

export async function ensureEmailMailboxAdminAccount(): Promise<boolean> {
  const ready = await adminMailboxConstraintReadyViaManagementApi();
  if (ready === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await adminMailboxConstraintReady(client)) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, EMAIL_MAILBOX_ADMIN_ACCOUNT_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (ready === false) {
    const applied = await applyMigrationViaManagementApi(EMAIL_MAILBOX_ADMIN_ACCOUNT_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withEmailMailboxCredentials<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isEmailMailboxAdminConstraintError(error)) throw error;
      await ensureEmailMailboxAdminAccount();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access email mailbox credentials.");
}

export async function withWhiteboardProjectsTable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "whiteboard_projects")) throw error;
      await ensureWhiteboardProjectsTable();
      await reloadPostgrestSchema();
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  throw new Error("Failed to access whiteboard projects table.");
}

export async function ensureInternalClientsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("internal_clients");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "internal_clients")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, INTERNAL_CLIENTS_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(INTERNAL_CLIENTS_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withInternalClientsTable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "internal_clients")) throw error;
      await ensureInternalClientsTable();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access internal clients table.");
}

export async function ensureClientOnboardingRecordsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("client_onboarding_records");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = resolveDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "client_onboarding_records")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, CLIENT_ONBOARDING_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } catch {
      // Fall through to management API attempt below.
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(CLIENT_ONBOARDING_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey) {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/client_onboarding_records?select=id&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      },
    );
    if (response.ok) {
      return true;
    }
  }

  return false;
}

export async function ensureInternalClientsFilesFolderColumns(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi("internal_clients", "files_folder_id");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await columnExists(client, "internal_clients", "files_folder_id")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, INTERNAL_CLIENTS_FILES_FOLDER_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(INTERNAL_CLIENTS_FILES_FOLDER_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function columnExistsViaRestApi(tableName: string, columnName: string) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return null;

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${tableName}?select=${encodeURIComponent(columnName)}&limit=1`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    },
  );

  if (response.ok) return true;

  const text = await response.text();
  if (
    text.includes(columnName) &&
    (text.includes("schema cache") || text.includes("does not exist"))
  ) {
    return false;
  }

  return null;
}

export async function ensureInternalClientsPlatformSubdomainColumns(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi("internal_clients", "platform_subdomain");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const appliedViaDb = await withResolvedDatabaseClient(async (client) => {
    if (await columnExists(client, "internal_clients", "platform_subdomain")) {
      return true;
    }
    await applyMigration(client, CLIENT_PLATFORM_SUBDOMAIN_MIGRATION_PATH);
    return true;
  });

  if (appliedViaDb) {
    await reloadPostgrestSchema();
    return true;
  }

  const applied = await applyMigrationViaManagementApi(CLIENT_PLATFORM_SUBDOMAIN_MIGRATION_PATH);
  if (applied) {
    await reloadPostgrestSchema();
    return true;
  }

  const viaRest = await columnExistsViaRestApi("internal_clients", "platform_subdomain");
  return viaRest === true;
}

export async function ensurePaymentReceiptFileIdColumn(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi(
    "platform_organisations",
    "payment_receipt_file_id",
  );
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const appliedViaDb = await withResolvedDatabaseClient(async (client) => {
    if (await columnExists(client, "platform_organisations", "payment_receipt_file_id")) {
      return true;
    }
    await applyMigration(client, PAYMENT_RECEIPT_FILE_ID_MIGRATION_PATH);
    return true;
  });

  if (appliedViaDb) {
    await reloadPostgrestSchema();
    return true;
  }

  const applied = await applyMigrationViaManagementApi(PAYMENT_RECEIPT_FILE_ID_MIGRATION_PATH);
  if (applied) {
    await reloadPostgrestSchema();
    return true;
  }

  const viaRest = await columnExistsViaRestApi(
    "platform_organisations",
    "payment_receipt_file_id",
  );
  return viaRest === true;
}

export async function withInternalClientsPlatformSubdomainColumns<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        !isMissingColumnError(error, "platform_subdomain") &&
        !isMissingColumnError(error, "platform_ready_at")
      ) {
        throw error;
      }
      await ensureInternalClientsPlatformSubdomainColumns();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access internal_clients platform subdomain columns.");
}

export async function withInternalClientsFilesFolderColumns<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingColumnError(error, "files_folder_id")) throw error;
      await ensureInternalClientsFilesFolderColumns();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access internal_clients.files_folder_id.");
}

export async function ensureInternalClientsSignupProfileColumns(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi("internal_clients", "job_title");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await columnExists(client, "internal_clients", "job_title")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, INTERNAL_CLIENTS_SIGNUP_PROFILE_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(INTERNAL_CLIENTS_SIGNUP_PROFILE_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withInternalClientsSignupProfileColumns<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingColumnError(error, "job_title")) throw error;
      await ensureInternalClientsSignupProfileColumns();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access internal_clients signup profile columns.");
}

export async function ensurePlatformUsersLastLoginColumn(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi("platform_users", "last_login_at");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await columnExists(client, "platform_users", "last_login_at")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, PLATFORM_USERS_LAST_LOGIN_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(PLATFORM_USERS_LAST_LOGIN_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withPlatformUsersLastLoginColumn<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingColumnError(error, "last_login_at")) throw error;
      await ensurePlatformUsersLastLoginColumn();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access platform_users.last_login_at.");
}

export async function ensureFounderSessionBookingsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("founder_session_bookings");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "founder_session_bookings")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, FOUNDER_SESSION_BOOKINGS_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(FOUNDER_SESSION_BOOKINGS_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withFounderSessionBookingsTable<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "founder_session_bookings")) throw error;
      const applied = await ensureFounderSessionBookingsTable();
      await reloadPostgrestSchema();
      if (!applied && attempt === 4) {
        throw new Error(
          "Founder session bookings table is not available. Set SUPABASE_DB_URL or SUPABASE_ACCESS_TOKEN on the server.",
        );
      }
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access founder_session_bookings table.");
}

export async function ensureFounderSessionFocusOverviewColumns(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi(
    "founder_session_bookings",
    "focus_overview_pdf_file_id",
  );
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const appliedViaDb = await withResolvedDatabaseClient(async (client) => {
    if (await columnExists(client, "founder_session_bookings", "focus_overview_pdf_file_id")) {
      return true;
    }
    await applyMigration(client, FOUNDER_SESSION_FOCUS_OVERVIEW_MIGRATION_PATH);
    return true;
  });

  if (appliedViaDb) {
    await reloadPostgrestSchema();
    return true;
  }

  const applied = await applyMigrationViaManagementApi(FOUNDER_SESSION_FOCUS_OVERVIEW_MIGRATION_PATH);
  if (applied) {
    await reloadPostgrestSchema();
    return true;
  }

  const viaRest = await columnExistsViaRestApi(
    "founder_session_bookings",
    "focus_overview_pdf_file_id",
  );
  return viaRest === true;
}

export async function withFounderSessionFocusOverviewColumns<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        !isMissingColumnError(error, "focus_selections") &&
        !isMissingColumnError(error, "focus_overview_pdf_file_id") &&
        !isMissingColumnError(error, "focus_selections_submitted_at")
      ) {
        throw error;
      }
      await ensureFounderSessionFocusOverviewColumns();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access founder_session_bookings focus overview columns.");
}

export async function ensureInternalActionItemsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("internal_action_items");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "internal_action_items")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, FOUNDER_BOOKING_WORKFLOW_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(FOUNDER_BOOKING_WORKFLOW_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  const viaRest = await columnExistsViaRestApi("internal_action_items", "id");
  if (viaRest === true) {
    await reloadPostgrestSchema();
    return true;
  }

  return false;
}

export async function withInternalActionItemsTable<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "internal_action_items")) throw error;
      const applied = await ensureInternalActionItemsTable();
      await reloadPostgrestSchema();
      if (!applied && attempt === 4) {
        throw new Error(
          "Internal action items table is not available. Set SUPABASE_DB_URL or SUPABASE_ACCESS_TOKEN on the server.",
        );
      }
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access internal_action_items table.");
}

export async function ensurePlatformPasswordResetTokensTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("platform_password_reset_tokens");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "platform_password_reset_tokens")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, PLATFORM_PASSWORD_RESET_TOKENS_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(PLATFORM_PASSWORD_RESET_TOKENS_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withPlatformPasswordResetTokensTable<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "platform_password_reset_tokens")) throw error;
      const applied = await ensurePlatformPasswordResetTokensTable();
      await reloadPostgrestSchema();
      if (!applied && attempt === 4) {
        throw new Error(
          "Password reset is temporarily unavailable. Please try again later or contact support.",
        );
      }
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access platform_password_reset_tokens table.");
}

export async function ensurePlatformUsersEmailColumn(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi("platform_users", "email");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await columnExists(client, "platform_users", "email")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, PLATFORM_USERS_EMAIL_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(PLATFORM_USERS_EMAIL_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function withPlatformUsersEmailColumn<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingColumnError(error, "email")) throw error;
      await ensurePlatformUsersEmailColumn();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access platform_users.email.");
}

export async function ensurePlatformOrganisationsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("platform_organisations");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "platform_organisations")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, PLATFORM_ORGANISATIONS_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(PLATFORM_ORGANISATIONS_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function ensurePlatformOrganisationOnboarding(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("platform_organisation_onboarding");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await tableExists(client, "platform_organisation_onboarding")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, PLATFORM_ORGANISATION_ONBOARDING_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(
      PLATFORM_ORGANISATION_ONBOARDING_MIGRATION_PATH,
    );
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function applyPlatformSignupPaymentMigration(): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
}> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = getSupabaseProjectRef();

  if (!token || !projectRef) {
    return { ok: false, error: "Missing SUPABASE_ACCESS_TOKEN or project ref." };
  }

  const sql = readMigrationSql(PLATFORM_SIGNUP_PAYMENT_MIGRATION_PATH);
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
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: typeof data === "object" ? JSON.stringify(data) : String(data),
    };
  }

  await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: `notify pgrst, 'reload schema'` }),
  });

  return { ok: true };
}

export async function ensurePlatformEmailVerificationTokensTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("platform_email_verification_tokens");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      if (await tableExists(client, "platform_email_verification_tokens")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, PLATFORM_SIGNUP_PAYMENT_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(PLATFORM_SIGNUP_PAYMENT_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function ensurePlatformUsersEmailVerifiedColumn(): Promise<boolean> {
  await ensurePlatformEmailVerificationTokensTable().catch(() => false);
  return true;
}

export async function withPlatformEmailVerificationTokensTable<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "platform_email_verification_tokens")) throw error;
      await ensurePlatformEmailVerificationTokensTable();
      await reloadPostgrestSchema();
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access platform_email_verification_tokens table.");
}

export async function ensurePlatformUsersCrmLeadIdColumn(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi("platform_users", "crm_lead_id");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await columnExists(client, "platform_users", "crm_lead_id")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, PLATFORM_USERS_CRM_LEAD_ID_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(PLATFORM_USERS_CRM_LEAD_ID_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function ensureClientBillingProfileColumns(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi(
    "internal_clients",
    "primary_contact_first_name",
  );
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await columnExists(client, "internal_clients", "primary_contact_first_name")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, CLIENT_BILLING_PROFILE_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(CLIENT_BILLING_PROFILE_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function ensurePlatformUsersSignupBillingProfileColumn(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi("platform_users", "signup_billing_profile");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await columnExists(client, "platform_users", "signup_billing_profile")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, CLIENT_BILLING_PROFILE_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(CLIENT_BILLING_PROFILE_MIGRATION_PATH);
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function ensureWorkspaceOnboardingCompletedColumn(): Promise<boolean> {
  const exists = await columnExistsViaManagementApi("workspaces", "onboarding_completed");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      if (await columnExists(client, "workspaces", "onboarding_completed")) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, WORKSPACE_ONBOARDING_COMPLETED_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(
      WORKSPACE_ONBOARDING_COMPLETED_MIGRATION_PATH,
    );
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

export async function ensureSystemArchitectureDiagramsTable(): Promise<boolean> {
  const exists = await tableExistsViaManagementApi("system_architecture_diagrams");
  if (exists === true) {
    await reloadPostgrestSchema();
    return true;
  }

  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      const { rows } = await client.query<{ exists: boolean }>(
        `select exists (
          select 1 from information_schema.tables
          where table_schema = 'public' and table_name = 'system_architecture_diagrams'
        ) as exists`,
      );
      if (rows[0]?.exists) {
        await reloadPostgrestSchema();
        return true;
      }
      await applyMigration(client, SYSTEM_ARCHITECTURE_DIAGRAMS_MIGRATION_PATH);
      await reloadPostgrestSchema();
      return true;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  if (exists === false) {
    const applied = await applyMigrationViaManagementApi(
      SYSTEM_ARCHITECTURE_DIAGRAMS_MIGRATION_PATH,
    );
    if (applied) await reloadPostgrestSchema();
    return applied;
  }

  return false;
}

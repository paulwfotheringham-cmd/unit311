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
export const EMAIL_INFRASTRUCTURE_MIGRATION_PATH =
  "supabase/migrations/035_email_infrastructure.sql";
export const INTERNAL_CLIENTS_MIGRATION_PATH =
  "supabase/migrations/037_create_internal_clients.sql";
export const INTERNAL_CLIENTS_FILES_FOLDER_MIGRATION_PATH =
  "supabase/migrations/038_internal_clients_files_folder.sql";
export const FOUNDER_SESSION_BOOKINGS_MIGRATION_PATH =
  "supabase/migrations/039_founder_session_bookings.sql";
export const PLATFORM_USERS_LAST_LOGIN_MIGRATION_PATH =
  "supabase/migrations/036_platform_users_last_login.sql";
export const WHITEBOARD_MIGRATION_PATH = "supabase/migrations/008_create_internal_whiteboard.sql";
export const WHITEBOARD_PROJECTS_MIGRATION_PATH =
  "supabase/migrations/010_create_whiteboard_projects.sql";

function getDatabaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null;
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

async function tableExistsViaManagementApi(tableName: string) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
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
  const token = process.env.SUPABASE_ACCESS_TOKEN;
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

  if (!response.ok) return false;

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

async function reloadPostgrestSchema() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
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

  const dbUrl = getDatabaseUrl();
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

async function queryScalarViaManagementApi<T>(query: string): Promise<T | null> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
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
  return (
    message.includes("schema cache") ||
    message.includes(`'public.${tableName}'`) ||
    message.includes(`public.${tableName}`) ||
    message.includes(`relation "${tableName}" does not exist`) ||
    message.includes(`relation "public.${tableName}" does not exist`)
  );
}

export function isMissingColumnError(error: unknown, columnName: string) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(columnName) && message.includes("does not exist");
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

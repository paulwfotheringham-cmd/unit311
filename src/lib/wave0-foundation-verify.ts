import {
  queryScalarViaManagementApi,
  withResolvedDatabaseClient,
} from "@/lib/internal-db-migrations";

export type Wave0FoundationCheck = {
  readonly key: string;
  readonly label: string;
  readonly ok: boolean;
};

export type Wave0FoundationReport = {
  readonly ok: boolean;
  readonly checks: Wave0FoundationCheck[];
  readonly method: "management-api" | "postgres" | "unavailable";
};

type Wave0Row = {
  workspaces: boolean;
  client_onboarding_records: boolean;
  company_details: boolean;
  hr_employees: boolean;
  internal_operators: boolean;
  platform_users: boolean;
  internal_clients_workspace_id: boolean;
  crm_leads_workspace_id: boolean;
  invoices_workspace_id: boolean;
  integration_providers: boolean;
  workspace_integration_connections: boolean;
};

const WAVE0_VERIFY_SQL = `
select
  (select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'workspaces'
  )) as workspaces,
  (select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'client_onboarding_records'
  )) as client_onboarding_records,
  (select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'company_details'
  )) as company_details,
  (select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'hr_employees'
  )) as hr_employees,
  (select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'internal_operators'
  )) as internal_operators,
  (select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'platform_users'
  )) as platform_users,
  (select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'internal_clients'
      and column_name = 'workspace_id'
  )) as internal_clients_workspace_id,
  (select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crm_leads'
      and column_name = 'workspace_id'
  )) as crm_leads_workspace_id,
  (select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'workspace_id'
  )) as invoices_workspace_id,
  (select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'integration_providers'
  )) as integration_providers,
  (select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'workspace_integration_connections'
  )) as workspace_integration_connections
`;

function rowToChecks(row: Wave0Row): Wave0FoundationCheck[] {
  return [
    { key: "workspaces", label: "workspaces table", ok: row.workspaces },
    {
      key: "client_onboarding_records",
      label: "client_onboarding_records table",
      ok: row.client_onboarding_records,
    },
    { key: "company_details", label: "company_details table (092)", ok: row.company_details },
    { key: "hr_employees", label: "hr_employees table", ok: row.hr_employees },
    { key: "internal_operators", label: "internal_operators table", ok: row.internal_operators },
    { key: "platform_users", label: "platform_users table", ok: row.platform_users },
    {
      key: "internal_clients_workspace_id",
      label: "internal_clients.workspace_id",
      ok: row.internal_clients_workspace_id,
    },
    {
      key: "crm_leads_workspace_id",
      label: "crm_leads.workspace_id",
      ok: row.crm_leads_workspace_id,
    },
    {
      key: "invoices_workspace_id",
      label: "invoices.workspace_id",
      ok: row.invoices_workspace_id,
    },
    {
      key: "integration_providers",
      label: "integration_providers table (093)",
      ok: row.integration_providers,
    },
    {
      key: "workspace_integration_connections",
      label: "workspace_integration_connections table (093)",
      ok: row.workspace_integration_connections,
    },
  ];
}

/**
 * Read-only Wave 0 foundation schema probe.
 * Never mutates schema — use pending-migrations apply for remediation.
 */
export async function verifyWave0FoundationSchema(): Promise<Wave0FoundationReport> {
  const viaApi = await queryScalarViaManagementApi<Wave0Row>(WAVE0_VERIFY_SQL);
  if (viaApi) {
    const checks = rowToChecks(viaApi);
    return {
      ok: checks.every((check) => check.ok),
      checks,
      method: "management-api",
    };
  }

  const viaDb = await withResolvedDatabaseClient(async (client) => {
    const result = await client.query<Wave0Row>(WAVE0_VERIFY_SQL);
    return result.rows[0] ?? null;
  });

  if (viaDb) {
    const checks = rowToChecks(viaDb);
    return {
      ok: checks.every((check) => check.ok),
      checks,
      method: "postgres",
    };
  }

  return {
    ok: false,
    checks: [],
    method: "unavailable",
  };
}

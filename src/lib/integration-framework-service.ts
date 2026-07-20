import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from "@/lib/integration-credentials-crypto";
import {
  INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED,
  isIntegrationCategory,
  isIntegrationConnectionStatus,
  type IntegrationCategory,
  type IntegrationConnectionPublic,
  type IntegrationConnectionStatus,
  type IntegrationHealthStatus,
  type IntegrationProvider,
  type ResolvedIntegrationConnection,
} from "@/lib/integration-framework-data";
import { isMissingTableError } from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbProvider = {
  id: string;
  code: string;
  category: string;
  display_name: string;
  auth_methods: unknown;
  default_capabilities: unknown;
  is_active: boolean;
};

type DbConnection = {
  id: string;
  workspace_id: string;
  provider_id: string;
  category: string;
  enabled: boolean;
  status: string;
  manual_mode: boolean;
  auth_method: string | null;
  is_default_for_category: boolean;
  display_label: string | null;
  credentials_encrypted: string | null;
  credentials_key_id: string | null;
  config: unknown;
  capabilities: unknown;
  notes: string | null;
  last_health_at: string | null;
  last_health_status: string | null;
  last_error: string | null;
  last_tested_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  integration_providers?: DbProvider | DbProvider[] | null;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function throwIfSchemaMissing(error: { message: string }) {
  if (
    isMissingTableError(error, "integration_providers") ||
    isMissingTableError(error, "workspace_integration_connections")
  ) {
    throw new Error(INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED);
  }
  throw new Error(error.message);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asConfigObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapProvider(row: DbProvider): IntegrationProvider {
  if (!isIntegrationCategory(row.category)) {
    throw new Error(`Invalid provider category: ${row.category}`);
  }
  return {
    id: row.id,
    code: row.code,
    category: row.category,
    displayName: row.display_name,
    authMethods: asStringArray(row.auth_methods),
    defaultCapabilities: asStringArray(row.default_capabilities),
    isActive: Boolean(row.is_active),
  };
}

function nestedProvider(row: DbConnection): DbProvider | null {
  const nested = row.integration_providers;
  if (!nested) return null;
  return Array.isArray(nested) ? nested[0] ?? null : nested;
}

function mapConnection(row: DbConnection): IntegrationConnectionPublic {
  if (!isIntegrationCategory(row.category)) {
    throw new Error(`Invalid connection category: ${row.category}`);
  }
  if (!isIntegrationConnectionStatus(row.status)) {
    throw new Error(`Invalid connection status: ${row.status}`);
  }
  const provider = nestedProvider(row);
  const health = row.last_health_status;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    providerId: row.provider_id,
    providerCode: provider?.code ?? "",
    providerDisplayName: provider?.display_name ?? "",
    category: row.category,
    enabled: Boolean(row.enabled),
    status: row.status,
    manualMode: Boolean(row.manual_mode),
    authMethod: row.auth_method,
    isDefaultForCategory: Boolean(row.is_default_for_category),
    displayLabel: row.display_label,
    credentialsSet: Boolean(row.credentials_encrypted),
    config: asConfigObject(row.config),
    capabilities: asStringArray(row.capabilities),
    notes: row.notes,
    lastHealthAt: row.last_health_at,
    lastHealthStatus: health as IntegrationHealthStatus | null,
    lastError: row.last_error,
    lastTestedAt: row.last_tested_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const CONNECTION_SELECT =
  "*, integration_providers ( id, code, category, display_name, auth_methods, default_capabilities, is_active )";

export async function isIntegrationFrameworkSchemaReady(): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("integration_providers").select("id").limit(1);
  if (!error) return true;
  if (isMissingTableError(error, "integration_providers")) return false;
  throw new Error(error.message);
}

export async function listIntegrationProviders(): Promise<IntegrationProvider[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("integration_providers")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("display_name");

  if (error) throwIfSchemaMissing(error);
  return ((data as DbProvider[] | null) ?? []).map(mapProvider);
}

export async function listWorkspaceIntegrationConnections(
  workspaceId: string,
): Promise<IntegrationConnectionPublic[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("workspace_integration_connections")
    .select(CONNECTION_SELECT)
    .eq("workspace_id", workspaceId)
    .order("category")
    .order("created_at");

  if (error) throwIfSchemaMissing(error);
  return ((data as DbConnection[] | null) ?? []).map(mapConnection);
}

export async function getWorkspaceIntegrationConnectionByProviderCode(
  workspaceId: string,
  providerCode: string,
): Promise<IntegrationConnectionPublic | null> {
  const supabase = requireSupabase();
  const { data: provider, error: providerError } = await supabase
    .from("integration_providers")
    .select("*")
    .eq("code", providerCode.trim())
    .maybeSingle();

  if (providerError) throwIfSchemaMissing(providerError);
  if (!provider) return null;

  const { data, error } = await supabase
    .from("workspace_integration_connections")
    .select(CONNECTION_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("provider_id", (provider as DbProvider).id)
    .maybeSingle();

  if (error) throwIfSchemaMissing(error);
  if (!data) return null;
  return mapConnection(data as DbConnection);
}

export type UpsertIntegrationConnectionInput = {
  workspaceId: string;
  providerCode: string;
  actor: string;
  enabled?: boolean;
  status?: IntegrationConnectionStatus;
  manualMode?: boolean;
  authMethod?: string | null;
  isDefaultForCategory?: boolean;
  displayLabel?: string | null;
  config?: Record<string, unknown>;
  capabilities?: string[];
  notes?: string | null;
  /** Write-only — encrypted inside the framework; never returned. */
  credentials?: Record<string, unknown> | null;
  clearCredentials?: boolean;
};

export async function upsertWorkspaceIntegrationConnection(
  input: UpsertIntegrationConnectionInput,
): Promise<IntegrationConnectionPublic> {
  const supabase = requireSupabase();
  const providerCode = input.providerCode.trim();
  if (!providerCode) throw new Error("providerCode is required.");

  const { data: providerRow, error: providerError } = await supabase
    .from("integration_providers")
    .select("*")
    .eq("code", providerCode)
    .maybeSingle();

  if (providerError) throwIfSchemaMissing(providerError);
  if (!providerRow) throw new Error(`Unknown provider code: ${providerCode}`);

  const provider = mapProvider(providerRow as DbProvider);
  const existing = await getWorkspaceIntegrationConnectionByProviderCode(
    input.workspaceId,
    providerCode,
  );

  if (input.isDefaultForCategory === true) {
    await supabase
      .from("workspace_integration_connections")
      .update({
        is_default_for_category: false,
        updated_at: new Date().toISOString(),
        updated_by: input.actor,
      })
      .eq("workspace_id", input.workspaceId)
      .eq("category", provider.category)
      .eq("is_default_for_category", true);
  }

  let credentialsEncrypted: string | null | undefined;
  let credentialsKeyId: string | null | undefined;
  if (input.clearCredentials) {
    credentialsEncrypted = null;
    credentialsKeyId = null;
  } else if (input.credentials && Object.keys(input.credentials).length > 0) {
    const encrypted = encryptIntegrationCredentials(input.credentials);
    credentialsEncrypted = encrypted.ciphertext;
    credentialsKeyId = encrypted.keyId;
  }

  const status: IntegrationConnectionStatus =
    input.status ??
    existing?.status ??
    (input.manualMode ? "disconnected" : "disconnected");

  const payload: Record<string, unknown> = {
    workspace_id: input.workspaceId,
    provider_id: provider.id,
    category: provider.category,
    enabled: input.enabled ?? existing?.enabled ?? true,
    status: isIntegrationConnectionStatus(status) ? status : "disconnected",
    manual_mode: input.manualMode ?? existing?.manualMode ?? false,
    auth_method:
      input.authMethod !== undefined
        ? input.authMethod
        : (existing?.authMethod ?? null),
    is_default_for_category:
      input.isDefaultForCategory ?? existing?.isDefaultForCategory ?? false,
    display_label:
      input.displayLabel !== undefined
        ? input.displayLabel
        : (existing?.displayLabel ?? null),
    config: input.config ?? existing?.config ?? {},
    capabilities: input.capabilities ?? existing?.capabilities ?? [
      ...provider.defaultCapabilities,
    ],
    notes: input.notes !== undefined ? input.notes : (existing?.notes ?? null),
    updated_by: input.actor,
    updated_at: new Date().toISOString(),
  };

  if (credentialsEncrypted !== undefined) {
    payload.credentials_encrypted = credentialsEncrypted;
    payload.credentials_key_id = credentialsKeyId;
    if (credentialsEncrypted && payload.status === "disconnected" && !input.status) {
      payload.status = "connected";
    }
  }

  if (!existing) {
    payload.created_by = input.actor;
    const { data, error } = await supabase
      .from("workspace_integration_connections")
      .insert(payload)
      .select(CONNECTION_SELECT)
      .single();
    if (error) throwIfSchemaMissing(error);
    return mapConnection(data as DbConnection);
  }

  const { data, error } = await supabase
    .from("workspace_integration_connections")
    .update(payload)
    .eq("id", existing.id)
    .select(CONNECTION_SELECT)
    .single();

  if (error) throwIfSchemaMissing(error);
  return mapConnection(data as DbConnection);
}

export async function deleteWorkspaceIntegrationConnection(
  workspaceId: string,
  providerCode: string,
  actor: string,
): Promise<void> {
  const existing = await getWorkspaceIntegrationConnectionByProviderCode(
    workspaceId,
    providerCode,
  );
  if (!existing) return;

  const supabase = requireSupabase();
  const { error } = await supabase
    .from("workspace_integration_connections")
    .update({
      enabled: false,
      status: "disconnected",
      credentials_encrypted: null,
      credentials_key_id: null,
      is_default_for_category: false,
      updated_by: actor,
      updated_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", existing.id);

  if (error) throwIfSchemaMissing(error);
}

export async function stubTestWorkspaceIntegrationConnection(
  workspaceId: string,
  providerCode: string,
  actor: string,
): Promise<{
  ok: false;
  status: "not_implemented" | "manual";
  connection: IntegrationConnectionPublic | null;
}> {
  const existing = await getWorkspaceIntegrationConnectionByProviderCode(
    workspaceId,
    providerCode,
  );

  const supabase = requireSupabase();
  if (existing) {
    await supabase
      .from("workspace_integration_connections")
      .update({
        last_tested_at: new Date().toISOString(),
        last_health_status: "unknown",
        last_error: existing.manualMode
          ? "Manual mode — vendor test not applicable."
          : "Provider adapter not implemented (Phase 0).",
        updated_by: actor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  }

  const refreshed = await getWorkspaceIntegrationConnectionByProviderCode(
    workspaceId,
    providerCode,
  );

  if (refreshed?.manualMode) {
    return { ok: false, status: "manual", connection: refreshed };
  }
  return { ok: false, status: "not_implemented", connection: refreshed };
}

/**
 * Category resolution for business modules — never returns secrets.
 */
export async function resolveConnection(
  workspaceId: string,
  category: IntegrationCategory,
): Promise<ResolvedIntegrationConnection | null> {
  if (!isIntegrationCategory(category)) {
    throw new Error(`Invalid integration category: ${String(category)}`);
  }

  const connections = await listWorkspaceIntegrationConnections(workspaceId);
  const inCategory = connections.filter((row) => row.category === category);
  if (inCategory.length === 0) return null;

  const preferred =
    inCategory.find((row) => row.isDefaultForCategory && row.enabled) ??
    inCategory.find((row) => row.enabled) ??
    inCategory[0];

  if (!preferred) return null;

  return {
    connectionId: preferred.id,
    enabled: preferred.enabled,
    status: preferred.status,
    manualMode: preferred.manualMode,
    capabilities: preferred.capabilities,
    providerDisplayName: preferred.providerDisplayName,
    providerCode: preferred.providerCode,
    category: preferred.category,
    config: preferred.config,
  };
}

/**
 * Framework-internal only. Decrypts credentials for future adapters.
 * Must never be called from business modules or exposed on HTTP GET.
 */
export async function getConnectionCredentials(
  connectionId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("workspace_integration_connections")
    .select("credentials_encrypted, credentials_key_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (error) throwIfSchemaMissing(error);
  if (!data?.credentials_encrypted) return null;

  return decryptIntegrationCredentials(
    String(data.credentials_encrypted),
    data.credentials_key_id ? String(data.credentials_key_id) : null,
  );
}

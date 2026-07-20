export const INTEGRATION_CATEGORIES = [
  "banking",
  "email",
  "calendar",
  "messaging",
  "payments",
  "shipping",
  "storage",
  "ai",
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const INTEGRATION_CONNECTION_STATUSES = [
  "disconnected",
  "connected",
  "error",
] as const;

export type IntegrationConnectionStatus =
  (typeof INTEGRATION_CONNECTION_STATUSES)[number];

export const INTEGRATION_HEALTH_STATUSES = [
  "healthy",
  "degraded",
  "failed",
  "unknown",
] as const;

export type IntegrationHealthStatus =
  (typeof INTEGRATION_HEALTH_STATUSES)[number];

export type IntegrationProvider = {
  readonly id: string;
  readonly code: string;
  readonly category: IntegrationCategory;
  readonly displayName: string;
  readonly authMethods: readonly string[];
  readonly defaultCapabilities: readonly string[];
  readonly isActive: boolean;
};

/** Public connection shape — never includes secrets or ciphertext. */
export type IntegrationConnectionPublic = {
  readonly id: string;
  readonly workspaceId: string;
  readonly providerId: string;
  readonly providerCode: string;
  readonly providerDisplayName: string;
  readonly category: IntegrationCategory;
  readonly enabled: boolean;
  readonly status: IntegrationConnectionStatus;
  readonly manualMode: boolean;
  readonly authMethod: string | null;
  readonly isDefaultForCategory: boolean;
  readonly displayLabel: string | null;
  readonly credentialsSet: boolean;
  readonly config: Record<string, unknown>;
  readonly capabilities: readonly string[];
  readonly notes: string | null;
  readonly lastHealthAt: string | null;
  readonly lastHealthStatus: IntegrationHealthStatus | null;
  readonly lastError: string | null;
  readonly lastTestedAt: string | null;
  readonly createdBy: string | null;
  readonly updatedBy: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Category resolution result for business modules — never secrets. */
export type ResolvedIntegrationConnection = {
  readonly connectionId: string;
  readonly enabled: boolean;
  readonly status: IntegrationConnectionStatus;
  readonly manualMode: boolean;
  readonly capabilities: readonly string[];
  readonly providerDisplayName: string;
  /** Metadata only — modules must not treat this as a vendor SDK dependency. */
  readonly providerCode: string;
  readonly category: IntegrationCategory;
  readonly config: Record<string, unknown>;
};

export function isIntegrationCategory(value: unknown): value is IntegrationCategory {
  return (
    typeof value === "string" &&
    (INTEGRATION_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isIntegrationConnectionStatus(
  value: unknown,
): value is IntegrationConnectionStatus {
  return (
    typeof value === "string" &&
    (INTEGRATION_CONNECTION_STATUSES as readonly string[]).includes(value)
  );
}

export const INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED =
  "Integration Framework schema is missing. Apply Supabase migration 093_integration_framework_phase0.sql.";

export const INTEGRATION_FRAMEWORK_MIGRATION_FILE =
  "093_integration_framework_phase0.sql";

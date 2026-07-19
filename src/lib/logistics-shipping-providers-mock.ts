/**
 * Mock workspace Shipping Provider connection state for MOD-092.
 * No live APIs — UI development only.
 */

import {
  SHIPPING_PROVIDER_REGISTRY,
  type ShippingProviderRegistryEntry,
} from "@/lib/shipping-provider-registry";

export type ProviderConnectionStatus =
  | "available"
  | "not_connected"
  | "setup_in_progress"
  | "connected"
  | "disconnected";

export type BusinessAccountStatus = "not_started" | "in_progress" | "complete" | "n_a";
export type ApiCredentialStatus = "not_started" | "in_progress" | "complete" | "n_a";
export type ConnectionHealthStatus = "healthy" | "degraded" | "failed" | "unknown" | "n_a";

export type ProviderCapability =
  | "Shipment Creation"
  | "Labels"
  | "Tracking"
  | "Collections"
  | "Returns"
  | "Proof of Delivery"
  | "Manual Tracking"
  | "Status Updates";

export type SetupProgressFlags = {
  businessAccount: boolean;
  apiCredentials: boolean;
  connected: boolean;
};

export type WorkspaceShippingProviderState = {
  providerCode: string;
  connectionStatus: ProviderConnectionStatus;
  businessAccountStatus: BusinessAccountStatus;
  apiStatus: ApiCredentialStatus;
  health: ConnectionHealthStatus;
  capabilities: readonly ProviderCapability[];
  setupProgress: SetupProgressFlags;
  isManualSystemProvider?: boolean;
  lastTestAt?: string | null;
};

const DEFAULT_CAPABILITIES: readonly ProviderCapability[] = [
  "Shipment Creation",
  "Labels",
  "Tracking",
  "Collections",
  "Returns",
  "Proof of Delivery",
];

const UNIT311_MANUAL: WorkspaceShippingProviderState = {
  providerCode: "unit311_manual",
  connectionStatus: "available",
  businessAccountStatus: "n_a",
  apiStatus: "n_a",
  health: "n_a",
  capabilities: ["Shipment Creation", "Manual Tracking", "Status Updates", "Proof of Delivery", "Returns"],
  setupProgress: {
    businessAccount: true,
    apiCredentials: true,
    connected: true,
  },
  isManualSystemProvider: true,
  lastTestAt: null,
};

/** Seed mock states for a few registry providers; others default to not_connected. */
const MOCK_OVERRIDES: Record<string, Partial<WorkspaceShippingProviderState>> = {
  royal_mail: {
    connectionStatus: "connected",
    businessAccountStatus: "complete",
    apiStatus: "complete",
    health: "healthy",
    setupProgress: { businessAccount: true, apiCredentials: true, connected: true },
    lastTestAt: "2026-07-18T14:22:00.000Z",
  },
  fedex: {
    connectionStatus: "setup_in_progress",
    businessAccountStatus: "complete",
    apiStatus: "in_progress",
    health: "unknown",
    setupProgress: { businessAccount: true, apiCredentials: false, connected: false },
    lastTestAt: null,
  },
  ups: {
    connectionStatus: "disconnected",
    businessAccountStatus: "complete",
    apiStatus: "complete",
    health: "failed",
    setupProgress: { businessAccount: true, apiCredentials: true, connected: false },
    lastTestAt: "2026-07-10T09:00:00.000Z",
  },
  dhl: {
    connectionStatus: "connected",
    businessAccountStatus: "complete",
    apiStatus: "complete",
    health: "degraded",
    setupProgress: { businessAccount: true, apiCredentials: true, connected: true },
    lastTestAt: "2026-07-19T08:15:00.000Z",
  },
};

export type LogisticsProviderRow = WorkspaceShippingProviderState & {
  registry: ShippingProviderRegistryEntry | { code: string; name: string };
};

function defaultStateForRegistry(
  entry: ShippingProviderRegistryEntry,
): WorkspaceShippingProviderState {
  const override = MOCK_OVERRIDES[entry.code];
  return {
    providerCode: entry.code,
    connectionStatus: "not_connected",
    businessAccountStatus: "not_started",
    apiStatus: "not_started",
    health: "n_a",
    capabilities: DEFAULT_CAPABILITIES,
    setupProgress: { businessAccount: false, apiCredentials: false, connected: false },
    lastTestAt: null,
    ...override,
    providerCode: entry.code,
  };
}

export function buildInitialLogisticsProviderRows(): LogisticsProviderRow[] {
  const manualRow: LogisticsProviderRow = {
    ...UNIT311_MANUAL,
    registry: { code: "unit311_manual", name: "Unit311 Logistics" },
  };

  const registryRows: LogisticsProviderRow[] = SHIPPING_PROVIDER_REGISTRY.map((entry) => ({
    ...defaultStateForRegistry(entry),
    registry: entry,
  }));

  return [manualRow, ...registryRows];
}

export function connectionStatusLabel(status: ProviderConnectionStatus): string {
  switch (status) {
    case "available":
      return "Available";
    case "not_connected":
      return "Not connected";
    case "setup_in_progress":
      return "Setup in progress";
    case "connected":
      return "Connected";
    case "disconnected":
      return "Disconnected";
  }
}

export function businessAccountLabel(status: BusinessAccountStatus): string {
  switch (status) {
    case "n_a":
      return "Not required";
    case "not_started":
      return "Not started";
    case "in_progress":
      return "In progress";
    case "complete":
      return "Complete";
  }
}

export function apiStatusLabel(status: ApiCredentialStatus): string {
  switch (status) {
    case "n_a":
      return "Not required";
    case "not_started":
      return "Not started";
    case "in_progress":
      return "In progress";
    case "complete":
      return "Configured";
  }
}

export function healthLabel(status: ConnectionHealthStatus): string {
  switch (status) {
    case "n_a":
      return "N/A";
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "failed":
      return "Failed";
    case "unknown":
      return "Unknown";
  }
}

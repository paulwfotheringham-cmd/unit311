export type PlatformBillingFrequency = "monthly" | "quarterly" | "annual";

export type PlatformSubscriptionStatus =
  | "inactive"
  | "pending_payment"
  | "active"
  | "suspended"
  | "cancelled";

export type PlatformCustomerSubscription = {
  id: string;
  clientId: string | null;
  workspaceId: string | null;
  companyName: string;
  planName: string;
  billingFrequency: PlatformBillingFrequency;
  subscriptionStatus: PlatformSubscriptionStatus;
  outstandingBalanceUsd: number;
  nextInvoiceDate: string | null;
  mrrUsd: number;
  arrUsd: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function formatBillingFrequency(frequency: PlatformBillingFrequency) {
  switch (frequency) {
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "annual":
      return "Annual";
  }
}

export function formatSubscriptionStatus(status: PlatformSubscriptionStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "pending_payment":
      return "Pending payment";
    case "suspended":
      return "Suspended";
    case "cancelled":
      return "Cancelled";
    case "inactive":
      return "Inactive";
  }
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** Used when the platform billing table has not been applied yet. */
export const PLATFORM_BILLING_SEED_FALLBACK: PlatformCustomerSubscription[] = [
  {
    id: "seed-fotheringham",
    clientId: null,
    workspaceId: null,
    companyName: "Fotheringham",
    planName: "Professional",
    billingFrequency: "quarterly",
    subscriptionStatus: "active",
    outstandingBalanceUsd: 0,
    nextInvoiceDate: "2026-10-01",
    mrrUsd: 999,
    arrUsd: 11988,
    currency: "USD",
    notes: "Seed record — apply migration 084 to persist in Supabase.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function summarizePlatformBilling(subscriptions: PlatformCustomerSubscription[]) {
  return subscriptions.reduce(
    (acc, row) => {
      acc.mrrUsd += row.mrrUsd;
      acc.arrUsd += row.arrUsd;
      acc.outstandingBalanceUsd += row.outstandingBalanceUsd;
      if (row.subscriptionStatus === "active") acc.active += 1;
      return acc;
    },
    {
      customers: subscriptions.length,
      active: 0,
      mrrUsd: 0,
      arrUsd: 0,
      outstandingBalanceUsd: 0,
    },
  );
}

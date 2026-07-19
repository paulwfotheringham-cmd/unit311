import {
  ensurePlatformCustomerSubscriptionsTable,
  withPlatformCustomerSubscriptionsTable,
} from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  PlatformBillingFrequency,
  PlatformCustomerSubscription,
  PlatformSubscriptionStatus,
} from "@/lib/platform-billing-data";

export type {
  PlatformBillingFrequency,
  PlatformCustomerSubscription,
  PlatformSubscriptionStatus,
} from "@/lib/platform-billing-data";

export {
  formatBillingFrequency,
  formatSubscriptionStatus,
  formatUsd,
} from "@/lib/platform-billing-data";

type PlatformCustomerSubscriptionRow = {
  id: string;
  client_id: string | null;
  workspace_id: string | null;
  company_name: string;
  plan_name: string;
  billing_frequency: string;
  subscription_status: string;
  outstanding_balance_usd: number | string | null;
  next_invoice_date: string | null;
  mrr_usd: number | string | null;
  arr_usd: number | string | null;
  currency: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
}

function mapRow(row: PlatformCustomerSubscriptionRow): PlatformCustomerSubscription {
  return {
    id: row.id,
    clientId: row.client_id,
    workspaceId: row.workspace_id,
    companyName: row.company_name,
    planName: row.plan_name,
    billingFrequency: row.billing_frequency as PlatformBillingFrequency,
    subscriptionStatus: row.subscription_status as PlatformSubscriptionStatus,
    outstandingBalanceUsd: toNumber(row.outstanding_balance_usd),
    nextInvoiceDate: row.next_invoice_date,
    mrrUsd: toNumber(row.mrr_usd),
    arrUsd: toNumber(row.arr_usd),
    currency: row.currency ?? "USD",
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPlatformCustomerSubscriptions(): Promise<
  PlatformCustomerSubscription[]
> {
  await ensurePlatformCustomerSubscriptionsTable();
  return withPlatformCustomerSubscriptionsTable(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("platform_customer_subscriptions")
      .select("*")
      .order("company_name", { ascending: true });

    if (error) throw new Error(error.message);
    return ((data ?? []) as PlatformCustomerSubscriptionRow[]).map(mapRow);
  });
}

export async function getPlatformCustomerSubscription(
  id: string,
): Promise<PlatformCustomerSubscription | null> {
  await ensurePlatformCustomerSubscriptionsTable();
  return withPlatformCustomerSubscriptionsTable(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("platform_customer_subscriptions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapRow(data as PlatformCustomerSubscriptionRow) : null;
  });
}

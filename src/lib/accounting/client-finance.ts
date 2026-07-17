import { listInvoices } from "@/lib/accounting/invoices-service";
import type { LedgerInvoice } from "@/lib/accounting/types";
import {
  resolveFinancialsWorkspaceId,
  type FinancialsWorkspaceScope,
} from "@/lib/financials-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ClientFinanceSummary = {
  clientId: string;
  subscriptionStatus: string | null;
  billingFrequency: string | null;
  renewalDate: string | null;
  paymentMethod: string | null;
  outstandingBalance: number;
  invoices: LedgerInvoice[];
  payments: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    paidAt: string;
    method: string | null;
    wiseMatched: boolean;
  }>;
};

export async function getClientFinanceSummary(
  clientId: string,
  scope?: FinancialsWorkspaceScope,
): Promise<ClientFinanceSummary | null> {
  if (!isSupabaseConfigured()) return null;

  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  const supabase = createSupabaseServerClient();
  const { data: client, error } = await supabase
    .from("internal_clients")
    .select(
      "id, subscription_status, billing_frequency, renewal_date, payment_method",
    )
    .eq("id", clientId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!client) return null;

  const invoices = (await listInvoices({ workspaceId })).filter(
    (invoice) => invoice.clientId === clientId,
  );
  const outstanding = invoices
    .filter((invoice) => invoice.status === "issued" || invoice.status === "overdue")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const payments = invoices
    .filter((invoice) => invoice.status === "paid")
    .map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      currency: invoice.currency,
      paidAt: invoice.paidAt ?? invoice.updatedAt,
      method: invoice.paymentMethod,
      wiseMatched: invoice.wiseMatched,
    }))
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  return {
    clientId,
    subscriptionStatus: client.subscription_status
      ? String(client.subscription_status)
      : null,
    billingFrequency: client.billing_frequency ? String(client.billing_frequency) : null,
    renewalDate: client.renewal_date ? String(client.renewal_date) : null,
    paymentMethod: client.payment_method ? String(client.payment_method) : null,
    outstandingBalance: Math.round(outstanding * 100) / 100,
    invoices,
    payments,
  };
}

import {
  postInvoiceIssueJournal,
} from "@/lib/accounting/posting-rules";
import { activateCustomerFromPayment } from "@/lib/accounting/customer-activation-service";
import type { InvoiceStatus, LedgerInvoice } from "@/lib/accounting/types";
import {
  resolveFinancialsWorkspaceId,
  type FinancialsWorkspaceScope,
} from "@/lib/financials-workspace";
import { PAYMENT_AMOUNT_NUMERIC } from "@/lib/payment-data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { generateInvoiceNumber } from "@/lib/subscription-invoice-pdf";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function mapInvoice(
  row: Record<string, unknown>,
  clientName?: string,
  extras?: {
    paymentMethod?: string | null;
    wiseMatched?: boolean;
    wiseMatchedAt?: string | null;
    wiseTransactionId?: string | null;
    paidAt?: string | null;
  },
): LedgerInvoice {
  return {
    id: String(row.id),
    invoiceNumber: String(row.invoice_number),
    clientId: String(row.client_id),
    clientName,
    organisationId: row.organisation_id ? String(row.organisation_id) : null,
    workspaceId: row.workspace_id ? String(row.workspace_id) : null,
    issueDate: String(row.issue_date),
    dueDate: String(row.due_date),
    currency: String(row.currency ?? "USD"),
    amount: Number(row.amount) || 0,
    status: row.status as InvoiceStatus,
    paymentReference: String(row.payment_reference),
    pdfPath: row.pdf_path ? String(row.pdf_path) : null,
    journalEntryId: row.journal_entry_id ? String(row.journal_entry_id) : null,
    paymentJournalEntryId: row.payment_journal_entry_id
      ? String(row.payment_journal_entry_id)
      : null,
    paymentMethod: extras?.paymentMethod ?? null,
    wiseMatched: Boolean(extras?.wiseMatched),
    wiseMatchedAt: extras?.wiseMatchedAt ?? null,
    wiseTransactionId: extras?.wiseTransactionId ?? null,
    paidAt: extras?.paidAt ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function listInvoices(scope?: FinancialsWorkspaceScope): Promise<LedgerInvoice[]> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("issue_date", { ascending: false });
  if (error) throw new Error(error.message);

  const clientIds = [...new Set((data ?? []).map((row) => String(row.client_id)))];
  const invoiceIds = (data ?? []).map((row) => String(row.id));
  const names = new Map<string, string>();
  const paymentMethods = new Map<string, string | null>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("internal_clients")
      .select("id, company_name, payment_method")
      .eq("workspace_id", workspaceId)
      .in("id", clientIds);
    for (const client of clients ?? []) {
      names.set(String(client.id), String(client.company_name));
      paymentMethods.set(
        String(client.id),
        client.payment_method ? String(client.payment_method) : null,
      );
    }
  }

  const matches = new Map<
    string,
    { matchedAt: string; wiseTransactionId: string | null }
  >();
  if (invoiceIds.length > 0) {
    const { data: wiseMatches } = await supabase
      .from("wise_payment_matches")
      .select("invoice_id, matched_at, wise_transaction_id")
      .eq("workspace_id", workspaceId)
      .in("invoice_id", invoiceIds);
    for (const match of wiseMatches ?? []) {
      matches.set(String(match.invoice_id), {
        matchedAt: String(match.matched_at),
        wiseTransactionId: match.wise_transaction_id
          ? String(match.wise_transaction_id)
          : null,
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return (data ?? []).map((row) => {
    const match = matches.get(String(row.id));
    const invoice = mapInvoice(row as Record<string, unknown>, names.get(String(row.client_id)), {
      paymentMethod:
        match || row.payment_journal_entry_id
          ? paymentMethods.get(String(row.client_id)) ?? "wise"
          : paymentMethods.get(String(row.client_id)) ?? null,
      wiseMatched: Boolean(match),
      wiseMatchedAt: match?.matchedAt ?? null,
      wiseTransactionId: match?.wiseTransactionId ?? null,
      paidAt:
        match?.matchedAt ??
        (row.status === "paid" ? String(row.updated_at ?? row.created_at) : null),
    });
    if ((invoice.status === "issued" || invoice.status === "overdue") && invoice.dueDate < today) {
      return { ...invoice, status: "overdue" as const };
    }
    return invoice;
  });
}

export async function getInvoiceById(id: string, scope?: FinancialsWorkspaceScope) {
  const invoices = await listInvoices(scope);
  return invoices.find((invoice) => invoice.id === id) ?? null;
}

export async function getInvoiceByPaymentReference(
  reference: string,
  scope?: FinancialsWorkspaceScope,
) {
  const supabase = requireSupabase();
  let query = supabase
    .from("invoices")
    .select("*")
    .eq("payment_reference", reference);
  if (scope) {
    const workspaceId = await resolveFinancialsWorkspaceId(scope);
    query = query.eq("workspace_id", workspaceId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapInvoice(data as Record<string, unknown>);
}

export async function ensureClientSubscriptionInvoice(input: {
  clientId: string;
  organisationId?: string | null;
  workspaceId?: string | null;
  companyName: string;
  amount?: number;
  currency?: string;
  pdfPath?: string | null;
  existingInvoiceNumber?: string | null;
  /** When true, due date equals issue date (Due Immediately). */
  dueImmediately?: boolean;
}): Promise<LedgerInvoice> {
  const supabase = requireSupabase();

  async function attachWorkspaceIfNeeded(row: Record<string, unknown>) {
    if (!input.workspaceId) {
      return mapInvoice(row, input.companyName);
    }
    if (String(row.workspace_id ?? "") === input.workspaceId) {
      return mapInvoice(row, input.companyName);
    }
    try {
      const { data: updated } = await supabase
        .from("invoices")
        .update({
          workspace_id: input.workspaceId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(row.id))
        .select("*")
        .single();
      if (updated) {
        return mapInvoice(updated as Record<string, unknown>, input.companyName);
      }
    } catch {
      // workspace_id column may be unavailable until migration 076.
    }
    return mapInvoice(row, input.companyName);
  }

  if (input.organisationId) {
    let existingQuery = supabase
      .from("invoices")
      .select("*")
      .eq("organisation_id", input.organisationId)
      .in("status", ["draft", "issued", "overdue", "paid"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (input.workspaceId) {
      existingQuery = existingQuery.eq("workspace_id", input.workspaceId);
    }
    const { data: existing } = await existingQuery.maybeSingle();
    if (existing) {
      return attachWorkspaceIfNeeded(existing as Record<string, unknown>);
    }
  }

  {
    let existingByClientQuery = supabase
      .from("invoices")
      .select("*")
      .eq("client_id", input.clientId)
      .in("status", ["draft", "issued", "overdue"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (input.workspaceId) {
      existingByClientQuery = existingByClientQuery.eq("workspace_id", input.workspaceId);
    }
    const { data: existingByClient } = await existingByClientQuery.maybeSingle();
    if (existingByClient) {
      return attachWorkspaceIfNeeded(existingByClient as Record<string, unknown>);
    }
  }

  const invoiceNumber = input.existingInvoiceNumber?.replace(/\D/g, "").slice(0, 6)
    || generateInvoiceNumber();
  const paymentReference = `INV-${invoiceNumber}`;
  const issueDate = new Date().toISOString().slice(0, 10);
  const dueDate = input.dueImmediately ? issueDate : addDays(issueDate, 14);
  const amount = input.amount ?? PAYMENT_AMOUNT_NUMERIC;
  const currency = input.currency ?? "USD";

  const insertRow: Record<string, string | number | null> = {
    invoice_number: invoiceNumber,
    client_id: input.clientId,
    organisation_id: input.organisationId ?? null,
    issue_date: issueDate,
    due_date: dueDate,
    currency,
    amount,
    status: "issued",
    payment_reference: paymentReference,
    pdf_path: input.pdfPath ?? null,
  };
  if (input.workspaceId) {
    insertRow.workspace_id = input.workspaceId;
  }

  let data: Record<string, unknown> | null = null;
  {
    const first = await supabase.from("invoices").insert(insertRow).select("*").single();
    if (!first.error && first.data) {
      data = first.data as Record<string, unknown>;
    } else if (
      first.error &&
      input.workspaceId &&
      (first.error.message.includes("workspace_id") || first.error.message.includes("does not exist"))
    ) {
      const { workspace_id: _ignored, ...withoutWorkspace } = insertRow;
      const second = await supabase.from("invoices").insert(withoutWorkspace).select("*").single();
      if (second.error) throw new Error(second.error.message);
      data = second.data as Record<string, unknown>;
    } else if (first.error) {
      throw new Error(first.error.message);
    }
  }

  if (!data) {
    throw new Error("Failed to create subscription invoice.");
  }

  const journal = await postInvoiceIssueJournal({
    invoiceId: String(data.id),
    invoiceNumber,
    clientId: input.clientId,
    amount,
    currency,
    journalDate: issueDate,
    workspaceId: input.workspaceId ?? null,
  });

  const { data: updated, error: updateError } = await supabase
    .from("invoices")
    .update({
      journal_entry_id: journal.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", String(data.id))
    .select("*")
    .single();
  if (updateError) throw new Error(updateError.message);

  await supabase
    .from("internal_clients")
    .update({
      subscription_status: "pending_payment",
      payment_method: "wise",
      onboarding_stage: "invoice_generated",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.clientId);

  return mapInvoice(updated as Record<string, unknown>, input.companyName);
}

export async function markInvoicePaidFromWise(input: {
  invoiceId: string;
  wiseTransactionId: string;
  amount?: number;
  currency?: string;
  performedBy?: string | null;
}) {
  const result = await activateCustomerFromPayment({
    invoiceId: input.invoiceId,
    paymentReferenceId: input.wiseTransactionId,
    amount: input.amount,
    currency: input.currency,
    source: "wise",
    performedBy: input.performedBy ?? null,
  });
  return result.invoice;
}

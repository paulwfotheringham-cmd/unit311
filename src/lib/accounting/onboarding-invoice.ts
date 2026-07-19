import { ensureClientSubscriptionInvoice } from "@/lib/accounting/invoices-service";
import type { LedgerInvoice } from "@/lib/accounting/types";
import type { ManagedClient } from "@/lib/client-management-data";
import { saveInvoicePdfToClientFolder } from "@/lib/client-invoice-storage";
import {
  buildInvoiceFileName,
  buildSubscriptionInvoicePdf,
} from "@/lib/subscription-invoice-pdf";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

/** Customer-facing invoice recipient: Accounts Payable email, else primary email. */
export function resolveInvoiceRecipientEmail(client: ManagedClient): string {
  const accountsPayable = (
    client.accountsPayableEmail ??
    client.invoiceEmail ??
    ""
  )
    .trim()
    .toLowerCase();
  if (accountsPayable) return accountsPayable;
  return client.email.trim().toLowerCase();
}

function resolveBillToAddress(client: ManagedClient): string {
  const billing = client.billingAddress?.trim();
  if (billing) return billing;

  const company = [
    client.companyAddress?.trim(),
    [client.companyCity?.trim(), client.companyPostcode?.trim()].filter(Boolean).join(" "),
    client.companyCountry?.trim(),
  ]
    .filter(Boolean)
    .join("\n");
  return company;
}

async function markOrganisationInvoicePath(organisationId: string | null | undefined, storagePath: string) {
  if (!organisationId || organisationId.startsWith("virtual-")) return;

  const supabase = requireSupabase();
  try {
    await supabase
      .from("platform_organisations")
      .update({
        invoice_file_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organisationId);
  } catch {
    // Optional organisation link.
  }
}

/**
 * After Client + Workspace exist: issue the first unpaid subscription invoice
 * in the General Ledger (Dr AR / Cr Deferred Revenue). Does not activate,
 * send welcome email, or run Wise matching.
 */
export async function issueFirstCustomerSubscriptionInvoice(input: {
  client: ManagedClient;
  workspaceId: string;
  organisationId?: string | null;
}): Promise<LedgerInvoice> {
  const { client, workspaceId } = input;
  const organisationId =
    input.organisationId ?? client.platformOrganisationId ?? null;
  const companyName = client.companyName.trim() || "Unit311 Central customer";
  const recipientEmail = resolveInvoiceRecipientEmail(client);
  const contactName =
    client.primaryContact.trim() ||
    [client.primaryContactFirstName, client.primaryContactSurname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    recipientEmail;

  const ledgerInvoice = await ensureClientSubscriptionInvoice({
    clientId: client.id,
    organisationId,
    workspaceId,
    companyName,
    dueImmediately: true,
  });

  if (ledgerInvoice.pdfPath) {
    return ledgerInvoice;
  }

  const fileName = buildInvoiceFileName(companyName, ledgerInvoice.invoiceNumber);
  const issuedAt = new Date(`${ledgerInvoice.issueDate}T12:00:00.000Z`);
  const dueAt = new Date(`${ledgerInvoice.dueDate}T12:00:00.000Z`);

  try {
    const pdfBytes = await buildSubscriptionInvoicePdf({
      companyName,
      contactName,
      contactEmail: recipientEmail,
      billingAddress: resolveBillToAddress(client),
      invoiceNumber: ledgerInvoice.invoiceNumber,
      paymentReference: ledgerInvoice.paymentReference,
      issuedAt,
      dueDate: dueAt,
      amount: ledgerInvoice.amount,
    });

    const saved = await saveInvoicePdfToClientFolder({
      companyName,
      fileName,
      pdfBytes,
    });

    const supabase = requireSupabase();
    await supabase
      .from("invoices")
      .update({
        pdf_path: saved.storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ledgerInvoice.id);

    await markOrganisationInvoicePath(organisationId, saved.storagePath);

    return {
      ...ledgerInvoice,
      pdfPath: saved.storagePath,
    };
  } catch (error) {
    console.error("Onboarding invoice PDF storage failed:", error);
    // Ledger invoice + GL entries already exist; payment page can still proceed.
    return ledgerInvoice;
  }
}

import { postInvoicePaymentJournal } from "@/lib/accounting/posting-rules";
import type { LedgerInvoice } from "@/lib/accounting/types";
import {
  notifyInternalPaymentMatched,
} from "@/lib/accounting/payment-activation";
import {
  UNIT311_SITE_HOST,
  centralLoginUrl,
} from "@/lib/app-domains";
import { sendMailboxEmail } from "@/lib/email/smtp";
import { buildCustomerWelcomeEmail } from "@/lib/payment-emails";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type PaymentActivationSource = "wise" | "manual_test";

export type ActivateCustomerFromPaymentInput = {
  invoiceId: string;
  /** Wise transaction id, or a synthetic id for manual/test activation. */
  paymentReferenceId: string;
  amount?: number;
  currency?: string;
  source: PaymentActivationSource;
  performedBy?: string | null;
  /**
   * When false (manual testing only), activates client/workspace and sends welcome
   * email but leaves the invoice unpaid and skips GL cash journals.
   * Production Wise matching always settles the invoice (default true).
   */
  settleInvoice?: boolean;
};

export type ActivateCustomerFromPaymentResult = {
  invoice: LedgerInvoice;
  clientId: string;
  workspaceId: string | null;
  workspaceSlug: string | null;
  workspaceUrl: string | null;
  loginEmail: string | null;
  welcomeEmailSent: boolean;
  crmLeadId: string | null;
  alreadyPaid: boolean;
  invoiceSettled: boolean;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function mapInvoiceRow(row: Record<string, unknown>, clientName?: string): LedgerInvoice {
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
    status: row.status as LedgerInvoice["status"],
    paymentReference: String(row.payment_reference),
    pdfPath: row.pdf_path ? String(row.pdf_path) : null,
    journalEntryId: row.journal_entry_id ? String(row.journal_entry_id) : null,
    paymentJournalEntryId: row.payment_journal_entry_id
      ? String(row.payment_journal_entry_id)
      : null,
    paymentMethod: null,
    wiseMatched: false,
    wiseMatchedAt: null,
    wiseTransactionId: null,
    paidAt: null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function customerWorkspaceUrl(slug: string) {
  return `https://${slug.trim().toLowerCase()}.${UNIT311_SITE_HOST}`;
}

async function resolveWorkspaceForClient(input: {
  clientWorkspaceId: string | null;
  invoiceWorkspaceId: string | null;
  organisationId: string | null;
  preferredSlug?: string | null;
  companyName?: string | null;
}) {
  const supabase = requireSupabase();
  const preferredSlug =
    input.preferredSlug?.trim().toLowerCase() ||
    (input.companyName?.toLowerCase().includes("fotheringham") ? "fotheringham" : null);

  if (preferredSlug) {
    const { data } = await supabase
      .from("workspaces")
      .select("id, slug, status, name")
      .eq("slug", preferredSlug)
      .maybeSingle();
    if (data?.id && String(data.slug ?? "") !== "unit311") {
      return {
        id: String(data.id),
        slug: String(data.slug ?? ""),
        status: String(data.status ?? ""),
        name: String(data.name ?? ""),
      };
    }
  }

  const candidateIds = [
    input.clientWorkspaceId,
    input.invoiceWorkspaceId,
  ].filter((value): value is string => Boolean(value?.trim()));

  for (const id of candidateIds) {
    const { data } = await supabase
      .from("workspaces")
      .select("id, slug, status, name")
      .eq("id", id)
      .maybeSingle();
    if (data?.id && String(data.slug ?? "") !== "unit311") {
      return {
        id: String(data.id),
        slug: String(data.slug ?? ""),
        status: String(data.status ?? ""),
        name: String(data.name ?? ""),
      };
    }
  }

  if (input.organisationId) {
    const { data: org } = await supabase
      .from("platform_organisations")
      .select("workspace_id")
      .eq("id", input.organisationId)
      .maybeSingle();
    const orgWorkspaceId = org?.workspace_id ? String(org.workspace_id) : null;
    if (orgWorkspaceId) {
      const { data } = await supabase
        .from("workspaces")
        .select("id, slug, status, name")
        .eq("id", orgWorkspaceId)
        .maybeSingle();
      if (data?.id && String(data.slug ?? "") !== "unit311") {
        return {
          id: String(data.id),
          slug: String(data.slug ?? ""),
          status: String(data.status ?? ""),
          name: String(data.name ?? ""),
        };
      }
    }
  }

  return null;
}

async function resolveLoginEmail(input: {
  clientEmail: string;
  organisationId: string | null;
  workspaceId: string | null;
}) {
  const supabase = requireSupabase();
  if (input.workspaceId) {
    const { data } = await supabase
      .from("platform_users")
      .select("email, username")
      .eq("workspace_id", input.workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const email = (data?.email || data?.username || "").trim().toLowerCase();
    if (email.includes("@")) return email;
  }

  if (input.organisationId) {
    const { data } = await supabase
      .from("platform_users")
      .select("email, username")
      .eq("organisation_id", input.organisationId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const email = (data?.email || data?.username || "").trim().toLowerCase();
    if (email.includes("@")) return email;
  }

  return input.clientEmail.trim().toLowerCase() || null;
}

async function activateWorkspace(workspaceId: string) {
  const supabase = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("workspaces")
    .update({
      status: "Active",
      updated_at: now,
    })
    .eq("id", workspaceId);
  if (error) throw new Error(error.message);
}

/**
 * Unlock login for an activated client.
 * Always writes subscription_status=active + account_status=Active.
 * Does not depend on invoice paid status (Test Activation leaves invoice unpaid).
 */
async function markClientActivatedForLogin(input: {
  clientId: string;
  settleInvoice: boolean;
  invoiceNumber: string;
  paymentReferenceId: string;
  paymentMethod?: string;
}) {
  const supabase = requireSupabase();
  const renewal = new Date();
  renewal.setMonth(renewal.getMonth() + 3);
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const fullUpdate: Record<string, string | null> = {
    subscription_status: "active",
    account_status: "Active",
    payment_method: input.paymentMethod ?? "wise",
    billing_frequency: "quarterly",
    renewal_date: renewal.toISOString().slice(0, 10),
    activation_date: today,
    provisioning_status: "live",
    onboarding_stage: "client_active",
    updated_at: now,
  };
  if (input.settleInvoice) {
    fullUpdate.payment_matched_at = now;
    fullUpdate.last_paid_invoice_number = input.invoiceNumber;
    fullUpdate.last_wise_transaction_id = input.paymentReferenceId;
  }

  const { error: fullError } = await supabase
    .from("internal_clients")
    .update(fullUpdate)
    .eq("id", input.clientId);

  if (fullError) {
    // Retry with the minimum fields required to unlock login.
    const minimalUpdate: Record<string, string | null> = {
      subscription_status: "active",
      account_status: "Active",
      onboarding_stage: "client_active",
      updated_at: now,
    };
    if (input.settleInvoice) {
      minimalUpdate.payment_matched_at = now;
    }
    const { error: minimalError } = await supabase
      .from("internal_clients")
      .update(minimalUpdate)
      .eq("id", input.clientId);
    if (minimalError) throw new Error(minimalError.message);
  }

  const { data: verified, error: verifyError } = await supabase
    .from("internal_clients")
    .select("subscription_status, account_status")
    .eq("id", input.clientId)
    .single();
  if (verifyError) throw new Error(verifyError.message);

  const subscription = String(verified.subscription_status ?? "")
    .trim()
    .toLowerCase();
  if (subscription !== "active") {
    throw new Error(
      `Client activation did not set subscription_status=active (got "${verified.subscription_status ?? ""}").`,
    );
  }
}

async function updateCrmToActiveCustomer(crmLeadId: string | null | undefined) {
  if (!crmLeadId?.trim()) return;
  const supabase = requireSupabase();
  await supabase
    .from("crm_leads")
    .update({
      status: "Active Customer",
      updated_at: new Date().toISOString(),
    })
    .eq("id", crmLeadId.trim());
}

async function recordActivationAudit(input: {
  workspaceId: string | null;
  invoiceId: string;
  clientId: string;
  paymentReferenceId: string;
  source: PaymentActivationSource;
  performedBy?: string | null;
  description: string;
}) {
  if (!input.workspaceId) return;
  const supabase = requireSupabase();
  try {
    await supabase.from("workspace_audit_log").insert({
      workspace_id: input.workspaceId,
      event_type: "payment_activation",
      entity_type: "invoice",
      entity_id: input.invoiceId,
      description: input.description,
      performed_by: input.performedBy?.trim() || null,
    });
  } catch {
    // Audit must not block activation.
  }
}

async function sendWelcomeEmail(input: {
  to: string;
  displayName: string;
  companyName: string;
  workspaceUrl: string;
  loginEmail: string;
}) {
  const message = buildCustomerWelcomeEmail({
    displayName: input.displayName,
    companyName: input.companyName,
    workspaceUrl: input.workspaceUrl,
    loginEmail: input.loginEmail,
    loginUrl: centralLoginUrl(input.workspaceUrl),
  });

  await sendMailboxEmail({
    account: "info",
    to: input.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}

/**
 * Production payment activation workflow.
 * Called by Wise automatic matching and by the manual admin test path.
 * Do not duplicate this logic elsewhere.
 *
 * Set `settleInvoice: false` only for manual testing when the real subscription
 * amount has not been paid (invoice stays unpaid; no GL cash journals).
 */
export async function activateCustomerFromPayment(
  input: ActivateCustomerFromPaymentInput,
): Promise<ActivateCustomerFromPaymentResult> {
  const supabase = requireSupabase();
  const settleInvoice = input.settleInvoice !== false;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", input.invoiceId)
    .single();
  if (error) throw new Error(error.message);

  const clientId = String(invoice.client_id);
  const invoiceNumber = String(invoice.invoice_number);
  const amount = input.amount ?? Number(invoice.amount);
  const currency = input.currency ?? String(invoice.currency ?? "USD");
  const organisationId = invoice.organisation_id ? String(invoice.organisation_id) : null;
  const invoiceWorkspaceId = invoice.workspace_id ? String(invoice.workspace_id) : null;

  if (settleInvoice && invoice.status === "paid") {
    const { data: clientRow } = await supabase
      .from("internal_clients")
      .select("company_name, workspace_id, email, crm_lead_id")
      .eq("id", clientId)
      .maybeSingle();
    const workspace = await resolveWorkspaceForClient({
      clientWorkspaceId: clientRow?.workspace_id ? String(clientRow.workspace_id) : null,
      invoiceWorkspaceId,
      organisationId,
      companyName: clientRow?.company_name ? String(clientRow.company_name) : null,
    });
    return {
      invoice: mapInvoiceRow(invoice as Record<string, unknown>, clientRow?.company_name),
      clientId,
      workspaceId: workspace?.id ?? null,
      workspaceSlug: workspace?.slug ?? null,
      workspaceUrl: workspace?.slug ? customerWorkspaceUrl(workspace.slug) : null,
      loginEmail: clientRow?.email ? String(clientRow.email) : null,
      welcomeEmailSent: false,
      crmLeadId: clientRow?.crm_lead_id ? String(clientRow.crm_lead_id) : null,
      alreadyPaid: true,
      invoiceSettled: true,
    };
  }

  if (settleInvoice) {
    const { data: existingMatch } = await supabase
      .from("wise_payment_matches")
      .select("id")
      .eq("wise_transaction_id", input.paymentReferenceId)
      .maybeSingle();
    if (existingMatch) {
      return {
        invoice: mapInvoiceRow(invoice as Record<string, unknown>),
        clientId,
        workspaceId: null,
        workspaceSlug: null,
        workspaceUrl: null,
        loginEmail: null,
        welcomeEmailSent: false,
        crmLeadId: null,
        alreadyPaid: true,
        invoiceSettled: true,
      };
    }
  }

  let invoiceRow: Record<string, unknown> = invoice as Record<string, unknown>;

  if (settleInvoice) {
    // 1–3. Mark invoice Paid + cash receipt / AR journals (Debtors via AR balance).
    const journal = await postInvoicePaymentJournal({
      invoiceId: String(invoice.id),
      invoiceNumber,
      clientId,
      amount,
      currency,
      journalDate: new Date().toISOString().slice(0, 10),
      wiseTransactionId: input.paymentReferenceId,
      workspaceId: invoiceWorkspaceId,
    });

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        payment_journal_entry_id: journal.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);
    invoiceRow = updatedInvoice as Record<string, unknown>;

    await supabase.from("wise_payment_matches").insert({
      wise_transaction_id: input.paymentReferenceId,
      invoice_id: invoice.id,
      journal_entry_id: journal.id,
      amount,
      currency,
      ...(invoiceWorkspaceId ? { workspace_id: invoiceWorkspaceId } : {}),
    });
  }

  const { data: clientRow, error: clientError } = await supabase
    .from("internal_clients")
    .select("*")
    .eq("id", clientId)
    .single();
  if (clientError) throw new Error(clientError.message);

  const companyName = String(clientRow.company_name ?? "Client");
  const contactName = String(clientRow.primary_contact ?? "Client");
  const crmLeadId = clientRow.crm_lead_id ? String(clientRow.crm_lead_id) : null;
  const clientWorkspaceId = clientRow.workspace_id ? String(clientRow.workspace_id) : null;

  const workspace = await resolveWorkspaceForClient({
    clientWorkspaceId,
    invoiceWorkspaceId,
    organisationId,
    companyName,
  });

  const now = new Date().toISOString();

  // 4. Client → Active + subscription active (unlocks login).
  // Never gated on invoice paid status — Test Activation leaves the invoice unpaid.
  await markClientActivatedForLogin({
    clientId,
    settleInvoice,
    invoiceNumber,
    paymentReferenceId: input.paymentReferenceId,
  });

  // 5–6. Workspace → Active (enables workspace login surface).
  if (workspace?.id) {
    await activateWorkspace(workspace.id);
    try {
      await supabase
        .from("internal_clients")
        .update({ workspace_id: workspace.id, updated_at: now })
        .eq("id", clientId);
    } catch {
      // Binding is best-effort.
    }
  }

  // payment_verified_at is only set for real settled payments (Wise), never Test Activation.
  if (organisationId && settleInvoice) {
    await supabase
      .from("platform_organisations")
      .update({
        payment_verified_at: now,
        updated_at: now,
      })
      .eq("id", organisationId);
  }

  const loginEmail = await resolveLoginEmail({
    clientEmail: String(clientRow.email ?? ""),
    organisationId,
    workspaceId: workspace?.id ?? null,
  });

  const workspaceUrl = workspace?.slug ? customerWorkspaceUrl(workspace.slug) : null;

  // 7. Welcome email.
  let welcomeEmailSent = false;
  if (loginEmail && workspaceUrl) {
    try {
      await sendWelcomeEmail({
        to: loginEmail,
        displayName: contactName,
        companyName,
        workspaceUrl,
        loginEmail,
      });
      welcomeEmailSent = true;
    } catch (error) {
      console.error("Welcome email failed after payment activation:", error);
    }
  }

  // 8. CRM → Active Customer.
  await updateCrmToActiveCustomer(crmLeadId).catch(() => undefined);

  // 9. Audit entry.
  const auditDescription = settleInvoice
    ? [
        `Payment activation (${input.source})`,
        `Invoice ${invoiceNumber} marked paid`,
        `Client ${companyName} activated`,
        workspace?.slug ? `Workspace ${workspace.slug} activated` : "No customer workspace linked",
        welcomeEmailSent ? "Welcome email sent" : "Welcome email not sent",
      ].join(" · ")
    : [
        "Activation was performed manually for testing",
        `Invoice ${invoiceNumber} left unpaid`,
        `Client ${companyName} activated`,
        workspace?.slug ? `Workspace ${workspace.slug} activated` : "No customer workspace linked",
        welcomeEmailSent ? "Welcome email sent" : "Welcome email not sent",
      ].join(" · ");

  await recordActivationAudit({
    workspaceId: workspace?.id ?? null,
    invoiceId: String(invoice.id),
    clientId,
    paymentReferenceId: input.paymentReferenceId,
    source: input.source,
    performedBy: input.performedBy,
    description: auditDescription,
  });

  if (settleInvoice) {
    await notifyInternalPaymentMatched({
      companyName,
      contactName,
      invoiceNumber,
      amount,
      currency,
      wiseTransactionId: input.paymentReferenceId,
      clientId,
    }).catch(() => undefined);
  }

  return {
    invoice: mapInvoiceRow(invoiceRow, companyName),
    clientId,
    workspaceId: workspace?.id ?? null,
    workspaceSlug: workspace?.slug ?? null,
    workspaceUrl,
    loginEmail,
    welcomeEmailSent,
    crmLeadId,
    alreadyPaid: settleInvoice && String(invoiceRow.status) === "paid",
    invoiceSettled: settleInvoice,
  };
}

/**
 * Admin / test activation for a Pending Payment client.
 * Uses the same Activation Service as Wise. Pass settleInvoice:false to leave
 * the invoice unpaid (manual testing with a partial transfer).
 */
export async function activateCustomerFromPendingClient(input: {
  clientId: string;
  performedBy?: string | null;
  source?: PaymentActivationSource;
  settleInvoice?: boolean;
}): Promise<ActivateCustomerFromPaymentResult> {
  const supabase = requireSupabase();
  const settleInvoice = input.settleInvoice !== false;
  const { data: client, error: clientError } = await supabase
    .from("internal_clients")
    .select("id, account_status, company_name")
    .eq("id", input.clientId)
    .single();
  if (clientError) throw new Error(clientError.message);

  const status = String(client.account_status ?? "");
  const eligibleByStatus =
    status === "Workspace Provisioned" ||
    status === "Client Created" ||
    status === "Onboarding" ||
    // Legacy pre-migration values (read normalize / until 094 applied)
    status === "Pending Payment" ||
    status === "Pending";
  if (!eligibleByStatus) {
    // Repair records whose account_status was incorrectly forced to Active while
    // payment onboarding was still incomplete, then continue activation.
    const { data: fullClient } = await supabase
      .from("internal_clients")
      .select("onboarding_stage, payment_matched_at, subscription_status")
      .eq("id", input.clientId)
      .maybeSingle();
    const stage = String(fullClient?.onboarding_stage ?? "");
    const sub = String(fullClient?.subscription_status ?? "");
    const stillAwaiting =
      (!fullClient?.payment_matched_at && stage === "awaiting_payment") ||
      sub === "pending_payment";
    if (!stillAwaiting) {
      throw new Error(
        "Manual activation is only available for Client Created / Workspace Provisioned / Onboarding clients.",
      );
    }
    await supabase
      .from("internal_clients")
      .update({
        account_status: "Workspace Provisioned",
        subscription_status: "pending_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.clientId);
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, status, amount, currency")
    .eq("client_id", input.clientId)
    .in("status", settleInvoice ? ["issued", "overdue", "draft"] : ["issued", "overdue", "draft", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (invoiceError) throw new Error(invoiceError.message);
  if (!invoice) {
    throw new Error("No invoice found for this client.");
  }

  const paymentReferenceId = settleInvoice
    ? `test-${crypto.randomUUID()}`
    : `manual-test-unpaid-${crypto.randomUUID()}`;

  return activateCustomerFromPayment({
    invoiceId: String(invoice.id),
    paymentReferenceId,
    amount: Number(invoice.amount),
    currency: String(invoice.currency ?? "USD"),
    source: input.source ?? "manual_test",
    performedBy: input.performedBy ?? null,
    settleInvoice,
  });
}

export { customerWorkspaceUrl };

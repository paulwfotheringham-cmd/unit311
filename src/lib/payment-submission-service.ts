import { ensureClientSubscriptionInvoice } from "@/lib/accounting/invoices-service";
import { resolveInvoiceRecipientEmail } from "@/lib/accounting/onboarding-invoice";
import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { saveInvoicePdfToClientFolder, saveTransferReceipt } from "@/lib/client-invoice-storage";
import { createInternalClient, listInternalClients, updateInternalClient } from "@/lib/internal-clients-service";
import { requireCurrentWorkspace } from "@/lib/workspace-context";
import { sendMailboxEmail } from "@/lib/email/smtp";
import {
  getOrganisationForUser,
  markOrganisationPaymentSubmitted,
  markOrganisationPaymentReceiptFile,
  type PlatformOrganisation,
} from "@/lib/organisation-service";
import { buildInvoiceEmail } from "@/lib/payment-emails";
import { PAYMENT_AMOUNT, PAYMENT_SUPPORT_EMAIL } from "@/lib/payment-data";
import { buildPaymentSubmittedAdminEmail } from "@/lib/platform-email-verification/emails";
import {
  buildInvoiceFileName,
  buildSubscriptionInvoicePdf,
  generateInvoiceNumber,
} from "@/lib/subscription-invoice-pdf";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type PaymentInvoiceState = {
  invoiceNumber: string;
  fileName: string;
  companyName: string;
  submitted: boolean;
  paymentVerified: boolean;
  paymentReference: string;
  invoiceStatus: string;
  amount: string;
  currency: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

async function findClientByOrganisationId(organisationId: string) {
  const workspace = await requireCurrentWorkspace();
  const clients = await listInternalClients({ workspaceId: workspace.id });
  return clients.find((client) => client.platformOrganisationId === organisationId) ?? null;
}

async function ensurePendingClientRecord(input: {
  organisation: PlatformOrganisation;
  contactName: string;
  contactEmail: string;
}) {
  const existing = await findClientByOrganisationId(input.organisation.id);
  if (existing) return existing;

  const workspace = await requireCurrentWorkspace();
  return createInternalClient(
    {
      companyName: input.organisation.name,
      primaryContact: input.contactName,
      email: input.contactEmail,
      accountStatus: "Pending",
      contractType: "Retainer",
      industry: "Other",
      region: "United Kingdom",
      notes: `Signup onboarding client. Organisation ID: ${input.organisation.id}`,
      platformOrganisationId: input.organisation.id,
      workspaceId: workspace.id,
    },
    { workspaceId: workspace.id },
  );
}

async function markOrganisationInvoicePath(organisationId: string, storagePath: string) {
  if (organisationId.startsWith("virtual-")) {
    return;
  }

  const supabase = requireSupabase();
  const { error } = await supabase
    .from("platform_organisations")
    .update({
      invoice_file_path: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organisationId);

  if (error && !error.message.includes("invoice_file_path")) {
    throw new Error(error.message);
  }
}

export async function ensureSubscriptionInvoice(input: {
  userId: string;
  username: string;
  displayName: string;
  email: string;
}): Promise<PaymentInvoiceState> {
  const organisation = await getOrganisationForUser(input.userId, input.email);
  if (!organisation) {
    throw new Error("Organisation not found for this account.");
  }

  const companyName = organisation.name;
  let invoiceNumber = "";
  let fileName = "";
  const storagePath = organisation.invoice_file_path ?? null;

  const client = await ensurePendingClientRecord({
    organisation,
    contactName: input.displayName,
    contactEmail: input.email,
  });

  let paymentReference = "";
  let invoiceStatus = organisation.payment_verified_at ? "paid" : "issued";
  invoiceNumber = "";

  // Always create/link the ledger invoice first so INV numbers come from the Invoice table.
  try {
    const ledgerInvoice = await ensureClientSubscriptionInvoice({
      clientId: client.id,
      organisationId: organisation.id,
      companyName,
      existingInvoiceNumber: storagePath?.match(/(\d{6})invoice\.pdf$/i)?.[1] ?? null,
      pdfPath: organisation.invoice_file_path ?? storagePath,
      dueImmediately: true,
    });
    invoiceNumber = ledgerInvoice.invoiceNumber;
    paymentReference = ledgerInvoice.paymentReference;
    invoiceStatus = ledgerInvoice.status;
  } catch {
    invoiceNumber = generateInvoiceNumber();
    paymentReference = `INV-${invoiceNumber}`;
  }

  fileName = buildInvoiceFileName(companyName, invoiceNumber);

  if (!storagePath) {
    const recipientEmail = resolveInvoiceRecipientEmail(client) || input.email;
    const billingAddress =
      client.billingAddress?.trim() ||
      [
        client.companyAddress?.trim(),
        [client.companyCity?.trim(), client.companyPostcode?.trim()].filter(Boolean).join(" "),
        client.companyCountry?.trim(),
      ]
        .filter(Boolean)
        .join("\n");

    const pdfBytes = await buildSubscriptionInvoicePdf({
      companyName,
      contactName: client.primaryContact.trim() || input.displayName,
      contactEmail: recipientEmail,
      billingAddress,
      invoiceNumber,
      paymentReference,
    });

    try {
      const saved = await saveInvoicePdfToClientFolder({
        companyName,
        fileName,
        pdfBytes,
      });

      await markOrganisationInvoicePath(organisation.id, saved.storagePath);

      if (paymentReference) {
        try {
          const supabase = requireSupabase();
          await supabase
            .from("invoices")
            .update({
              pdf_path: saved.storagePath,
              updated_at: new Date().toISOString(),
            })
            .eq("payment_reference", paymentReference);
        } catch {
          // Optional link from invoice row to storage path.
        }
      }
    } catch {
      // Payment can continue even if internal file storage is unavailable.
    }

    const paymentUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? CENTRAL_SITE_URL).replace(/\/$/, "")}/payment`;
    const message = buildInvoiceEmail({
      companyName,
      contactName: input.displayName,
      paymentUrl,
    });

    await sendMailboxEmail({
      account: "info",
      to: recipientEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(pdfBytes),
          contentType: "application/pdf",
        },
      ],
    }).catch(() => undefined);
  }

  // Awaiting payment — no screenshot/manual confirmation required.
  try {
    const supabase = requireSupabase();
    await supabase
      .from("internal_clients")
      .update({
        onboarding_stage: invoiceStatus === "paid" ? "client_active" : "awaiting_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id);
  } catch {
    // Ignore optional stage write failures before migration 072.
  }

  return {
    invoiceNumber,
    fileName,
    companyName,
    submitted: Boolean(organisation.payment_submitted_at) || Boolean(paymentReference),
    paymentVerified: Boolean(organisation.payment_verified_at) || invoiceStatus === "paid",
    paymentReference,
    invoiceStatus: invoiceStatus === "issued" ? "awaiting_payment" : invoiceStatus,
    amount: PAYMENT_AMOUNT,
    currency: "USD",
  };
}

export async function submitBankTransferPayment(input: {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  receiptFile: File;
}) {
  const organisation = await getOrganisationForUser(input.userId, input.email);
  if (!organisation) {
    throw new Error("Organisation not found for this account.");
  }

  if (organisation.payment_verified_at) {
    throw new Error("Payment has already been confirmed for this account.");
  }

  const receiptFile = await saveTransferReceipt({
    companyName: organisation.name,
    file: input.receiptFile,
  }).catch((error) => {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to save your payment screenshot. Please try again.",
    );
  });

  await markOrganisationPaymentReceiptFile(organisation.id, receiptFile.id);

  const client = await ensurePendingClientRecord({
    organisation,
    contactName: input.displayName,
    contactEmail: input.email,
  });

  await markOrganisationPaymentSubmitted(organisation.id);

  const adminMessage = buildPaymentSubmittedAdminEmail({
    companyName: organisation.name,
    contactName: input.displayName,
    email: input.email,
  });

  await sendMailboxEmail({
    account: "info",
    to: PAYMENT_SUPPORT_EMAIL,
    subject: adminMessage.subject,
    html: adminMessage.html,
    text: adminMessage.text,
  }).catch(() => undefined);

  await updateInternalClient(
    client.id,
    {
      notes: `${client.notes}\nTransfer receipt submitted ${new Date().toISOString()}.`.trim(),
    },
    { workspaceId: (await requireCurrentWorkspace()).id },
  );

  return { ok: true as const };
}

export async function getInvoicePdfForUser(
  userId: string,
  email: string,
  options?: { displayName?: string },
) {
  const organisation = await getOrganisationForUser(userId, email);
  if (!organisation) {
    return null;
  }

  if (organisation.invoice_file_path) {
    const supabase = requireSupabase();
    const { data, error } = await supabase.storage
      .from("internal-files")
      .download(organisation.invoice_file_path);

    if (!error && data) {
      const buffer = Buffer.from(await data.arrayBuffer());
      const fileName = organisation.invoice_file_path.split("/").pop() ?? "invoice.pdf";
      return { buffer, fileName };
    }
  }

  const invoiceNumber = generateInvoiceNumber();
  const fileName = buildInvoiceFileName(organisation.name, invoiceNumber);
  const pdfBytes = await buildSubscriptionInvoicePdf({
    companyName: organisation.name,
    contactName: options?.displayName?.trim() || organisation.name,
    contactEmail: email,
    invoiceNumber,
  });

  return {
    buffer: Buffer.from(pdfBytes),
    fileName,
  };
}

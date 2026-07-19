import { createActionItem } from "@/lib/internal-action-items-service";
import { sendMessage } from "@/lib/internal-messaging-service";
import { INTERNAL_MESSAGING_ROOM } from "@/lib/internal-messaging-data";
import { sendMailboxEmail } from "@/lib/email/smtp";
import { PAYMENT_SUPPORT_EMAIL } from "@/lib/payment-data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveWorkspaceBinding } from "@/lib/workspace-context";

export type PaymentActivationContext = {
  companyName: string;
  contactName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  wiseTransactionId: string;
  clientId: string;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export async function notifyInternalPaymentMatched(input: PaymentActivationContext) {
  if (!isSupabaseConfigured()) return;

  const money = formatMoney(input.amount, input.currency);
  const invoiceLabel = input.invoiceNumber.startsWith("INV-")
    ? input.invoiceNumber
    : `INV-${input.invoiceNumber}`;

  const task = [
    `Funds received from new client ${input.companyName}`,
    `Invoice ${invoiceLabel} paid`,
    "Client activated",
    "Ready for provisioning",
  ].join(" · ");

  await createActionItem({
    priority: "high",
    task,
    assignedTo: "Team",
    dueLabel: "Now",
    href: "?view=accounts-receivable",
  }).catch(() => undefined);

  const internal = await resolveWorkspaceBinding({ fallbackInternal: true });
  if (!internal) return;

  await sendMessage(
    {
      operatorId: "system",
      operatorName: "System",
      username: "system",
      room: INTERNAL_MESSAGING_ROOM,
      messageType: "system",
      content: [
        `💰 Funds received from new client ${input.companyName}.`,
        `Invoice ${invoiceLabel} has been paid.`,
        `Amount: ${money}`,
        "Client activated. Ready for provisioning.",
        `Wise transaction: ${input.wiseTransactionId}`,
      ].join("\n"),
    },
    { workspaceId: internal.id },
  ).catch(() => undefined);

  const subject = "New client payment received";
  const text = [
    `Company: ${input.companyName}`,
    `Client: ${input.contactName}`,
    `Invoice Number: ${invoiceLabel}`,
    `Amount: ${money}`,
    `Wise Transaction: ${input.wiseTransactionId}`,
    "Activation Status: Active",
    "Provisioning Status: Provisioning Pending",
  ].join("\n");

  const html = `
    <p><strong>New client payment received</strong></p>
    <ul>
      <li>Company: ${input.companyName}</li>
      <li>Client: ${input.contactName}</li>
      <li>Invoice Number: ${invoiceLabel}</li>
      <li>Amount: ${money}</li>
      <li>Wise Transaction: ${input.wiseTransactionId}</li>
      <li>Activation Status: Active</li>
      <li>Provisioning Status: Provisioning Pending</li>
    </ul>
  `;

  await sendMailboxEmail({
    account: "info",
    to: PAYMENT_SUPPORT_EMAIL,
    subject,
    html,
    text,
  }).catch(() => undefined);
}

export async function markClientActivatedFromPayment(input: {
  clientId: string;
  invoiceNumber: string;
  wiseTransactionId: string;
}) {
  if (!isSupabaseConfigured()) return;
  const supabase = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  await supabase
    .from("internal_clients")
    .update({
      subscription_status: "active",
      account_status: "Active",
      payment_method: "wise",
      billing_frequency: "quarterly",
      activation_date: today,
      payment_matched_at: now,
      last_paid_invoice_number: input.invoiceNumber,
      last_wise_transaction_id: input.wiseTransactionId,
      provisioning_status: "provisioning_pending",
      onboarding_stage: "client_active",
      updated_at: now,
    })
    .eq("id", input.clientId);
}

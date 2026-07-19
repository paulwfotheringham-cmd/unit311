import {
  getInvoiceByPaymentReference,
  listInvoices,
  markInvoicePaidFromWise,
} from "@/lib/accounting/invoices-service";
import { postWiseOutboundJournal } from "@/lib/accounting/posting-rules";
import type { LedgerInvoice } from "@/lib/accounting/types";
import { getWiseBalanceTransactions, listWiseBalances } from "@/lib/wise-service";

function extractPaymentReference(text: string) {
  const match = text.toUpperCase().match(/INV-?\d{4,8}/);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, "");
  return digits ? `INV-${digits}` : null;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeCompany(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function findUniqueOpenInvoiceByAmount(
  openInvoices: LedgerInvoice[],
  amount: number,
  currency: string,
) {
  const matches = openInvoices.filter(
    (invoice) =>
      roundMoney(invoice.amount) === roundMoney(amount) &&
      invoice.currency.toUpperCase() === currency.toUpperCase(),
  );
  return matches.length === 1 ? matches[0] : null;
}

function findUniqueOpenInvoiceByCompany(openInvoices: LedgerInvoice[], haystack: string) {
  const text = normalizeCompany(haystack);
  if (!text) return null;
  const matches = openInvoices.filter((invoice) => {
    const name = normalizeCompany(invoice.clientName ?? "");
    return name.length >= 3 && text.includes(name);
  });
  return matches.length === 1 ? matches[0] : null;
}

export async function reconcileWiseIncomingPayments() {
  const balances = await listWiseBalances();
  const matched: Array<{ invoiceId: string; wiseTransactionId: string; reference: string }> =
    [];
  const errors: string[] = [];
  const intervalEnd = new Date().toISOString();
  const intervalStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString();
  const openInvoices = (await listInvoices().catch(() => [])).filter(
    (invoice) => invoice.status === "issued" || invoice.status === "overdue",
  );

  for (const balance of balances.slice(0, 6)) {
    try {
      const result = await getWiseBalanceTransactions({
        balanceId: balance.id,
        currency: balance.currency,
        intervalStart,
        intervalEnd,
      });

      for (const tx of result.transactions ?? []) {
        if (tx.amount <= 0 || tx.direction === "outgoing") continue;

        const haystack = [tx.reference, tx.description, tx.counterparty]
          .filter(Boolean)
          .join(" ");
        const reference = extractPaymentReference(haystack);

        const invoice =
          (reference ? await getInvoiceByPaymentReference(reference) : null) ??
          findUniqueOpenInvoiceByAmount(openInvoices, tx.amount, balance.currency) ??
          findUniqueOpenInvoiceByCompany(openInvoices, haystack);

        if (!invoice || invoice.status === "paid") continue;

        // Prefer exact amount once a candidate is found via company name.
        if (
          !reference &&
          roundMoney(invoice.amount) !== roundMoney(tx.amount) &&
          invoice.currency.toUpperCase() === balance.currency.toUpperCase()
        ) {
          // Allow company-name match only when amount also matches for safety.
          continue;
        }

        const wiseTransactionId = String(tx.id || `${balance.id}-${tx.date}-${tx.amount}`);

        await markInvoicePaidFromWise({
          invoiceId: invoice.id,
          wiseTransactionId,
          amount: invoice.amount,
          currency: invoice.currency,
        });

        matched.push({
          invoiceId: invoice.id,
          wiseTransactionId,
          reference: invoice.paymentReference,
        });

        // Prevent double matching within the same run.
        const idx = openInvoices.findIndex((row) => row.id === invoice!.id);
        if (idx >= 0) openInvoices.splice(idx, 1);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Balance reconcile failed");
    }
  }

  return { matched, errors, scannedBalances: balances.length };
}

export async function postOutboundWiseTransferJournal(input: {
  transferId: string;
  amount: number;
  currency: string;
  description: string;
}) {
  return postWiseOutboundJournal({
    transferId: input.transferId,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    journalDate: new Date().toISOString().slice(0, 10),
  });
}

"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Download } from "lucide-react";

import {
  PAYMENT_AMOUNT,
  PAYMENT_BANK_DETAILS,
  PAYMENT_PLAN,
} from "@/lib/payment-data";

import { PaymentPageShell } from "./payment-ui";

type PaymentStatus = {
  invoiceNumber: string;
  fileName: string;
  companyName: string;
  submitted: boolean;
  paymentVerified: boolean;
  paymentReference?: string;
  invoiceStatus?: string;
  amount?: string;
  currency?: string;
};

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error(`Request failed (${response.status}).`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      response.ok
        ? "Invalid server response."
        : text.slice(0, 180) || `Request failed (${response.status}).`,
    );
  }
}

export default function PaymentTransferPageContent() {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function load() {
      try {
        const statusResponse = await fetch("/api/payment/status");
        const statusData = await readApiJson<PaymentStatus & { error?: string }>(statusResponse);
        if (!statusResponse.ok) {
          throw new Error(statusData.error ?? "Unable to load payment details.");
        }

        if (!active) return;
        setStatus(statusData);

        const invoiceResponse = await fetch("/api/payment/invoice");
        if (invoiceResponse.ok) {
          const blob = await invoiceResponse.blob();
          objectUrl = URL.createObjectURL(blob);
          if (active) setInvoiceUrl(objectUrl);
        }
      } catch (loadError) {
        if (active) {
          setPageError(
            loadError instanceof Error ? loadError.message : "Unable to load payment page.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    const poll = window.setInterval(() => {
      void (async () => {
        try {
          const statusResponse = await fetch("/api/payment/status", { cache: "no-store" });
          const statusData = await readApiJson<PaymentStatus & { error?: string }>(statusResponse);
          if (!statusResponse.ok || !active) return;
          setStatus(statusData);
        } catch {
          // Keep waiting UI; next poll retries.
        }
      })();
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(poll);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const bank = PAYMENT_BANK_DETAILS;
  const paid =
    Boolean(status?.paymentVerified) ||
    status?.invoiceStatus === "paid" ||
    status?.invoiceStatus === "Paid";

  return (
    <PaymentPageShell
      title="Pay by bank transfer"
      description={`Transfer ${PAYMENT_AMOUNT} for your ${PAYMENT_PLAN} subscription. Your invoice is already in the ledger — Wise matching is automatic.`}
      backHref="/payment"
      wide
    >
      {loading ? (
        <p className="mt-10 text-center text-sm text-white/55">Preparing your invoice…</p>
      ) : pageError ? (
        <p className="mt-10 rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-4 text-center text-sm text-red-100">
          {pageError}
        </p>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#93c5fd]">
                  Invoice
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  {status?.companyName ?? "Your company"}
                </h2>
                <p className="mt-1 font-mono text-xs text-emerald-200/90">
                  {status?.paymentReference ?? `INV-${status?.invoiceNumber ?? "______"}`}
                </p>
              </div>
              {invoiceUrl ? (
                <a
                  href={invoiceUrl}
                  download={status?.fileName ?? "invoice.pdf"}
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.1] sm:self-auto"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              ) : null}
            </div>

            <div className="aspect-[4/5] bg-[#07111f] sm:aspect-[3/4]">
              {invoiceUrl ? (
                <iframe
                  src={invoiceUrl}
                  title="Subscription invoice"
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/45">
                  Invoice unavailable
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-5 py-4 text-sm text-white/60 sm:px-6">
              <p>
                Amount due: <span className="font-semibold text-white">{PAYMENT_AMOUNT}</span> —
                payable immediately
              </p>
              <p className="mt-1 text-xs text-white/45">
                Status:{" "}
                <span className="font-medium text-white/70">
                  {paid ? "Paid" : "Awaiting Payment"}
                </span>
              </p>
            </div>
          </article>

          <article className="rounded-[28px] border border-white/12 bg-white/[0.06] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/20 text-[#6ee7b7]">
                <Building2 className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-white">Wise transfer details</h2>
                <p className="text-sm text-white/55">Transfer via Wise US</p>
              </div>
            </div>

            <dl className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-[#07111f]/70 p-5 text-sm">
              <div>
                <dt className="text-white/45">Account name</dt>
                <dd className="mt-1 font-medium text-white">{bank.accountName}</dd>
              </div>
              <div>
                <dt className="text-white/45">Bank name</dt>
                <dd className="mt-1 font-medium text-white">{bank.bankName}</dd>
              </div>
              <div>
                <dt className="text-white/45">Routing (ABA)</dt>
                <dd className="mt-1 font-medium text-white">{bank.routingNumber}</dd>
              </div>
              <div>
                <dt className="text-white/45">Account number</dt>
                <dd className="mt-1 font-medium text-white">{bank.accountNumber}</dd>
              </div>
              <div>
                <dt className="text-white/45">SWIFT/BIC</dt>
                <dd className="mt-1 font-medium text-white">{bank.swift}</dd>
              </div>
              <div>
                <dt className="text-white/45">Bank address</dt>
                <dd className="mt-1 font-medium text-white">{bank.bankAddress}</dd>
              </div>
              <div>
                <dt className="text-white/45">Payment reference</dt>
                <dd className="mt-1 font-medium text-emerald-200">
                  {status?.paymentReference ?? `INV-${status?.invoiceNumber ?? "______"}`}
                </dd>
              </div>
              <div>
                <dt className="text-white/45">Amount</dt>
                <dd className="mt-1 font-medium text-white">
                  {status?.amount ?? PAYMENT_AMOUNT} {status?.currency ?? "USD"}
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-white/45">
              Transfer the exact amount and include the payment reference. Wise matching updates the
              general ledger, accounts receivable, and your client status automatically.
            </p>

            {paid ? (
              <div className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-5 py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-100">Payment received</p>
                    <p className="mt-1 text-sm text-emerald-100/80">
                      Your invoice is paid, your subscription is active, and the general ledger has
                      been updated.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-5 py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                  <div>
                    <p className="text-sm font-semibold text-amber-50">Awaiting payment</p>
                    <p className="mt-1 text-sm text-amber-100/80">
                      Invoice{" "}
                      <span className="font-mono text-amber-50">
                        {status?.paymentReference ?? `INV-${status?.invoiceNumber}`}
                      </span>{" "}
                      is live in Accounts Receivable. No confirmation upload is required — this page
                      updates when Wise matches your transfer.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </article>
        </div>
      )}
    </PaymentPageShell>
  );
}

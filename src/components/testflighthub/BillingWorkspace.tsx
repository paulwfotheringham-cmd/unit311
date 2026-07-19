"use client";

import {
  BILLING_INVOICES,
  BILLING_PAYMENT_METHOD,
  BILLING_PLAN,
  invoiceStatusLabel,
  type InvoiceStatus,
} from "@/lib/billing-data";
import { cn } from "@/lib/utils";
import { CreditCard, Download, Receipt } from "lucide-react";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1524]/50 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function invoiceStatusClass(status: InvoiceStatus) {
  switch (status) {
    case "paid":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "awaiting":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }
}

export default function BillingWorkspace() {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.14] via-white/[0.04] to-sky-500/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15 text-violet-200">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/80">
                  Current subscription
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">{BILLING_PLAN.name}</h2>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-200">
              {BILLING_PLAN.status}
            </span>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5 sm:px-6 sm:pb-6">
          <DetailRow label="Status" value={BILLING_PLAN.status} />
          <DetailRow label="Plan" value={BILLING_PLAN.name} />
          <DetailRow label="Price" value={BILLING_PLAN.priceLabel} />
          <DetailRow label="Billing" value={BILLING_PLAN.billingCycle} />
          <DetailRow label="Next invoice" value={BILLING_PLAN.nextInvoiceDate} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sky-300">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Payment method</h3>
              <p className="text-xs text-white/45">Default for quarterly invoices</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-gradient-to-br from-[#0b1524] to-[#0d1a2c] p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
              {BILLING_PAYMENT_METHOD.type}
            </p>
            <p className="mt-2 font-mono text-lg tracking-widest text-white/90">
              {BILLING_PAYMENT_METHOD.masked}
            </p>
          </div>

          <button
            type="button"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-sky-400/35 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-500/20"
          >
            Change payment method
          </button>
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-amber-300">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Invoices</h3>
              <p className="text-xs text-white/45">Download PDF copies for your records</p>
            </div>
          </div>

          <ul className="divide-y divide-white/[0.06]">
            {BILLING_INVOICES.map((invoice) => (
              <li
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-white">{invoice.number}</p>
                  <span
                    className={cn(
                      "mt-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
                      invoiceStatusClass(invoice.status),
                    )}
                  >
                    {invoiceStatusLabel(invoice.status)}
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/75 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

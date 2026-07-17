"use client";

import Link from "next/link";
import { Building2, CreditCard } from "lucide-react";

import { PAYMENT_AMOUNT, PAYMENT_PLAN } from "@/lib/payment-data";

import { PaymentPageShell } from "./payment-ui";

export default function PaymentPageContent() {
  return (
    <PaymentPageShell
      title="Complete your payment"
      description={`Choose how you would like to pay ${PAYMENT_AMOUNT} for your ${PAYMENT_PLAN} subscription.`}
      wide
    >
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="relative flex flex-col rounded-[28px] border border-white/12 bg-white/[0.04] p-6 opacity-80 sm:p-8">
          <span className="absolute right-4 top-4 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
            Coming Soon
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563eb]/20 text-[#93c5fd]">
            <CreditCard className="h-6 w-6" strokeWidth={2} />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-white">Pay by card</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Card payments will be available soon. Please use bank transfer for now.
          </p>
          <p className="mt-4 text-sm font-medium text-white/40">{PAYMENT_AMOUNT} via Stripe</p>
          <span className="mt-8 inline-flex text-sm font-semibold text-white/35">Unavailable</span>
        </div>

        <Link
          href="/payment-transfer"
          className="group flex flex-col rounded-[28px] border border-white/12 bg-white/[0.06] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:border-white/25 hover:bg-white/[0.09] sm:p-8"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#10b981]/20 text-[#6ee7b7]">
            <Building2 className="h-6 w-6" strokeWidth={2} />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-white">Pay by bank transfer</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Transfer via Wise using your invoice reference. Matching is automatic.
          </p>
          <p className="mt-4 text-sm font-medium text-[#93c5fd]">
            {PAYMENT_AMOUNT} by bank transfer
          </p>
          <span className="mt-8 inline-flex text-sm font-semibold text-white transition-transform group-hover:translate-x-0.5">
            Continue →
          </span>
        </Link>
      </div>
    </PaymentPageShell>
  );
}

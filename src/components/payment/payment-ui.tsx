import Link from "next/link";
import type { ReactNode } from "react";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import { PAYMENT_AMOUNT } from "@/lib/payment-data";

export function AmountBanner() {
  return (
    <div className="rounded-xl border border-[#3b82f6]/25 bg-[#2563eb]/10 px-4 py-3 text-center">
      <p className="text-sm font-medium text-white/70">Amount due now</p>
      <p className="mt-1 text-2xl font-bold text-white">{PAYMENT_AMOUNT}</p>
      <p className="mt-1 text-sm text-[#93c5fd]">Payable immediately</p>
    </div>
  );
}

export function PaymentField({
  id,
  label,
  type = "text",
  placeholder,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white/80">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
      />
    </div>
  );
}

type PaymentPageShellProps = {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  wide?: boolean;
  children: ReactNode;
};

export function PaymentPageShell({
  title,
  description,
  backHref,
  backLabel = "Back to payment options",
  wide = false,
  children,
}: PaymentPageShellProps) {
  return (
    <MarketingPageShell
      contentClassName={`relative z-10 mx-auto px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20 ${
        wide ? "max-w-6xl" : "max-w-3xl"
      }`}
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55 sm:text-sm">
          Unit311 Central
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">{description}</p>
        {backHref ? (
          <Link
            href={backHref}
            className="mt-5 inline-flex text-sm font-medium text-[#93c5fd] transition-colors hover:text-white"
          >
            ← {backLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </MarketingPageShell>
  );
}

export function PaymentPanel({ children }: { children: ReactNode }) {
  return (
    <article className="mt-10 rounded-[28px] border border-white/12 bg-white/[0.06] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8">
      {children}
    </article>
  );
}

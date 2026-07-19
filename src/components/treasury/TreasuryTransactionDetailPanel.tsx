"use client";

import { useEffect } from "react";

import {
  formatTreasuryDateTime,
  formatTreasuryMoney,
  TreasuryDirectionBadge,
  TreasuryStatusBadge,
} from "@/components/treasury/treasury-ui";
import type { TreasuryTransaction } from "@/lib/treasury/treasury-types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type TreasuryTransactionDetailPanelProps = {
  transaction: TreasuryTransaction | null;
  onClose: () => void;
  isAdmin?: boolean;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-white">{value}</dd>
    </div>
  );
}

export default function TreasuryTransactionDetailPanel({
  transaction,
  onClose,
  isAdmin = false,
}: TreasuryTransactionDetailPanelProps) {
  useEffect(() => {
    if (!transaction) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [transaction, onClose]);

  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close transaction details"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#07111f]/95 shadow-[-12px_0_40px_rgba(0,0,0,0.45)]",
          "animate-[treasurySlideIn_0.22s_ease-out]",
        )}
      >
        <style>{`
          @keyframes treasurySlideIn {
            from { transform: translateX(100%); opacity: 0.6; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>

        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
              Transaction
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">{transaction.description}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <TreasuryDirectionBadge direction={transaction.direction} />
              <TreasuryStatusBadge status={transaction.status} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-white/70 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <p
            className={cn(
              "text-3xl font-semibold tabular-nums",
              transaction.direction === "incoming" ? "text-emerald-300" : "text-white",
            )}
          >
            {transaction.direction === "incoming" ? "+" : "−"}
            {formatTreasuryMoney(Math.abs(transaction.amount), transaction.currency)}
          </p>

          <dl className="mt-5 grid gap-2.5">
            <DetailRow label="Date" value={formatTreasuryDateTime(transaction.date)} />
            <DetailRow label="Counterparty" value={transaction.counterparty} />
            <DetailRow label="Reference" value={transaction.reference} />
            <DetailRow label="Currency" value={transaction.currency} />
            <DetailRow
              label="Fee"
              value={
                transaction.fee === null
                  ? "—"
                  : formatTreasuryMoney(transaction.fee, transaction.currency)
              }
            />
            <DetailRow
              label="Running balance"
              value={
                transaction.runningBalance === null
                  ? "—"
                  : formatTreasuryMoney(transaction.runningBalance, transaction.currency)
              }
            />
            <DetailRow label="Balance ID" value={String(transaction.balanceId)} />
            <DetailRow label="Transaction ID" value={transaction.id} />
          </dl>

          {isAdmin ? (
            <section className="mt-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/90">
                Admin debug
              </h3>
              <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-amber-400/20 bg-[#0b1524] p-3 text-[11px] leading-relaxed text-amber-100/90">
                {JSON.stringify(transaction.raw, null, 2)}
              </pre>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

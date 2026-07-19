"use client";

export default function FinancialReportsWorkspace() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
        Financials
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white">Reports</h2>
      <p className="mt-3 max-w-2xl text-sm text-white/55">
        Formal financial reports will be added here. Until then, use Overview, General Ledger,
        Accounts Receivable, Accounts Payable, Expenses, and Wise — all reading from the General
        Ledger.
      </p>
    </section>
  );
}

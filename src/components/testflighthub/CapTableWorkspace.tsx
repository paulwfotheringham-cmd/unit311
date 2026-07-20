"use client";

import { PieChart } from "lucide-react";

const OVERVIEW = [
  { label: "Total Shares Issued", value: "1,000,000" },
  { label: "Shareholders", value: "4" },
  { label: "Option Pool", value: "10%" },
  { label: "Last Updated", value: "15 Jul 2026" },
] as const;

const SHAREHOLDERS = [
  {
    shareholder: "Unit311 Holdings Pty Ltd",
    class: "Ordinary",
    shares: "650,000",
    ownership: "65.0%",
  },
  {
    shareholder: "Founders",
    class: "Ordinary",
    shares: "250,000",
    ownership: "25.0%",
  },
  {
    shareholder: "Employee Option Pool",
    class: "Options",
    shares: "100,000",
    ownership: "10.0%",
  },
] as const;

const CAPABILITIES = [
  "Shareholder register",
  "Share classes",
  "Equity issuances",
  "Option plans",
  "Vesting schedules",
  "Historical ownership changes",
  "Investment rounds",
  "Dilution modelling",
] as const;

export default function CapTableWorkspace() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10">
            <PieChart className="h-5 w-5 text-sky-200" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">Cap Table</h2>
            <p className="mt-1 text-sm text-white/65">
              Manage shareholders, equity ownership and capital structure.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {OVERVIEW.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-4"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
              {card.label}
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-white">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03]">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-white">Shareholders</h3>
          <p className="mt-1 text-sm text-white/55">
            Current equity ownership by shareholder and share class.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                <th className="px-4 py-3 font-semibold sm:px-5">Shareholder</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Class</th>
                <th className="px-4 py-3 text-right font-semibold sm:px-5">Shares</th>
                <th className="px-4 py-3 text-right font-semibold sm:px-5">Ownership</th>
              </tr>
            </thead>
            <tbody>
              {SHAREHOLDERS.map((row) => (
                <tr key={row.shareholder} className="border-b border-white/8 text-white/85">
                  <td className="px-4 py-3 font-medium text-white sm:px-5">{row.shareholder}</td>
                  <td className="px-4 py-3 sm:px-5">{row.class}</td>
                  <td className="px-4 py-3 text-right tabular-nums sm:px-5">{row.shares}</td>
                  <td className="px-4 py-3 text-right tabular-nums sm:px-5">{row.ownership}</td>
                </tr>
              ))}
              <tr className="bg-white/[0.04] text-white">
                <td className="px-4 py-3 font-semibold sm:px-5">Total</td>
                <td className="px-4 py-3 sm:px-5" />
                <td className="px-4 py-3 text-right font-semibold tabular-nums sm:px-5">
                  1,000,000
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums sm:px-5">
                  100.0%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-sky-100">Cap Table management will provide</h3>
        <ul className="mt-3 grid gap-2 text-sm text-sky-50/90 sm:grid-cols-2">
          {CAPABILITIES.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

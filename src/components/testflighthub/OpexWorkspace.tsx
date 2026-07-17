"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import {
  createOpexLineItemId,
  DEFAULT_OPEX_LINE_ITEMS,
  formatOpexAmount,
  loadOpexLineItems,
  OPEX_CLIENT_COUNT,
  parseOpexAmountInput,
  saveOpexLineItems,
  sumOpexYearly,
  type OpexLineItem,
} from "@/lib/opex-data";
import { cn } from "@/lib/utils";
import { BarChart3, Check, Pencil, Plus, Trash2, Wallet, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = [
  "#38bdf8",
  "#34d399",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#2dd4bf",
  "#f472b6",
  "#60a5fa",
  "#4ade80",
  "#c084fc",
  "#facc15",
  "#f87171",
  "#22d3ee",
];

function panelClassName() {
  return "rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_16px_48px_rgba(0,0,0,0.28)]";
}

function inputClassName() {
  return "w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

type OpexDraft = {
  description: string;
  amountUsd: string;
};

function truncateLabel(value: string, max = 28) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export default function OpexWorkspace() {
  const [items, setItems] = useState<OpexLineItem[]>(DEFAULT_OPEX_LINE_ITEMS);
  const [hydrated, setHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OpexDraft | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<OpexDraft>({ description: "", amountUsd: "" });

  useEffect(() => {
    startTransition(() => {
      setItems(loadOpexLineItems());
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveOpexLineItems(items);
  }, [hydrated, items]);

  const totalYearly = useMemo(() => sumOpexYearly(items), [items]);

  const chartData = useMemo(
    () =>
      [...items]
        .sort((a, b) => b.amountUsd - a.amountUsd)
        .map((item) => ({
          id: item.id,
          label: truncateLabel(item.description),
          fullLabel: item.description,
          amount: item.amountUsd,
        })),
    [items],
  );

  function startEdit(item: OpexLineItem) {
    setIsAdding(false);
    setEditingId(item.id);
    setDraft({
      description: item.description,
      amountUsd: String(item.amountUsd),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function saveEdit() {
    if (!editingId || !draft) return;

    const description = draft.description.trim();
    if (!description) return;

    const amountUsd = parseOpexAmountInput(draft.amountUsd);
    setItems((current) =>
      current.map((item) =>
        item.id === editingId ? { ...item, description, amountUsd } : item,
      ),
    );
    cancelEdit();
  }

  function deleteItem(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    if (!window.confirm(`Delete "${item.description}"?`)) return;

    setItems((current) => current.filter((entry) => entry.id !== id));
    if (editingId === id) cancelEdit();
  }

  function startAdd() {
    cancelEdit();
    setIsAdding(true);
    setNewDraft({ description: "", amountUsd: "" });
  }

  function cancelAdd() {
    setIsAdding(false);
    setNewDraft({ description: "", amountUsd: "" });
  }

  function saveNew() {
    const description = newDraft.description.trim();
    if (!description) return;

    const amountUsd = parseOpexAmountInput(newDraft.amountUsd);
    setItems((current) => [
      ...current,
      { id: createOpexLineItemId(), description, amountUsd },
    ]);
    cancelAdd();
  }

  return (
    <div className="space-y-4">
      <section className={cn(panelClassName(), "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
              Financials · Operating expenditure
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Opex</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/60">
              Yearly operating costs for {OPEX_CLIENT_COUNT} clients. Edit line items to model
              subscription, platform, and compliance spend.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55">
            <Wallet className="h-4 w-4 text-emerald-300" />
            Based on {OPEX_CLIENT_COUNT} clients
          </div>
        </div>
      </section>

      <section className={cn(panelClassName(), "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-300" />
              <h3 className="text-sm font-semibold text-white">Total yearly OPEX</h3>
            </div>
            <p className="mt-1 text-xs text-white/45">
              Annual cost breakdown across {items.length} line items
            </p>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-emerald-200">
            {formatOpexAmount(totalYearly)}
          </p>
        </div>

        {chartData.length > 0 ? (
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={64}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                  tickFormatter={(value: number) => `$${(value / 1000).toFixed(value >= 1000 ? 0 : 1)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as { fullLabel?: string; amount?: number };
                    return (
                      <div className="rounded-xl border border-white/[0.08] bg-[#0D1B2A] px-3 py-2.5 shadow-2xl">
                        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
                          {row.fullLabel ?? label}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: payload[0]?.color ?? CHART_COLORS[0] }}
                          />
                          <span className="text-white/50">Yearly cost</span>
                          <span className="ml-auto font-mono text-white/90">
                            {formatOpexAmount(row.amount ?? 0)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </section>

      <section className={cn(panelClassName(), "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Cost line items</h3>
            <p className="mt-1 text-xs text-white/45">All figures are per year (USD)</p>
          </div>
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/25"
          >
            <Plus className="h-3.5 w-3.5" />
            New line item
          </button>
        </div>

        {isAdding ? (
          <div className="mt-4 rounded-xl border border-sky-400/25 bg-sky-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200/80">
              New cost line item
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem]">
              <input
                type="text"
                value={newDraft.description}
                onChange={(event) =>
                  setNewDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Cost description"
                className={inputClassName()}
              />
              <input
                type="text"
                inputMode="decimal"
                value={newDraft.amountUsd}
                onChange={(event) =>
                  setNewDraft((current) => ({ ...current, amountUsd: event.target.value }))
                }
                placeholder="Amount (USD)"
                className={inputClassName()}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveNew}
                disabled={!newDraft.description.trim()}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 text-[11px] font-semibold text-emerald-100 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={cancelAdd}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-[11px] font-semibold text-white/70"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
                <th className="px-3 py-2 font-medium">Cost description</th>
                <th className="px-3 py-2 font-medium text-right">Cost (per year)</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isEditing = editingId === item.id;

                if (isEditing && draft) {
                  return (
                    <tr key={item.id} className="border-b border-white/[0.05] bg-sky-500/5">
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          value={draft.description}
                          onChange={(event) =>
                            setDraft((current) =>
                              current ? { ...current, description: event.target.value } : current,
                            )
                          }
                          className={inputClassName()}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draft.amountUsd}
                          onChange={(event) =>
                            setDraft((current) =>
                              current ? { ...current, amountUsd: event.target.value } : current,
                            )
                          }
                          className={cn(inputClassName(), "text-right")}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10"
                            aria-label="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:bg-white/[0.04]"
                            aria-label="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-3 py-2.5 font-medium text-white/90">{item.description}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-white/80">
                      {formatOpexAmount(item.amountUsd)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                          aria-label={`Edit ${item.description}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-400/20 text-rose-200/80 hover:bg-rose-500/10"
                          aria-label={`Delete ${item.description}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-3 py-3 text-sm font-semibold text-white">Total yearly OPEX</td>
                <td className="px-3 py-3 text-right text-base font-semibold tabular-nums text-emerald-200">
                  {formatOpexAmount(totalYearly)}
                </td>
                <td className="px-3 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

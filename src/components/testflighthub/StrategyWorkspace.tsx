"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import {
  STRATEGY_COLUMNS,
  STRATEGY_PRIORITY_OPTIONS,
  getMatrice4tFeature,
  type StrategyCategory,
  type StrategyItem,
} from "@/lib/strategy-data";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

const ROW_GRID =
  "sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_3.5rem]";

function readOnlyFieldClassName() {
  return "flex min-h-[2.25rem] items-center rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] leading-snug text-white/85";
}

function matriceFeatureClassName() {
  return "flex min-h-[2.25rem] items-center rounded-xl border border-sky-400/15 bg-sky-500/[0.06] px-2.5 py-1.5 text-[11px] leading-snug text-sky-100/75";
}

function priorityClassName() {
  return "h-[2.5rem] w-full rounded-xl border border-white/10 bg-[#0b1524] px-2 text-[13px] text-white outline-none transition-colors focus:border-sky-400/50";
}

export default function StrategyWorkspace() {
  const [items, setItems] = useState<StrategyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const itemsByCategory = useMemo(() => {
    const grouped: Record<StrategyCategory, StrategyItem[]> = {
      surveying: [],
      inspection: [],
      media: [],
    };

    for (const item of items) {
      grouped[item.category].push(item);
    }

    for (const category of Object.keys(grouped) as StrategyCategory[]) {
      grouped[category].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return grouped;
  }, [items]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/strategy/items", { cache: "no-store" });
      const data = await readApiJson<{ items?: StrategyItem[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load strategy items");
      setItems(data.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load strategy items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadItems();
    });
  }, [loadItems]);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  async function persistItem(item: StrategyItem) {
    setSavingId(item.id);
    setError(null);

    try {
      const response = await fetch(`/api/strategy/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: item.priority }),
      });

      const data = await readApiJson<{ item?: StrategyItem; error?: string }>(response);
      if (!response.ok || !data.item) throw new Error(data.error ?? "Failed to save");

      setItems((current) => current.map((row) => (row.id === data.item!.id ? data.item! : row)));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  function patchItem(id: string, patch: Partial<Pick<StrategyItem, "priority">>) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      const updated = next.find((item) => item.id === id);
      if (!updated) return current;

      const timers = saveTimersRef.current;
      const existing = timers.get(id);
      if (existing) clearTimeout(existing);

      timers.set(
        id,
        setTimeout(() => {
          void persistItem(updated);
          timers.delete(id);
        }, 500),
      );

      return next;
    });
  }

  return (
    <section className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading strategy matrix…
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {STRATEGY_COLUMNS.map((column) => {
            const columnItems = itemsByCategory[column.id];

            return (
              <div
                key={column.id}
                className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_16px_48px_rgba(0,0,0,0.28)]"
              >
                <div className="border-b border-white/10 px-4 py-3 sm:px-5">
                  <h2 className="text-sm font-semibold leading-snug text-white sm:text-[15px]">
                    {column.title}
                  </h2>
                </div>

                <div
                  className={cn(
                    "hidden gap-2 border-b border-white/10 px-4 py-2 text-[9px] font-medium uppercase tracking-[0.12em] text-white/40 sm:grid sm:px-5",
                    ROW_GRID,
                  )}
                >
                  <span>Capability</span>
                  <span>Matrice 4T</span>
                  <span>Pri.</span>
                </div>

                <div className="divide-y divide-white/[0.06]">
                  {columnItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn("grid gap-2 px-4 py-2.5 sm:items-start sm:px-5", ROW_GRID)}
                    >
                      <div className={readOnlyFieldClassName()}>{item.label}</div>
                      <div className={matriceFeatureClassName()}>
                        {getMatrice4tFeature(item.category, item.label)}
                      </div>
                      <select
                        value={item.priority ?? ""}
                        onChange={(event) =>
                          patchItem(item.id, {
                            priority: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                        className={cn(priorityClassName(), savingId === item.id && "opacity-70")}
                        aria-label={`Priority for ${item.label}`}
                      >
                        <option value="">—</option>
                        {STRATEGY_PRIORITY_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          No strategy items found. Run{" "}
          <span className="font-mono">supabase/migrations/006_create_strategy_items.sql</span> in
          Supabase.
        </p>
      )}
    </section>
  );
}

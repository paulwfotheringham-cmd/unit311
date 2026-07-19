"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  MODULE_GO_LIVE_STATUSES,
  moduleGoLiveStatusClass,
  type ModuleGoLiveEntry,
  type ModuleGoLiveStatus,
} from "@/lib/module-go-live-data";
import { cn } from "@/lib/utils";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

export default function ModuleGoLiveWorkspace() {
  const [modules, setModules] = useState<ModuleGoLiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo(() => {
    const total = modules.length;
    let ready = 0;
    let needsWork = 0;
    let notStarted = 0;
    for (const row of modules) {
      if (row.status === "Ready") ready += 1;
      else if (row.status === "Needs Work") needsWork += 1;
      else notStarted += 1;
    }
    const completionPercent =
      total === 0 ? 0 : Math.round((ready / total) * 100);
    return { total, ready, needsWork, notStarted, completionPercent };
  }, [modules]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/module-go-live", { cache: "no-store" });
      const data = await readApiJson<{ modules?: ModuleGoLiveEntry[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load Module Go-Live register");
      setModules(data.modules ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load register");
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: ModuleGoLiveStatus) {
    setSavingId(id);
    setError(null);
    setMessage(null);
    const previous = modules;
    setModules((current) =>
      current.map((row) => (row.id === id ? { ...row, status } : row)),
    );

    try {
      const response = await fetch("/api/module-go-live", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await readApiJson<{ modules?: ModuleGoLiveEntry[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to save status");
      setModules(data.modules ?? previous);
      setMessage(`Updated ${id} → ${status}`);
    } catch (saveError) {
      setModules(previous);
      setError(saveError instanceof Error ? saveError.message : "Failed to save status");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Module Go-Live</h2>
        <p className="max-w-3xl text-sm text-white/55">
          Authoritative platform readiness register. Status only — Not Started, Needs Work, or Ready.
          Update after each module review.
        </p>
      </header>

      {!loading ? (
        <section
          aria-label="Module Go-Live summary"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">Total Modules</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-200/70">Ready</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-100">{summary.ready}</p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-amber-200/70">Needs Work</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-100">{summary.needsWork}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">Not Started</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white/80">{summary.notStarted}</p>
          </div>
          <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] uppercase tracking-[0.12em] text-sky-200/70">Overall Completion</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-100">
              {summary.completionPercent}%
            </p>
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-10 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Module Go-Live register…
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-[0.12em] text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Module</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 last:border-b-0">
                    <td className="px-4 py-3 font-mono text-xs text-sky-200/90">{row.id}</td>
                    <td className="px-4 py-3 text-white/90">{row.module}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={row.status}
                          disabled={savingId === row.id}
                          onChange={(event) =>
                            void updateStatus(row.id, event.target.value as ModuleGoLiveStatus)
                          }
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-colors",
                            "focus:border-sky-400/50 disabled:opacity-60",
                            "[&>option]:bg-white [&>option]:text-black",
                            moduleGoLiveStatusClass(row.status),
                          )}
                          aria-label={`Status for ${row.id}`}
                        >
                          {MODULE_GO_LIVE_STATUSES.map((status) => (
                            <option key={status} value={status} className="bg-white text-black">
                              {status}
                            </option>
                          ))}
                        </select>
                        {savingId === row.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white/45" />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

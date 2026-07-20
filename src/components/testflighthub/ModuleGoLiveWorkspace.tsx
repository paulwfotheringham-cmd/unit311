"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

import {
  DOMAIN_SHARED_IMPLEMENTATION_WARNINGS,
  domainGoLiveStatusClass,
  type DomainGoLiveEntry,
} from "@/lib/domain-go-live-data";
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
    return Promise.reject(
      new Error(response.ok ? "Invalid server response." : text.slice(0, 180)),
    );
  }
}

export default function ModuleGoLiveWorkspace() {
  const [modules, setModules] = useState<ModuleGoLiveEntry[]>([]);
  const [domains, setDomains] = useState<DomainGoLiveEntry[]>([]);
  const [coverageWarning, setCoverageWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingDomainId, setSavingDomainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});

  const moduleSummary = useMemo(() => {
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

  const domainSummary = useMemo(() => {
    let ready = 0;
    let inProgress = 0;
    let notStarted = 0;
    let blocked = 0;
    for (const row of domains) {
      if (row.status === "Ready") ready += 1;
      else if (row.status === "In Progress") inProgress += 1;
      else if (row.status === "Blocked") blocked += 1;
      else notStarted += 1;
    }
    return {
      total: domains.length,
      ready,
      inProgress,
      notStarted,
      blocked,
      completionPercent:
        domains.length === 0 ? 0 : Math.round((ready / domains.length) * 100),
    };
  }, [domains]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [moduleResponse, domainResponse] = await Promise.all([
        fetch("/api/module-go-live", { cache: "no-store" }),
        fetch("/api/domain-go-live", { cache: "no-store" }),
      ]);

      const moduleData = await readApiJson<{
        modules?: ModuleGoLiveEntry[];
        error?: string;
      }>(moduleResponse);
      if (!moduleResponse.ok) {
        throw new Error(moduleData.error ?? "Failed to load Module Go-Live register");
      }

      const domainData = await readApiJson<{
        domains?: DomainGoLiveEntry[];
        coverage?: {
          ok?: boolean;
          unmappedModuleIds?: string[];
          unknownDomainModuleIds?: string[];
          duplicateModuleIds?: string[];
        };
        error?: string;
      }>(domainResponse);
      if (!domainResponse.ok) {
        throw new Error(domainData.error ?? "Failed to load Domain Go-Live register");
      }

      setModules(moduleData.modules ?? []);
      setDomains(domainData.domains ?? []);

      const coverage = domainData.coverage;
      if (coverage && coverage.ok === false) {
        setCoverageWarning(
          [
            "Domain ↔ module catalogue drift detected.",
            coverage.unmappedModuleIds?.length
              ? `Unmapped: ${coverage.unmappedModuleIds.join(", ")}`
              : null,
            coverage.unknownDomainModuleIds?.length
              ? `Unknown: ${coverage.unknownDomainModuleIds.join(", ")}`
              : null,
            coverage.duplicateModuleIds?.length
              ? `Duplicates: ${coverage.duplicateModuleIds.join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join(" "),
        );
      } else {
        setCoverageWarning(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load register");
      setModules([]);
      setDomains([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
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
      const data = await readApiJson<{ modules?: ModuleGoLiveEntry[]; error?: string }>(
        response,
      );
      if (!response.ok) throw new Error(data.error ?? "Failed to save status");
      setModules(data.modules ?? previous);
      setMessage(`Updated ${id} → ${status}`);

      const domainResponse = await fetch("/api/domain-go-live", { cache: "no-store" });
      const domainData = await readApiJson<{ domains?: DomainGoLiveEntry[] }>(
        domainResponse,
      );
      if (domainResponse.ok) setDomains(domainData.domains ?? []);
    } catch (saveError) {
      setModules(previous);
      setError(saveError instanceof Error ? saveError.message : "Failed to save status");
    } finally {
      setSavingId(null);
    }
  }

  async function setDomainBlocked(domain: DomainGoLiveEntry, blocked: boolean) {
    setSavingDomainId(domain.id);
    setError(null);
    setMessage(null);

    let blockedReason = domain.blockedReason;
    if (blocked) {
      const entered = window.prompt(
        `Block ${domain.id} ${domain.name}. Reason (required):`,
        domain.blockedReason || "",
      );
      if (entered === null) {
        setSavingDomainId(null);
        return;
      }
      blockedReason = entered.trim();
      if (!blockedReason) {
        setError("A blocked reason is required.");
        setSavingDomainId(null);
        return;
      }
    }

    try {
      const response = await fetch("/api/domain-go-live", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: domain.id,
          blocked,
          blockedReason: blocked ? blockedReason : "",
          notes: domain.notes,
        }),
      });
      const data = await readApiJson<{
        domains?: DomainGoLiveEntry[];
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to update domain");
      setDomains(data.domains ?? []);
      setMessage(
        blocked
          ? `${domain.id} marked Blocked`
          : `${domain.id} Blocked cleared (status derived again)`,
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update domain");
    } finally {
      setSavingDomainId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Module Go-Live</h2>
        <p className="max-w-3xl text-sm text-white/55">
          Authoritative platform readiness register. Module status is the source of truth.
          Domain Go-Live is a derived roll-up (Ready / In Progress / Not Started) with optional
          Blocked overrides only.
        </p>
      </header>

      {!loading ? (
        <>
          <section
            aria-label="Domain Go-Live summary"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
          >
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">Domains</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                {domainSummary.total}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-200/70">
                Domains Ready
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-100">
                {domainSummary.ready}
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-amber-200/70">
                In Progress
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-100">
                {domainSummary.inProgress}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">Not Started</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white/80">
                {domainSummary.notStarted}
              </p>
            </div>
            <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-rose-200/70">Blocked</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-100">
                {domainSummary.blocked}
              </p>
            </div>
            <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-sky-200/70">
                Domain completion
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-100">
                {domainSummary.completionPercent}%
              </p>
            </div>
          </section>

          <section
            aria-label="Module Go-Live summary"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">Total Modules</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                {moduleSummary.total}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-200/70">Ready</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-100">
                {moduleSummary.ready}
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-amber-200/70">
                Needs Work
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-100">
                {moduleSummary.needsWork}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">Not Started</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white/80">
                {moduleSummary.notStarted}
              </p>
            </div>
            <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 sm:col-span-2 lg:col-span-1">
              <p className="text-[11px] uppercase tracking-[0.12em] text-sky-200/70">
                Module completion
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-100">
                {moduleSummary.completionPercent}%
              </p>
            </div>
          </section>
        </>
      ) : null}

      {coverageWarning ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {coverageWarning}
        </p>
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
          Loading Go-Live registers…
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/55">
              Domain Go-Live
            </h3>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <ul className="divide-y divide-white/5">
                {domains.map((domain) => {
                  const expanded = expandedDomains[domain.id] ?? false;
                  const Chevron = expanded ? ChevronDown : ChevronRight;
                  const warning = DOMAIN_SHARED_IMPLEMENTATION_WARNINGS[domain.id];
                  return (
                    <li key={domain.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          onClick={() =>
                            setExpandedDomains((current) => ({
                              ...current,
                              [domain.id]: !expanded,
                            }))
                          }
                          aria-expanded={expanded}
                        >
                          <Chevron className="h-4 w-4 shrink-0 text-white/45" />
                          <span className="font-mono text-xs text-sky-200/90">{domain.id}</span>
                          <span className="truncate text-sm text-white/90">{domain.name}</span>
                        </button>
                        <span
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs",
                            domainGoLiveStatusClass(domain.status),
                          )}
                        >
                          {domain.status}
                          {domain.status !== domain.derivedStatus
                            ? ` (derived ${domain.derivedStatus})`
                            : null}
                        </span>
                        <button
                          type="button"
                          disabled={savingDomainId === domain.id}
                          onClick={() => void setDomainBlocked(domain, !domain.blocked)}
                          className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/75 hover:bg-white/10 disabled:opacity-60"
                        >
                          {domain.blocked ? "Clear Blocked" : "Mark Blocked"}
                        </button>
                        {savingDomainId === domain.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white/45" />
                        ) : null}
                      </div>
                      {domain.blocked && domain.blockedReason ? (
                        <p className="mt-2 pl-6 text-xs text-rose-100/80">
                          Reason: {domain.blockedReason}
                        </p>
                      ) : null}
                      {warning ? (
                        <p className="mt-2 pl-6 text-xs text-amber-100/70">{warning}</p>
                      ) : null}
                      {expanded ? (
                        <ul className="mt-3 space-y-1 pl-6">
                          {domain.children.map((child) => (
                            <li
                              key={child.id}
                              className="flex flex-wrap items-center gap-2 text-xs text-white/70"
                            >
                              <span className="font-mono text-sky-200/80">{child.id}</span>
                              <span>{child.module}</span>
                              <span
                                className={cn(
                                  "rounded border px-1.5 py-0.5",
                                  moduleGoLiveStatusClass(child.status),
                                )}
                              >
                                {child.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/55">
              Modules
            </h3>
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
                                void updateStatus(
                                  row.id,
                                  event.target.value as ModuleGoLiveStatus,
                                )
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
                                <option
                                  key={status}
                                  value={status}
                                  className="bg-white text-black"
                                >
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
          </section>
        </>
      )}
    </div>
  );
}

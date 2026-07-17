"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import {
  REPRESENTATIVE_STATUS_OPTIONS,
  REPRESENTATIVE_TERRITORY_OPTIONS,
  REPRESENTATIVE_TYPE_OPTIONS,
  createBlankRepresentative,
  representativeStatusClass,
  type Representative,
} from "@/lib/representatives-data";
import {
  REP_DOCUMENTS,
  commissionSummaryForRep,
  commissionTrendForRep,
} from "@/lib/representatives-extended-data";
import { cn } from "@/lib/utils";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import DashboardTopTilesBar from "@/components/testflighthub/DashboardTopTilesBar";
import {
  DEFAULT_REPRESENTATIVES_TILE_LAYOUT,
  REPRESENTATIVES_DASHBOARD_TILES,
} from "@/lib/view-dashboard-tile-catalogs";
import { FileText, Plus, Trash2, Upload, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RepresentativesWorkspaceProps = {
  representatives: Representative[];
  selectedRepresentativeId: string;
  onSelectRepresentative: (id: string) => void;
  onRepresentativesChange: (representatives: Representative[]) => void;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

function formatEur(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function RepresentativesWorkspace({
  representatives,
  selectedRepresentativeId,
  onSelectRepresentative,
  onRepresentativesChange,
}: RepresentativesWorkspaceProps) {
  const { showDetail, openDetail, closeDetail } = useMobileDetailPanel();
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [customTerritories, setCustomTerritories] = useState<Record<string, string[]>>({});
  const [customTerritoryInput, setCustomTerritoryInput] = useState("");

  const selectedRepresentative = useMemo(
    () =>
      representatives.find((rep) => rep.id === selectedRepresentativeId) ?? representatives[0],
    [representatives, selectedRepresentativeId],
  );

  const repDocuments = selectedRepresentative
    ? (REP_DOCUMENTS[selectedRepresentative.id] ?? [])
    : [];

  const commissionSummary = selectedRepresentative
    ? commissionSummaryForRep(selectedRepresentative.id)
    : { paid: 0, outstanding: 0, upcoming: 0, rows: [] };

  const commissionTrend = selectedRepresentative
    ? commissionTrendForRep(selectedRepresentative.id)
    : [];

  const repCustomTerritories = selectedRepresentative
    ? (customTerritories[selectedRepresentative.id] ?? [])
    : [];

  useEffect(() => {
    startTransition(() => {
      setCustomTerritoryInput("");
    });
  }, [selectedRepresentativeId]);

  function updateRepresentative(updated: Representative) {
    onRepresentativesChange(
      representatives.map((rep) => (rep.id === updated.id ? updated : rep)),
    );
  }

  function handleAddRepresentative() {
    const next = createBlankRepresentative();
    onRepresentativesChange([next, ...representatives]);
    onSelectRepresentative(next.id);
    openDetail();
  }

  function handleDeleteRepresentative() {
    if (!selectedRepresentative) return;
    const label = selectedRepresentative.fullName || selectedRepresentative.companyName || "this rep";
    if (!window.confirm(`Delete "${label}"?`)) return;

    const remaining = representatives.filter((rep) => rep.id !== selectedRepresentative.id);
    onRepresentativesChange(remaining);
    onSelectRepresentative(remaining[0]?.id ?? "");
    setCustomTerritories((current) => {
      const next = { ...current };
      delete next[selectedRepresentative.id];
      return next;
    });
    if (remaining.length === 0) closeDetail();
  }

  function patchSelected(patch: Partial<Representative>) {
    if (!selectedRepresentative) return;
    updateRepresentative({ ...selectedRepresentative, ...patch });
  }

  function handleAddCustomTerritory() {
    if (!selectedRepresentative) return;
    const value = customTerritoryInput.trim();
    if (!value) return;

    setCustomTerritories((current) => {
      const existing = current[selectedRepresentative.id] ?? [];
      if (existing.some((item) => item.toLowerCase() === value.toLowerCase())) {
        return current;
      }
      return {
        ...current,
        [selectedRepresentative.id]: [...existing, value],
      };
    });
    setCustomTerritoryInput("");
  }

  function handleRemoveCustomTerritory(territory: string) {
    if (!selectedRepresentative) return;
    setCustomTerritories((current) => ({
      ...current,
      [selectedRepresentative.id]: (current[selectedRepresentative.id] ?? []).filter(
        (item) => item !== territory,
      ),
    }));
  }

  function handleImportCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;

      const imported = lines.slice(1).map((line, index) => {
        const [fullName = "", companyName = "", email = "", territory = "Iberia"] = line
          .split(",")
          .map((part) => part.trim());
        const rep = createBlankRepresentative();
        return {
          ...rep,
          id: `rep-import-${Date.now()}-${index}`,
          fullName: fullName || companyName || `Imported rep ${index + 1}`,
          companyName: companyName || fullName,
          email,
          territory: (REPRESENTATIVE_TERRITORY_OPTIONS.includes(territory as Representative["territory"])
            ? territory
            : "Iberia") as Representative["territory"],
        };
      });

      onRepresentativesChange([...representatives, ...imported]);
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <DashboardTopTilesBar
        storageKey="unit311-representatives-dashboard-tiles"
        catalog={REPRESENTATIVES_DASHBOARD_TILES}
        defaultLayout={DEFAULT_REPRESENTATIVES_TILE_LAYOUT}
        title="Representative key details"
        showCustomizeHint={false}
      />
      <ResponsiveMasterDetail
        showDetail={showDetail && !!selectedRepresentative}
        onBack={closeDetail}
          backLabel="Back to partners"
        master={
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Partners</h2>
                <p className="mt-1 text-xs text-white/45">
                  {representatives.length} representatives, distributors &amp; referral partners
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/25">
                  <Upload className="h-3.5 w-3.5" />
                  Import CSV
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
                </label>
                <button
                  type="button"
                  onClick={handleAddRepresentative}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add rep
                </button>
              </div>
            </div>

            {representatives.length === 0 ? (
              <p className="mt-6 text-sm text-white/45">
                No partners yet. Add your first representative, distributor, or referral partner.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {representatives.map((rep) => {
                  const selected = rep.id === selectedRepresentative?.id;

                  return (
                    <li key={rep.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectRepresentative(rep.id);
                          openDetail();
                        }}
                        className={cn(
                          "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                          selected
                            ? "border-sky-400/40 bg-sky-500/10 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {rep.fullName || "Unnamed representative"}
                            </p>
                            <p className="mt-1 truncate text-xs text-white/45">{rep.companyName}</p>
                            <p className="mt-0.5 text-[11px] text-white/35">
                              {rep.repType} · {rep.territory}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                              representativeStatusClass(rep.status),
                            )}
                          >
                            {rep.status}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        }
        detail={
          selectedRepresentative ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                      Representative record
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {selectedRepresentative.fullName || "New representative"}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">{selectedRepresentative.companyName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDocumentsOpen(true)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Documents
                    </button>
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                        representativeStatusClass(selectedRepresentative.status),
                      )}
                    >
                      {selectedRepresentative.status}
                    </span>
                    <button
                      type="button"
                      onClick={handleDeleteRepresentative}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-400/20 px-3 text-xs text-red-300 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Full name</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedRepresentative.fullName}
                      onChange={(event) => patchSelected({ fullName: event.target.value })}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <FieldLabel>Company / distributor</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedRepresentative.companyName}
                      onChange={(event) => patchSelected({ companyName: event.target.value })}
                      placeholder="Organisation name"
                    />
                  </div>
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <input
                      type="email"
                      className={inputClassName()}
                      value={selectedRepresentative.email}
                      onChange={(event) => patchSelected({ email: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Phone</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedRepresentative.phone}
                      onChange={(event) => patchSelected({ phone: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Type</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedRepresentative.repType}
                      onChange={(event) =>
                        patchSelected({ repType: event.target.value as Representative["repType"] })
                      }
                    >
                      {REPRESENTATIVE_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Territory</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedRepresentative.territory}
                      onChange={(event) =>
                        patchSelected({
                          territory: event.target.value as Representative["territory"],
                        })
                      }
                    >
                      {REPRESENTATIVE_TERRITORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex gap-2">
                      <input
                        className={cn(inputClassName(), "mt-0 flex-1")}
                        value={customTerritoryInput}
                        onChange={(event) => setCustomTerritoryInput(event.target.value)}
                        placeholder="Custom territory (e.g. Andalusia)"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddCustomTerritory();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomTerritory}
                        className="mt-0 inline-flex h-[38px] shrink-0 items-center rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.08]"
                      >
                        Add
                      </button>
                    </div>
                    {repCustomTerritories.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {repCustomTerritories.map((territory) => (
                          <li key={territory}>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200">
                              {territory}
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomTerritory(territory)}
                                className="rounded p-0.5 text-violet-200/70 transition-colors hover:bg-violet-500/20 hover:text-violet-100"
                                aria-label={`Remove ${territory}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Status</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedRepresentative.status}
                      onChange={(event) =>
                        patchSelected({ status: event.target.value as Representative["status"] })
                      }
                    >
                      {REPRESENTATIVE_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Notes</FieldLabel>
                    <textarea
                      rows={3}
                      className={cn(inputClassName(), "resize-y")}
                      value={selectedRepresentative.notes}
                      onChange={(event) => patchSelected({ notes: event.target.value })}
                      placeholder="Territory coverage, commission terms, key accounts…"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                    Commissions
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-white">Commission overview</h3>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-200/80">
                      Paid last month
                    </p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      {formatEur(commissionSummary.paid)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-amber-200/80">
                      Outstanding
                    </p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      {formatEur(commissionSummary.outstanding)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-400/25 bg-sky-500/10 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-sky-200/80">
                      Upcoming
                    </p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      {formatEur(commissionSummary.upcoming)}
                    </p>
                  </div>
                </div>

                {commissionSummary.rows.length === 0 ? (
                  <p className="mt-4 text-sm text-white/45">No commission rows for this representative.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-[#0b1524]/60 text-[10px] uppercase tracking-[0.12em] text-white/45">
                          <th className="px-4 py-2.5 font-medium">Client</th>
                          <th className="px-4 py-2.5 font-medium">Period</th>
                          <th className="px-4 py-2.5 font-medium">Amount</th>
                          <th className="px-4 py-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {commissionSummary.rows.map((row) => (
                          <tr key={`${row.client}-${row.period}`} className="text-white/75">
                            <td className="px-4 py-2.5 font-medium text-white">{row.client}</td>
                            <td className="px-4 py-2.5">{row.period}</td>
                            <td className="px-4 py-2.5">{formatEur(row.amountEur)}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                                  row.status === "Paid" &&
                                    "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
                                  row.status === "Outstanding" &&
                                    "border-amber-400/30 bg-amber-500/10 text-amber-200",
                                  row.status === "Upcoming" &&
                                    "border-sky-400/30 bg-sky-500/10 text-sky-200",
                                )}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {commissionTrend.length > 0 && (
                <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                      Commission trend
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-white">
                      Paid, outstanding & upcoming by period
                    </h3>
                  </div>
                  <div className="mt-4 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={commissionTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis
                          dataKey="period"
                          tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => `€${Math.round(Number(value) / 1000)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#0b1524",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 12,
                            color: "#f8fafc",
                          }}
                          formatter={(value) => formatEur(Number(value))}
                        />
                        <Legend wrapperStyle={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }} />
                        <Bar dataKey="paid" name="Paid" fill="#34d399" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="outstanding" name="Outstanding" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="upcoming" name="Upcoming" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
            </div>
          ) : null
        }
      />

      {documentsOpen && selectedRepresentative && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rep-documents-title"
            className="flex max-h-[min(80vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b1220] shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p
                  id="rep-documents-title"
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]"
                >
                  Documents
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {selectedRepresentative.fullName || selectedRepresentative.companyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentsOpen(false)}
                className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {repDocuments.length === 0 ? (
                <p className="text-sm text-white/45">No documents on file for this representative.</p>
              ) : (
                <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
                  {repDocuments.map((doc) => (
                    <li key={doc.id} className="flex items-start gap-3 px-4 py-3">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-sky-300/80" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{doc.title}</p>
                        <p className="mt-0.5 text-xs text-white/45">
                          {doc.type} · Updated {doc.updatedAt}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

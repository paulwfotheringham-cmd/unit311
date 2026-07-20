"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import {
  buildReportFromDraft,
  createBlankReportDraft,
  FINANCIAL_REPORT_CURRENCIES,
  FINANCIAL_REPORT_DEPARTMENTS,
  FINANCIAL_REPORT_ORGANISATIONS,
  FINANCIAL_REPORT_PERIOD_KINDS,
  FINANCIAL_REPORT_PROJECTS,
  FINANCIAL_REPORT_TYPES,
  formatBadgeClass,
  periodLabelForKind,
  reportStatusClass,
  SEED_FINANCIAL_REPORTS,
  type CreateReportDraft,
  type FinancialReportFormat,
  type FinancialReportPeriodKind,
  type FinancialReportRecord,
} from "@/lib/financial-reports-mock-data";
import { cn } from "@/lib/utils";

type LibrarySortKey = "category" | "period" | "createdBy";
type LibrarySortDirection = "asc" | "desc";

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

function toastAction(label: string) {
  return `${label} (demo — no file generated)`;
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function formatHistoryWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

function sortValueForKey(report: FinancialReportRecord, key: LibrarySortKey) {
  if (key === "category") return report.category;
  if (key === "createdBy") return report.createdBy;
  // Period: prefer human label, fall back to kind for stable grouping.
  return `${report.periodLabel} ${report.periodKind}`;
}

function SortableHeader({
  label,
  columnKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  columnKey: LibrarySortKey;
  activeKey: LibrarySortKey | null;
  direction: LibrarySortDirection;
  onSort: (key: LibrarySortKey) => void;
}) {
  const active = activeKey === columnKey;
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th className="px-3 py-2.5 font-medium">
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "inline-flex items-center gap-1.5 uppercase tracking-[0.12em] transition-colors",
          active ? "text-sky-200" : "text-white/40 hover:text-white/70",
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      </button>
    </th>
  );
}

const WIZARD_STEPS = [
  "Report type",
  "Period",
  "Options",
  "Output",
  "Summary",
] as const;

export default function FinancialReportsWorkspace() {
  const [reports, setReports] = useState<FinancialReportRecord[]>(() => [...SEED_FINANCIAL_REPORTS]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<LibrarySortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<LibrarySortDirection>("asc");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [draft, setDraft] = useState<CreateReportDraft>(() => createBlankReportDraft());
  const [editingId, setEditingId] = useState<string | null>(null);

  const selected = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const sortedReports = useMemo(() => {
    if (!sortKey) return reports;
    const ordered = [...reports];
    ordered.sort((a, b) => {
      const result = compareText(sortValueForKey(a, sortKey), sortValueForKey(b, sortKey));
      return sortDirection === "asc" ? result : -result;
    });
    return ordered;
  }, [reports, sortKey, sortDirection]);

  function toggleSort(key: LibrarySortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  function flash(message: string) {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2800);
  }

  function openCreate() {
    setEditingId(null);
    setDraft(createBlankReportDraft());
    setWizardStep(0);
    setWizardOpen(true);
    setRowMenuId(null);
  }

  function openEdit(report: FinancialReportRecord) {
    setEditingId(report.id);
    setDraft({
      reportType: report.reportType,
      periodKind: report.periodKind,
      periodLabel: report.periodLabel,
      dateFrom: report.dateFrom ?? "2026-06-01",
      dateTo: report.dateTo ?? "2026-06-30",
      organisation: report.organisation,
      department: report.department,
      project: report.project,
      currency: report.currency,
      includeCharts: report.includeCharts,
      includeNotes: report.includeNotes,
      maturity: report.maturity,
      outputs: [...report.formats],
      name: report.name,
    });
    setWizardStep(0);
    setWizardOpen(true);
    setRowMenuId(null);
  }

  function closeWizard() {
    setWizardOpen(false);
    setEditingId(null);
    setDraft(createBlankReportDraft());
    setWizardStep(0);
  }

  function patchDraft(patch: Partial<CreateReportDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function setPeriodKind(kind: FinancialReportPeriodKind) {
    patchDraft({
      periodKind: kind,
      periodLabel: periodLabelForKind(kind),
    });
  }

  function toggleOutput(format: FinancialReportFormat) {
    setDraft((current) => {
      const has = current.outputs.includes(format);
      const outputs = has
        ? current.outputs.filter((item) => item !== format)
        : [...current.outputs, format];
      return { ...current, outputs: outputs.length > 0 ? outputs : current.outputs };
    });
  }

  function canAdvanceWizard() {
    if (wizardStep === 0) return Boolean(draft.reportType);
    if (wizardStep === 1) {
      if (draft.periodKind === "Custom") return Boolean(draft.dateFrom && draft.dateTo);
      return Boolean(draft.periodLabel.trim());
    }
    if (wizardStep === 3) return draft.outputs.length > 0;
    return true;
  }

  function commitWizard(mode: "generate" | "template") {
    if (!draft.reportType) return;
    const maturity = mode === "template" ? "Draft" : draft.maturity;
    const nextDraft = {
      ...draft,
      maturity,
      name:
        draft.name.trim() ||
        `${draft.reportType}${draft.periodLabel ? ` — ${draft.periodLabel}` : ""}`,
    };

    if (editingId) {
      setReports((current) =>
        current.map((report) => {
          if (report.id !== editingId) return report;
          const rebuilt = buildReportFromDraft(nextDraft, report.id);
          return {
            ...rebuilt,
            createdBy: report.createdBy,
            history:
              mode === "generate"
                ? [
                    {
                      id: newId("gen"),
                      generatedAt: new Date().toISOString(),
                      generatedBy: "You",
                      format: rebuilt.primaryFormat,
                      status: "Ready" as const,
                      note: "Regenerated from wizard",
                    },
                    ...report.history,
                  ]
                : report.history,
            lastGenerated: mode === "generate" ? "Today" : report.lastGenerated,
            status: mode === "generate" ? "Ready" : rebuilt.status,
          };
        }),
      );
      setSelectedId(editingId);
      flash(mode === "generate" ? "Report updated and generated (demo)." : "Report template saved (demo).");
    } else {
      const id = newId("rpt");
      const created = buildReportFromDraft(nextDraft, id);
      if (mode === "template") {
        created.status = "Draft";
        created.lastGenerated = null;
        created.history = [];
        created.maturity = "Draft";
      }
      setReports((current) => [created, ...current]);
      setSelectedId(id);
      flash(
        mode === "generate"
          ? "Report created and generated (demo)."
          : "Report template saved to library (demo).",
      );
    }

    closeWizard();
  }

  function generateReport(report: FinancialReportRecord) {
    const stamp = new Date().toISOString();
    setReports((current) =>
      current.map((item) =>
        item.id === report.id
          ? {
              ...item,
              status: "Ready",
              lastGenerated: "Today",
              maturity: "Final",
              history: [
                {
                  id: newId("gen"),
                  generatedAt: stamp,
                  generatedBy: "You",
                  format: item.primaryFormat,
                  status: "Ready",
                  note: "Manual generate",
                },
                ...item.history,
              ],
            }
          : item,
      ),
    );
    flash(toastAction(`Generated ${report.name}`));
    setRowMenuId(null);
  }

  function duplicateReport(report: FinancialReportRecord) {
    const id = newId("rpt");
    const copy: FinancialReportRecord = {
      ...report,
      id,
      name: `${report.name} (Copy)`,
      createdBy: "You",
      lastGenerated: null,
      status: "Draft",
      maturity: "Draft",
      history: [],
    };
    setReports((current) => [copy, ...current]);
    setSelectedId(id);
    flash(`Duplicated “${report.name}”.`);
    setRowMenuId(null);
  }

  function deleteReport(report: FinancialReportRecord) {
    setReports((current) => current.filter((item) => item.id !== report.id));
    if (selectedId === report.id) setSelectedId(null);
    flash(`Deleted “${report.name}”.`);
    setRowMenuId(null);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              Financials
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">Financial Reports</h2>
            <p className="mt-1 max-w-2xl text-sm text-white/55">
              Generate, manage and export financial reports across your organisation.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Report
          </button>
        </div>
        {actionMessage ? (
          <p className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            {actionMessage}
          </p>
        ) : null}
      </section>

      <div className={cn("grid gap-5", selected ? "xl:grid-cols-[minmax(0,1fr)_22rem]" : "")}>
        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                Report library
              </p>
              <h3 className="mt-1 text-base font-semibold text-white">
                {reports.length} reports in workspace
              </h3>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0b1524]/40">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Report Name</th>
                  <SortableHeader
                    label="Category"
                    columnKey="category"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Reporting Period"
                    columnKey="period"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Created By"
                    columnKey="createdBy"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <th className="px-3 py-2.5 font-medium">Last Generated</th>
                  <th className="px-3 py-2.5 font-medium">Format</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sortedReports.map((report) => {
                  const active = report.id === selectedId;
                  return (
                    <tr
                      key={report.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-white/[0.03]",
                        active && "bg-sky-500/[0.07]",
                      )}
                      onClick={() => {
                        setSelectedId(report.id);
                        setRowMenuId(null);
                      }}
                    >
                      <td className="px-3 py-3">
                        <p className="font-semibold text-white">{report.name}</p>
                        <p className="mt-0.5 text-[11px] text-white/40">{report.reportType}</p>
                      </td>
                      <td className="px-3 py-3 text-white/65">{report.category}</td>
                      <td className="px-3 py-3">
                        <p className="text-white/75">{report.periodLabel}</p>
                        <p className="text-[11px] text-white/40">{report.periodKind}</p>
                      </td>
                      <td className="px-3 py-3 text-white/65">{report.createdBy}</td>
                      <td className="px-3 py-3 text-white/55">{report.lastGenerated ?? "—"}</td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                            formatBadgeClass(report.primaryFormat),
                          )}
                        >
                          {report.primaryFormat}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                            reportStatusClass(report.status),
                          )}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="relative px-3 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          aria-label={`Actions for ${report.name}`}
                          onClick={() =>
                            setRowMenuId((current) => (current === report.id ? null : report.id))
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {rowMenuId === report.id ? (
                          <div className="absolute right-3 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-white/15 bg-[#0b1524] py-1 shadow-2xl">
                            {(
                              [
                                {
                                  label: "Generate",
                                  icon: RefreshCw,
                                  onClick: () => generateReport(report),
                                },
                                {
                                  label: "View",
                                  icon: Eye,
                                  onClick: () => {
                                    setSelectedId(report.id);
                                    setRowMenuId(null);
                                  },
                                },
                                {
                                  label: "Download PDF",
                                  icon: FileText,
                                  onClick: () => {
                                    flash(toastAction("Download PDF"));
                                    setRowMenuId(null);
                                  },
                                },
                                {
                                  label: "Download Excel",
                                  icon: FileSpreadsheet,
                                  onClick: () => {
                                    flash(toastAction("Download Excel"));
                                    setRowMenuId(null);
                                  },
                                },
                                {
                                  label: "Edit",
                                  icon: Pencil,
                                  onClick: () => openEdit(report),
                                },
                                {
                                  label: "Duplicate",
                                  icon: Copy,
                                  onClick: () => duplicateReport(report),
                                },
                                {
                                  label: "Delete",
                                  icon: Trash2,
                                  onClick: () => deleteReport(report),
                                  danger: true,
                                },
                              ] as const
                            ).map((action) => (
                              <button
                                key={action.label}
                                type="button"
                                onClick={action.onClick}
                                className={cn(
                                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/[0.06]",
                                  "danger" in action && action.danger
                                    ? "text-rose-200"
                                    : "text-white/80",
                                )}
                              >
                                <action.icon className="h-3.5 w-3.5 opacity-80" />
                                {action.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {selected ? (
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                    Report detail
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-white">{selected.name}</h3>
                </div>
                <button
                  type="button"
                  aria-label="Close detail"
                  onClick={() => setSelectedId(null)}
                  className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <DetailRow label="Category" value={selected.category} />
                <DetailRow label="Type" value={selected.reportType} />
                <DetailRow
                  label="Period"
                  value={`${selected.periodLabel} (${selected.periodKind})`}
                />
                <DetailRow label="Created by" value={selected.createdBy} />
                <DetailRow label="Last generated" value={selected.lastGenerated ?? "Never"} />
                <DetailRow label="Status" value={selected.status} />
                <DetailRow label="Organisation" value={selected.organisation} />
                <DetailRow label="Department" value={selected.department} />
                <DetailRow label="Project" value={selected.project} />
                <DetailRow label="Currency" value={selected.currency} />
                <DetailRow
                  label="Options"
                  value={[
                    selected.includeCharts ? "Charts" : null,
                    selected.includeNotes ? "Notes" : null,
                    selected.maturity,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Description
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/60">{selected.description}</p>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Output formats
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.formats.map((format) => (
                    <span
                      key={format}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                        formatBadgeClass(format),
                      )}
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Generation history
                </p>
                {selected.history.length === 0 ? (
                  <p className="mt-2 text-xs text-white/40">No generations yet.</p>
                ) : (
                  <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                    {selected.history.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg border border-white/10 bg-[#0b1524]/55 px-2.5 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-white/80">
                            {entry.format}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {formatHistoryWhen(entry.generatedAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-white/45">
                          {entry.generatedBy}
                          {entry.note ? ` · ${entry.note}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <ActionButton onClick={() => generateReport(selected)} icon={RefreshCw}>
                  Generate Again
                </ActionButton>
                <ActionButton onClick={() => openEdit(selected)} icon={Pencil}>
                  Edit
                </ActionButton>
                <ActionButton onClick={() => duplicateReport(selected)} icon={Copy}>
                  Duplicate
                </ActionButton>
                <ActionButton
                  onClick={() => deleteReport(selected)}
                  icon={Trash2}
                  tone="danger"
                >
                  Delete
                </ActionButton>
                <ActionButton
                  onClick={() => flash(toastAction("Download PDF"))}
                  icon={Download}
                >
                  Download PDF
                </ActionButton>
                <ActionButton
                  onClick={() => flash(toastAction("Download Excel"))}
                  icon={FileSpreadsheet}
                >
                  Download Excel
                </ActionButton>
              </div>
            </section>
          </aside>
        ) : null}
      </div>

      {wizardOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#020617]/75 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-report-title"
            className="flex max-h-[min(92dvh,44rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0a1422] shadow-[0_32px_80px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                  {editingId ? "Edit report" : "Create report"}
                </p>
                <h3 id="create-report-title" className="mt-1 text-base font-semibold text-white">
                  {WIZARD_STEPS[wizardStep]}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeWizard}
                className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-white/10 px-4 py-3 sm:px-5">
              <ol className="flex flex-wrap gap-2">
                {WIZARD_STEPS.map((label, index) => (
                  <li
                    key={label}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
                      index === wizardStep
                        ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
                        : index < wizardStep
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 text-white/40",
                    )}
                  >
                    {index + 1}. {label}
                  </li>
                ))}
              </ol>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {wizardStep === 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {FINANCIAL_REPORT_TYPES.map((type) => {
                    const active = draft.reportType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          patchDraft({
                            reportType: type,
                            name: draft.name || type,
                          })
                        }
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors",
                          active
                            ? "border-sky-400/45 bg-sky-500/15 text-sky-100"
                            : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:bg-white/[0.04]",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          {type}
                          {active ? <Check className="h-4 w-4 text-sky-300" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {wizardStep === 1 ? (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {FINANCIAL_REPORT_PERIOD_KINDS.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setPeriodKind(kind)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                          draft.periodKind === kind
                            ? "border-sky-400/45 bg-sky-500/15 text-sky-100"
                            : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20",
                        )}
                      >
                        {kind === "Yearly" ? "Year" : kind}
                      </button>
                    ))}
                  </div>
                  {draft.periodKind === "Custom" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Date from</FieldLabel>
                        <input
                          type="date"
                          className={inputClassName()}
                          value={draft.dateFrom}
                          onChange={(event) => patchDraft({ dateFrom: event.target.value })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Date to</FieldLabel>
                        <input
                          type="date"
                          className={inputClassName()}
                          value={draft.dateTo}
                          onChange={(event) => patchDraft({ dateTo: event.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <FieldLabel>Period label</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={draft.periodLabel}
                        onChange={(event) => patchDraft({ periodLabel: event.target.value })}
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {wizardStep === 2 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Organisation</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={draft.organisation}
                      onChange={(event) => patchDraft({ organisation: event.target.value })}
                    >
                      {FINANCIAL_REPORT_ORGANISATIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Department</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={draft.department}
                      onChange={(event) => patchDraft({ department: event.target.value })}
                    >
                      {FINANCIAL_REPORT_DEPARTMENTS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Project</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={draft.project}
                      onChange={(event) => patchDraft({ project: event.target.value })}
                    >
                      {FINANCIAL_REPORT_PROJECTS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Currency</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={draft.currency}
                      onChange={(event) => patchDraft({ currency: event.target.value })}
                    >
                      {FINANCIAL_REPORT_CURRENCIES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-white/75">
                    <input
                      type="checkbox"
                      checked={draft.includeCharts}
                      onChange={(event) => patchDraft({ includeCharts: event.target.checked })}
                      className="rounded border-white/20"
                    />
                    Include charts
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-white/75">
                    <input
                      type="checkbox"
                      checked={draft.includeNotes}
                      onChange={(event) => patchDraft({ includeNotes: event.target.checked })}
                      className="rounded border-white/20"
                    />
                    Include notes
                  </label>
                  <div className="sm:col-span-2">
                    <FieldLabel>Maturity</FieldLabel>
                    <div className="mt-1.5 flex gap-2">
                      {(["Draft", "Final"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => patchDraft({ maturity: value })}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-sm font-medium",
                            draft.maturity === value
                              ? "border-sky-400/45 bg-sky-500/15 text-sky-100"
                              : "border-white/10 text-white/65",
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {wizardStep === 3 ? (
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Output formats</FieldLabel>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["PDF", "Excel", "CSV"] as FinancialReportFormat[]).map((format) => {
                        const active = draft.outputs.includes(format);
                        return (
                          <button
                            key={format}
                            type="button"
                            onClick={() => toggleOutput(format)}
                            className={cn(
                              "rounded-xl border px-3 py-2 text-sm font-medium",
                              active
                                ? "border-sky-400/45 bg-sky-500/15 text-sky-100"
                                : "border-white/10 text-white/65",
                            )}
                          >
                            {format}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0b1524]/60 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                      Preview
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {draft.reportType ?? "Report"} · {draft.periodLabel || draft.periodKind}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {draft.organisation} · {draft.currency} · {draft.outputs.join(", ")}
                    </p>
                    <div className="mt-3 h-24 rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-3">
                      <div className="h-2 w-2/3 rounded bg-white/10" />
                      <div className="mt-2 h-2 w-1/2 rounded bg-white/10" />
                      <div className="mt-2 h-2 w-3/4 rounded bg-white/10" />
                      <div className="mt-4 flex gap-2">
                        <div className="h-8 flex-1 rounded bg-sky-500/15" />
                        <div className="h-8 flex-1 rounded bg-emerald-500/15" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Report name</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={draft.name}
                      onChange={(event) => patchDraft({ name: event.target.value })}
                      placeholder={draft.reportType ?? "Report name"}
                    />
                  </div>
                </div>
              ) : null}

              {wizardStep === 4 ? (
                <div className="space-y-2 rounded-xl border border-white/10 bg-[#0b1524]/55 p-4 text-sm">
                  <SummaryLine label="Type" value={draft.reportType ?? "—"} />
                  <SummaryLine
                    label="Period"
                    value={
                      draft.periodKind === "Custom"
                        ? `${draft.dateFrom} → ${draft.dateTo}`
                        : `${draft.periodLabel} (${draft.periodKind})`
                    }
                  />
                  <SummaryLine label="Organisation" value={draft.organisation} />
                  <SummaryLine label="Department" value={draft.department} />
                  <SummaryLine label="Project" value={draft.project} />
                  <SummaryLine label="Currency" value={draft.currency} />
                  <SummaryLine
                    label="Options"
                    value={[
                      draft.includeCharts ? "Charts" : null,
                      draft.includeNotes ? "Notes" : null,
                      draft.maturity,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <SummaryLine label="Outputs" value={draft.outputs.join(", ")} />
                  <SummaryLine
                    label="Name"
                    value={
                      draft.name.trim() ||
                      `${draft.reportType ?? "Report"}${draft.periodLabel ? ` — ${draft.periodLabel}` : ""}`
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={closeWizard}
                className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/65 hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <div className="flex flex-wrap gap-2">
                {wizardStep > 0 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((step) => Math.max(0, step - 1))}
                    className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/[0.05]"
                  >
                    Back
                  </button>
                ) : null}
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <button
                    type="button"
                    disabled={!canAdvanceWizard()}
                    onClick={() => setWizardStep((step) => Math.min(WIZARD_STEPS.length - 1, step + 1))}
                    className="rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 disabled:opacity-40"
                  >
                    Continue
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => commitWizard("template")}
                      className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/[0.05]"
                    >
                      Save Template
                    </button>
                    <button
                      type="button"
                      onClick={() => commitWizard("generate")}
                      className="rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200"
                    >
                      Generate Report
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className="text-right text-xs font-medium text-white/80">{value}</span>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-2 last:border-0">
      <span className="text-xs text-white/45">{label}</span>
      <span className="text-right text-xs font-medium text-white/85">{value}</span>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  icon: Icon,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-semibold transition-colors",
        tone === "danger"
          ? "border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
          : "border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/[0.08]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
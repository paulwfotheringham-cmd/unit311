"use client";

import { useMemo, useState } from "react";
import { Copy, Download, FileSpreadsheet, FileText, Pencil, Trash2 } from "lucide-react";

import {
  HR_REPORT_KIND_DESCRIPTIONS,
  HR_REPORT_KIND_LABELS,
  HR_REPORT_KINDS,
  HR_REPORT_OUTPUT_LABELS,
  HR_REPORT_OUTPUTS,
  defaultReportName,
  emptyHrReportFilters,
  sampleReportPreview,
  type HrReportFilters,
  type HrReportKind,
  type HrReportOutput,
  type HrSavedReport,
} from "@/lib/hr-reports-data";
import {
  deleteHrReport,
  duplicateHrReport,
  generateHrReport,
  updateHrReport,
} from "@/lib/hr-mock-store";
import { useHrMockStore } from "./useHrMockStore";
import {
  HrFieldLabel,
  hrInputClass,
  hrPrimaryButtonClass,
  HrSection,
  hrSecondaryButtonClass,
} from "./hr-ui";

type WizardStep = 1 | 2 | 3 | 4;

type ReportActionVariant = "edit" | "duplicate" | "pdf" | "excel" | "delete";

function reportActionButtonClass(variant: ReportActionVariant) {
  const base =
    "inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors";
  switch (variant) {
    case "edit":
      return `${base} border-sky-400/40 bg-sky-500/15 text-sky-100 hover:border-sky-300/55 hover:bg-sky-500/25`;
    case "duplicate":
      return `${base} border-violet-400/40 bg-violet-500/15 text-violet-100 hover:border-violet-300/55 hover:bg-violet-500/25`;
    case "pdf":
      return `${base} border-amber-400/40 bg-amber-500/15 text-amber-100 hover:border-amber-300/55 hover:bg-amber-500/25`;
    case "excel":
      return `${base} border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/55 hover:bg-emerald-500/25`;
    case "delete":
      return `${base} border-rose-400/40 bg-rose-500/15 text-rose-100 hover:border-rose-300/55 hover:bg-rose-500/25`;
  }
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildExportContent(report: HrSavedReport) {
  const header = [
    `Report: ${report.name}`,
    `Kind: ${HR_REPORT_KIND_LABELS[report.kind]}`,
    `Generated: ${report.createdAt}`,
    `Rows: ${report.rowCount}`,
    "",
    ...report.previewLines,
  ];
  return header.join("\n");
}

function previewDataRowCount(lines: string[]) {
  const separator = lines.indexOf("");
  return separator >= 0 ? lines.length - separator - 1 : Math.max(0, lines.length - 1);
}

function formatReportTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export default function HrReportsWorkspace({
  initialEmployeeId = "",
}: {
  initialEmployeeId?: string;
}) {
  const mock = useHrMockStore();
  const [wizardOpen, setWizardOpen] = useState(Boolean(initialEmployeeId));
  const [step, setStep] = useState<WizardStep>(1);
  const [kind, setKind] = useState<HrReportKind>("employee_directory");
  const [output, setOutput] = useState<HrReportOutput>("pdf");
  const [filters, setFilters] = useState<HrReportFilters>(() => ({
    ...emptyHrReportFilters(),
    employeeId: initialEmployeeId,
  }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>([]);

  const editing = useMemo(
    () => mock.reports.find((report) => report.id === editingId) ?? null,
    [mock.reports, editingId],
  );

  function openWizard() {
    setWizardOpen(true);
    setStep(1);
    setKind("employee_directory");
    setOutput("pdf");
    setFilters({ ...emptyHrReportFilters(), employeeId: initialEmployeeId });
    setPreview([]);
  }

  function buildPreviewLines() {
    return sampleReportPreview(kind, filters);
  }

  return (
    <div className="space-y-5">
      <HrSection
        title="HR Reports"
        subtitle="Generate, store, and download workforce reports."
        actions={
          <button type="button" className={hrPrimaryButtonClass()} onClick={openWizard}>
            Generate
          </button>
        }
      >
        {mock.reports.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
            <p className="text-sm font-medium text-white/80">No reports in history yet</p>
            <p className="mt-2 text-sm text-white/45">
              Generate a workforce report to store it here for download and reuse.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-[10px] uppercase tracking-[0.12em] text-white/45">
                <tr>
                  <th className="px-3 py-2.5">Report</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Output</th>
                  <th className="px-3 py-2.5">Rows</th>
                  <th className="px-3 py-2.5">Generated</th>
                  <th className="px-3 py-2.5">By</th>
                  <th className="px-3 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mock.reports.map((report) => (
                  <tr key={report.id} className="border-t border-white/10 hover:bg-white/[0.02]">
                    <td className="px-3 py-3 font-medium text-white">{report.name}</td>
                    <td className="px-3 py-3 text-white/65">{HR_REPORT_KIND_LABELS[report.kind]}</td>
                    <td className="px-3 py-3 text-white/65">
                      {HR_REPORT_OUTPUT_LABELS[report.output]}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-white/65">{report.rowCount}</td>
                    <td className="px-3 py-3 tabular-nums text-white/65">
                      {formatReportTimestamp(report.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-white/65">{report.createdBy}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className={reportActionButtonClass("edit")}
                        onClick={() => {
                          setEditingId(report.id);
                          setWizardOpen(false);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className={reportActionButtonClass("duplicate")}
                        onClick={() => duplicateHrReport(report.id)}
                      >
                        <Copy className="h-3 w-3" />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className={reportActionButtonClass("pdf")}
                        onClick={() =>
                          downloadBlob(
                            `${report.name.replace(/\s+/g, "_")}.pdf.txt`,
                            buildExportContent(report),
                            "application/pdf",
                          )
                        }
                      >
                        <FileText className="h-3 w-3" />
                        PDF
                      </button>
                      <button
                        type="button"
                        className={reportActionButtonClass("excel")}
                        onClick={() =>
                          downloadBlob(
                            `${report.name.replace(/\s+/g, "_")}.csv`,
                            buildExportContent(report),
                            "text/csv",
                          )
                        }
                      >
                        <FileSpreadsheet className="h-3 w-3" />
                        Excel
                      </button>
                      <button
                        type="button"
                        className={reportActionButtonClass("delete")}
                        onClick={() => deleteHrReport(report.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HrSection>

      {editing ? (
        <HrSection title="Edit report" subtitle={editing.name}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <HrFieldLabel>Name</HrFieldLabel>
              <input
                className={hrInputClass()}
                value={editing.name}
                onChange={(event) => updateHrReport(editing.id, { name: event.target.value })}
              />
            </div>
            <button
              type="button"
              className={hrSecondaryButtonClass()}
              onClick={() => setEditingId(null)}
            >
              Done
            </button>
          </div>
        </HrSection>
      ) : null}

      {wizardOpen ? (
        <HrSection
          title="Report wizard"
          subtitle={`Step ${step} of 4`}
          actions={
            <button
              type="button"
              className={hrSecondaryButtonClass()}
              onClick={() => setWizardOpen(false)}
            >
              Close
            </button>
          }
        >
          {step === 1 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {HR_REPORT_KINDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setKind(item)}
                  className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                    kind === item
                      ? "border-sky-400/50 bg-sky-500/15"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      kind === item ? "text-white" : "text-white/85"
                    }`}
                  >
                    {HR_REPORT_KIND_LABELS[item]}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                    {HR_REPORT_KIND_DESCRIPTIONS[item]}
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["Department", "department"],
                  ["Location", "location"],
                  ["Manager", "manager"],
                  ["Role", "role"],
                  ["Employment type", "employmentType"],
                ] as const
              ).map(([label, key]) => (
                <div key={key}>
                  <HrFieldLabel>{label}</HrFieldLabel>
                  <input
                    className={hrInputClass()}
                    value={filters[key]}
                    placeholder="all"
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, [key]: event.target.value || "all" }))
                    }
                  />
                </div>
              ))}
              <div>
                <HrFieldLabel>Date from</HrFieldLabel>
                <input
                  type="date"
                  className={hrInputClass()}
                  value={filters.dateFrom}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, dateFrom: event.target.value }))
                  }
                />
              </div>
              <div>
                <HrFieldLabel>Date to</HrFieldLabel>
                <input
                  type="date"
                  className={hrInputClass()}
                  value={filters.dateTo}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, dateTo: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {HR_REPORT_OUTPUTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setOutput(item)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                      output === item
                        ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
                        : "border-white/15 text-white/65"
                    }`}
                  >
                    {HR_REPORT_OUTPUT_LABELS[item]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={hrSecondaryButtonClass()}
                onClick={() => setPreview(buildPreviewLines())}
              >
                <Download className="h-3.5 w-3.5" />
                Preview
              </button>
              {preview.length ? (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                    Report preview
                  </p>
                  <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1524] p-3 font-mono text-xs leading-relaxed text-white/70">
                    {preview.join("\n")}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3">
              <p className="text-sm text-white/70">
                Ready to generate <span className="text-white">{defaultReportName(kind)}</span> as{" "}
                {HR_REPORT_OUTPUT_LABELS[output]}.
              </p>
              <button
                type="button"
                className={hrPrimaryButtonClass()}
                onClick={() => {
                  const lines = preview.length ? preview : buildPreviewLines();
                  generateHrReport({
                    kind,
                    output,
                    filters,
                    previewLines: lines,
                    rowCount: previewDataRowCount(lines),
                  });
                  setWizardOpen(false);
                }}
              >
                Generate and store
              </button>
            </div>
          ) : null}

          <div className="mt-4 flex justify-between gap-2">
            <button
              type="button"
              className={hrSecondaryButtonClass()}
              disabled={step === 1}
              onClick={() => setStep((current) => (current > 1 ? ((current - 1) as WizardStep) : current))}
            >
              Back
            </button>
            {step < 4 ? (
              <button
                type="button"
                className={hrPrimaryButtonClass()}
                onClick={() => {
                  if (step === 3 && !preview.length) setPreview(buildPreviewLines());
                  setStep((current) => (current < 4 ? ((current + 1) as WizardStep) : current));
                }}
              >
                Continue
              </button>
            ) : null}
          </div>
        </HrSection>
      ) : null}
    </div>
  );
}

"use client";

import { AlertTriangle, CheckCircle2, Loader2, Shield } from "lucide-react";

import { cn } from "@/lib/utils";

export type ActionConfirmationView = {
  planId: string;
  title: string;
  summary: string;
  status: string;
  aiRequest?: string | null;
  warnings: string[];
  permissionNotes: string[];
  actions: Array<{
    stepId: string;
    actionId: string;
    name: string;
    module: string;
    status: string;
    input: Record<string, unknown>;
    preview: {
      summary: string;
      affectedRecords: Array<{
        type: string;
        id?: string | null;
        label: string;
        change?: string;
      }>;
      warnings: string[];
      reversible: boolean;
    } | null;
    error?: string | null;
  }>;
  affectedRecords: Array<{
    type: string;
    id?: string | null;
    label: string;
    change?: string;
  }>;
};

export type ActionConfirmationCardProps = {
  confirmation: ActionConfirmationView;
  busy?: boolean;
  onApprove: () => void;
  onCancel: () => void;
  className?: string;
};

/**
 * Generic confirmation surface for Action Framework plans.
 * Domain modules do not need custom confirm UIs for Phase 1.
 */
export function ActionConfirmationCard({
  confirmation,
  busy = false,
  onApprove,
  onCancel,
  className,
}: ActionConfirmationCardProps) {
  const canApprove = confirmation.status === "proposed" && !busy;

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-400/35 bg-amber-500/[0.08] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-50">Action Summary</p>
          <p className="mt-0.5 text-[11px] text-amber-100/75">{confirmation.title}</p>
          {confirmation.aiRequest ? (
            <p className="mt-1 text-[11px] text-white/55">
              Request: <span className="text-white/75">{confirmation.aiRequest}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
          Actions to perform
        </p>
        <ol className="space-y-1.5">
          {confirmation.actions.map((action, index) => (
            <li
              key={action.stepId}
              className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-white/90">
                  {index + 1}. {action.name}
                </p>
                <span className="text-[10px] uppercase tracking-wide text-white/40">
                  {action.module}
                </span>
              </div>
              {action.preview?.summary ? (
                <p className="mt-1 text-[11px] text-white/60">{action.preview.summary}</p>
              ) : null}
              {action.error ? (
                <p className="mt-1 text-[11px] text-rose-300">{action.error}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {confirmation.affectedRecords.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
            Affected records
          </p>
          <ul className="mt-1.5 space-y-1">
            {confirmation.affectedRecords.map((record, index) => (
              <li key={`${record.type}-${record.label}-${index}`} className="text-[11px] text-white/70">
                <span className="text-white/40">{record.type}</span> · {record.label}
                {record.change ? (
                  <span className="text-white/45"> — {record.change}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {confirmation.permissionNotes.length > 0 ? (
        <div className="mt-3 rounded-lg border border-sky-400/20 bg-sky-500/10 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-100/70">
            User permissions
          </p>
          <ul className="mt-1 space-y-0.5">
            {confirmation.permissionNotes.map((note) => (
              <li key={note} className="text-[11px] text-sky-50/80">
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-emerald-200/80">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Permissions validated for this plan
        </p>
      )}

      {confirmation.warnings.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-2">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/80">
            <AlertTriangle className="h-3.5 w-3.5" />
            Warnings
          </p>
          <ul className="mt-1 space-y-0.5">
            {confirmation.warnings.map((warning) => (
              <li key={warning} className="text-[11px] text-amber-50/85">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3.5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canApprove}
          onClick={onApprove}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/50 bg-amber-400/20 px-3 py-1.5 text-[11px] font-semibold text-amber-50 transition-colors hover:bg-amber-400/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/65 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

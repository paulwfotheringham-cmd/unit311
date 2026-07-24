"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  GitBranch,
  Loader2,
  RotateCcw,
  Shield,
  SkipForward,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlanViewerModel } from "@/lib/ai-operating-assistant/actions/planning/types";

export type PlanViewerProps = {
  plan: PlanViewerModel;
  busy?: boolean;
  onApprove: () => void;
  onCancel: () => void;
  className?: string;
};

function statusIcon(status: string) {
  const s = status.toLowerCase();
  if (s === "succeeded" || s === "completed" || s === "previewed" || s === "validated") {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />;
  }
  if (s === "running" || s === "executing" || s === "retrying") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />;
  }
  if (s === "waiting" || s === "pending" || s === "ready" || s === "proposed") {
    return <Circle className="h-3.5 w-3.5 text-white/35" />;
  }
  if (s === "skipped") {
    return <SkipForward className="h-3.5 w-3.5 text-amber-200/80" />;
  }
  if (s === "rolled_back") {
    return <RotateCcw className="h-3.5 w-3.5 text-violet-300" />;
  }
  if (s === "failed") {
    return <XCircle className="h-3.5 w-3.5 text-rose-300" />;
  }
  return <Circle className="h-3.5 w-3.5 text-white/35" />;
}

function riskTone(risk: string) {
  switch (risk) {
    case "critical":
      return "text-rose-200";
    case "high":
      return "text-orange-200";
    case "medium":
      return "text-amber-200";
    default:
      return "text-emerald-200/80";
  }
}

/**
 * Plan Viewer — goal summary, action graph, progress, execution outcome.
 * Replaces the simple Phase 1 action list for both goal plans and adapted action plans.
 */
export function PlanViewer({
  plan,
  busy = false,
  onApprove,
  onCancel,
  className,
}: PlanViewerProps) {
  const canApprove = plan.phase === "summary" && plan.status === "proposed" && !busy;
  const showExecution = plan.phase === "complete" && plan.executionSummary;

  return (
    <div
      className={cn(
        "rounded-xl border border-sky-400/30 bg-sky-500/[0.07] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-sky-50">
            {plan.phase === "complete" ? "Execution Summary" : "Plan Summary"}
          </p>
          <p className="mt-0.5 text-[11px] text-sky-100/80">{plan.title}</p>
          <p className="mt-1 text-[11px] text-white/60">
            Goal: <span className="text-white/80">{plan.goal}</span>
          </p>
        </div>
        <span className={cn("text-[10px] font-semibold uppercase tracking-wide", riskTone(plan.riskLevel))}>
          {plan.riskLevel} risk
        </span>
      </div>

      {plan.businessImpact ? (
        <p className="mt-2 text-[11px] text-white/65">{plan.businessImpact}</p>
      ) : null}

      {/* Progress */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-white/45">
          <span>Overall progress</span>
          <span>
            {plan.progressPct}%
            {plan.estimatedCompletionLabel ? ` · ${plan.estimatedCompletionLabel}` : ""}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-sky-400/70 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, plan.progressPct))}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-white/40">
          Est. duration {plan.estimatedDurationLabel}
          {plan.rollbackAvailable ? " · Rollback available" : " · Limited rollback"}
        </p>
      </div>

      {/* Action graph */}
      <div className="mt-3 space-y-2">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
          <GitBranch className="h-3.5 w-3.5" />
          Action graph
        </p>
        <ol className="space-y-1.5">
          {plan.steps.map((step, index) => (
            <li
              key={step.stepId}
              className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5">{statusIcon(step.status)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-white/90">
                      {index + 1}. {step.name}
                    </p>
                    <span className="text-[10px] uppercase tracking-wide text-white/40">
                      {step.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-white/45">{step.reason}</p>
                  {step.previewSummary ? (
                    <p className="mt-1 text-[11px] text-white/60">{step.previewSummary}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-white/40">
                    <span className={riskTone(step.riskLevel)}>{step.riskLevel}</span>
                    {step.parallelGroupId ? (
                      <span>parallel:{step.parallelGroupId}</span>
                    ) : null}
                    {step.dependsOnStepIds.length ? (
                      <span>deps:{step.dependsOnStepIds.length}</span>
                    ) : null}
                    <span>~{Math.round(step.estimatedDurationMs / 1000)}s</span>
                  </div>
                  {step.skipReason ? (
                    <p className="mt-1 text-[11px] text-amber-200/85">{step.skipReason}</p>
                  ) : null}
                  {step.error ? (
                    <p className="mt-1 text-[11px] text-rose-300">{step.error}</p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {plan.affectedRecords.length > 0 && plan.phase !== "complete" ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
            Affected records
          </p>
          <ul className="mt-1.5 space-y-1">
            {plan.affectedRecords.slice(0, 12).map((record, index) => (
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

      {showExecution ? (
        <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
            Outcome
          </p>
          <p className="text-[11px] text-white/70">
            Duration {plan.executionSummary!.durationLabel}
            {plan.auditReference ? (
              <>
                {" "}
                · Audit <span className="text-white/50">{plan.auditReference}</span>
              </>
            ) : null}
          </p>
          <div className="grid gap-1.5 text-[11px]">
            <p className="text-emerald-200/85">
              Completed: {plan.executionSummary!.completedActions.length}
            </p>
            <p className="text-amber-200/85">
              Skipped: {plan.executionSummary!.skippedActions.length}
            </p>
            <p className="text-rose-200/85">
              Failed: {plan.executionSummary!.failedActions.length}
            </p>
            <p className="text-violet-200/85">
              Rolled back: {plan.executionSummary!.rollbackActions.length}
            </p>
          </div>
        </div>
      ) : null}

      {plan.permissionNotes.length > 0 ? (
        <div className="mt-3 rounded-lg border border-sky-400/20 bg-sky-500/10 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-100/70">
            Permissions
          </p>
          <ul className="mt-1 space-y-0.5">
            {plan.permissionNotes.map((note) => (
              <li key={note} className="text-[11px] text-sky-50/80">
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : plan.phase === "summary" ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-emerald-200/80">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Permissions validated for this plan
        </p>
      ) : null}

      {plan.warnings.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-2">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/80">
            <AlertTriangle className="h-3.5 w-3.5" />
            Warnings
          </p>
          <ul className="mt-1 space-y-0.5">
            {plan.warnings.map((warning) => (
              <li key={warning} className="text-[11px] text-amber-50/85">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan.phase === "summary" ? (
        <div className="mt-3.5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canApprove}
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300/50 bg-sky-400/20 px-3 py-1.5 text-[11px] font-semibold text-sky-50 transition-colors hover:bg-sky-400/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Approve plan
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
      ) : plan.phase === "executing" ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-sky-100/80">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Executing plan…
        </p>
      ) : (
        <button
          type="button"
          onClick={onCancel}
          className="mt-3.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/65 transition-colors hover:border-white/25 hover:text-white"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

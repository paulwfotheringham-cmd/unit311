"use client";

import { useCallback, useEffect, useState, startTransition } from "react";

import { useTreasuryContext } from "@/components/treasury/treasury-context";
import {
  formatTreasuryDateTime,
  formatTreasuryMoney,
  readTreasuryApiJson,
  treasuryInputClassName,
  treasuryPanelClassName,
  TreasuryFieldLabel,
  TreasurySkeleton,
  TreasuryStatusBadge,
} from "@/components/treasury/treasury-ui";
import type { TreasuryTransferApproval } from "@/lib/treasury/treasury-types";
import { cn } from "@/lib/utils";
import { Check, RefreshCw, X } from "lucide-react";

export default function TreasuryApprovalPanel({ onResolved }: { onResolved?: () => void }) {
  const { pushToast } = useTreasuryContext();
  const [approvals, setApprovals] = useState<TreasuryTransferApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const loadApprovals = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/financials/treasury/approvals", { cache: "no-store" });
      const data = await readTreasuryApiJson<{ approvals?: TreasuryTransferApproval[]; error?: string }>(
        response,
      );
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load approvals.");
      }
      setApprovals((data.approvals ?? []).filter((entry) => entry.status === "pending"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load approvals.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadApprovals("initial");
    });
  }, [loadApprovals]);

  const resolveApproval = async (id: string, action: "approve" | "reject", reason?: string) => {
    setActingId(id);
    try {
      const response = await fetch("/api/financials/treasury/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, reason }),
      });
      const data = await readTreasuryApiJson<{ error?: string; stage?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to resolve approval.");
      }

      pushToast({
        title: action === "approve" ? "Transfer approved" : "Transfer rejected",
        message:
          action === "approve"
            ? "The transfer has been submitted to Wise."
            : "The transfer request was rejected.",
      });

      setRejectingId(null);
      setRejectReason("");
      await loadApprovals("refresh");
      onResolved?.();
    } catch (resolveError) {
      pushToast({
        title: "Approval action failed",
        message: resolveError instanceof Error ? resolveError.message : "Please try again.",
      });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className={treasuryPanelClassName()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300/90">
              Governance
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Pending approvals</h2>
            <p className="mt-1 text-sm text-white/55">
              Review and approve high-value transfer requests before execution.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadApprovals("refresh")}
            disabled={loading || refreshing}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </section>

      {error ? (
        <section className={treasuryPanelClassName()}>
          <p className="text-sm text-rose-200">{error}</p>
        </section>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <TreasurySkeleton key={index} className="h-36" />
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <section className={treasuryPanelClassName()}>
          <p className="text-sm text-white/55">No pending transfer approvals.</p>
        </section>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => {
            const { payload } = approval;
            const busy = actingId === approval.id;

            return (
              <article key={approval.id} className={treasuryPanelClassName()}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-white">
                        {formatTreasuryMoney(payload.sourceAmount, payload.sourceCurrency)}
                      </h3>
                      <TreasuryStatusBadge status={approval.status} />
                    </div>
                    <p className="mt-1 text-sm text-white/55">
                      Requested by {approval.requestedByName} ·{" "}
                      {formatTreasuryDateTime(approval.createdAt)}
                    </p>
                  </div>
                  <p className="text-xs text-white/40">Ref: {payload.reference}</p>
                </div>

                <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-white/45">Target</dt>
                    <dd className="mt-1 text-sm text-white">
                      {formatTreasuryMoney(payload.targetAmount, payload.targetCurrency)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-white/45">Recipient</dt>
                    <dd className="mt-1 text-sm text-white">#{payload.recipientId}</dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-white/45">Fee</dt>
                    <dd className="mt-1 text-sm text-white">
                      {payload.fee !== undefined
                        ? formatTreasuryMoney(payload.fee, payload.sourceCurrency)
                        : "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-white/45">Rate</dt>
                    <dd className="mt-1 text-sm text-white">
                      {payload.exchangeRate ? payload.exchangeRate.toFixed(4) : "—"}
                    </dd>
                  </div>
                </dl>

                {rejectingId === approval.id ? (
                  <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] p-3">
                    <TreasuryFieldLabel>Rejection reason</TreasuryFieldLabel>
                    <textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={2}
                      className={cn(treasuryInputClassName(), "resize-none")}
                      placeholder="Optional reason for rejection…"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void resolveApproval(approval.id, "reject", rejectReason)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 text-xs font-semibold text-rose-100 disabled:opacity-60"
                      >
                        <X className="h-3.5 w-3.5" />
                        Confirm reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                        className="inline-flex h-8 items-center rounded-lg border border-white/15 px-3 text-xs text-white/70"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void resolveApproval(approval.id, "approve")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/25 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRejectingId(approval.id)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

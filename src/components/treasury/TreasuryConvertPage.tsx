"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useTreasuryContext } from "@/components/treasury/treasury-context";
import {
  formatTreasuryMoney,
  readTreasuryApiJson,
  treasuryInputClassName,
  treasuryPanelClassName,
  TreasuryFieldLabel,
  TreasuryStatusBadge,
} from "@/components/treasury/treasury-ui";
import type { TreasuryTransferStage } from "@/lib/treasury/treasury-types";
import type { WiseBalance, WiseQuote, WiseRecipient } from "@/lib/wise-service";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, CheckCircle2, Loader2 } from "lucide-react";

type TreasuryRecipientRow = WiseRecipient & {
  favourite: boolean;
  lastUsedAt: string | null;
  label: string | null;
};

type TreasuryConvertPageProps = {
  balances: WiseBalance[];
  onComplete?: () => void;
};

const STAGE_LABELS: Record<TreasuryTransferStage, string> = {
  draft: "Preparing conversion",
  awaiting_funding: "Awaiting funding",
  processing: "Converting funds",
  completed: "Conversion complete",
  failed: "Conversion failed",
};

export default function TreasuryConvertPage({ balances, onComplete }: TreasuryConvertPageProps) {
  const { pushToast } = useTreasuryContext();
  const [sourceBalanceId, setSourceBalanceId] = useState<number | null>(
    balances[0]?.id ?? null,
  );
  const [targetBalanceId, setTargetBalanceId] = useState<number | null>(
    balances.find((b) => b.currency !== balances[0]?.currency)?.id ?? null,
  );
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<WiseQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [stage, setStage] = useState<TreasuryTransferStage | null>(null);
  const [ownedRecipients, setOwnedRecipients] = useState<TreasuryRecipientRow[]>([]);

  const sourceBalance = balances.find((entry) => entry.id === sourceBalanceId) ?? null;
  const targetBalance = balances.find((entry) => entry.id === targetBalanceId) ?? null;

  const sameCurrency = Boolean(
    sourceBalance && targetBalance && sourceBalance.currency === targetBalance.currency,
  );

  const loadOwnedRecipients = useCallback(async () => {
    const response = await fetch("/api/financials/wise/recipients", { cache: "no-store" });
    const data = await readTreasuryApiJson<{ recipients?: TreasuryRecipientRow[] }>(response);
    if (response.ok) {
      setOwnedRecipients(
        (data.recipients ?? []).filter((entry) => entry.ownedByCustomer || entry.active),
      );
    }
  }, []);

  useEffect(() => {
    void loadOwnedRecipients();
  }, [loadOwnedRecipients]);

  const targetRecipient = useMemo(() => {
    if (!targetBalance) return null;
    return (
      ownedRecipients.find(
        (entry) =>
          entry.currency === targetBalance.currency &&
          (entry.ownedByCustomer || entry.type.toLowerCase().includes("balance")),
      ) ?? ownedRecipients.find((entry) => entry.currency === targetBalance.currency) ?? null
    );
  }, [ownedRecipients, targetBalance]);

  const fetchQuote = async () => {
    if (!sourceBalance || !targetBalance || sameCurrency) return;
    const sourceAmount = Number(amount);
    if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) {
      pushToast({ title: "Invalid amount", message: "Enter a valid source amount." });
      return;
    }

    setQuoteLoading(true);
    setQuote(null);
    try {
      const response = await fetch("/api/financials/wise/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCurrency: sourceBalance.currency,
          targetCurrency: targetBalance.currency,
          sourceAmount,
          targetAccount: targetRecipient?.id,
        }),
      });
      const data = await readTreasuryApiJson<{ quote?: WiseQuote; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create quote.");
      }
      setQuote(data.quote ?? null);
    } catch (quoteError) {
      pushToast({
        title: "Quote failed",
        message: quoteError instanceof Error ? quoteError.message : "Please try again.",
      });
    } finally {
      setQuoteLoading(false);
    }
  };

  const pollTransferStage = async (transferId: number) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      const response = await fetch(`/api/financials/wise/transfers/${transferId}`, {
        cache: "no-store",
      });
      const data = await readTreasuryApiJson<{ stage?: TreasuryTransferStage }>(response);
      if (response.ok && data.stage) {
        setStage(data.stage);
        if (data.stage === "completed" || data.stage === "failed") return data.stage;
      }
    }
    return stage;
  };

  const executeConversion = async () => {
    if (!sourceBalance || !targetBalance || !quote || !targetRecipient) {
      pushToast({
        title: "Missing target account",
        message: "No owned Wise account found for the target currency.",
      });
      return;
    }

    setExecuting(true);
    setStage("draft");
    try {
      const response = await fetch("/api/financials/wise/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          recipientId: targetRecipient.id,
          balanceId: sourceBalance.id,
          sourceCurrency: quote.sourceCurrency,
          targetCurrency: quote.targetCurrency,
          sourceAmount: quote.sourceAmount,
          targetAmount: quote.targetAmount,
          reference: `Convert ${quote.sourceCurrency} → ${quote.targetCurrency}`,
          exchangeRate: quote.rate,
          fee: quote.fee,
          estimatedArrival: quote.estimatedDelivery,
        }),
      });

      const data = await readTreasuryApiJson<{
        transfer?: { id: number };
        stage?: TreasuryTransferStage;
        approvalRequired?: boolean;
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Conversion failed.");
      }

      if (data.approvalRequired) {
        pushToast({
          title: "Approval required",
          message: "This conversion requires approval before execution.",
        });
        setStage(null);
        return;
      }

      setStage(data.stage ?? "processing");
      if (data.transfer?.id) {
        const finalStage = await pollTransferStage(data.transfer.id);
        if (finalStage === "completed") {
          pushToast({ title: "Conversion complete", message: "Funds converted successfully." });
          onComplete?.();
        } else if (finalStage === "failed") {
          pushToast({ title: "Conversion failed", message: "Wise reported a failed conversion." });
        }
      }
    } catch (executeError) {
      setStage("failed");
      pushToast({
        title: "Conversion failed",
        message: executeError instanceof Error ? executeError.message : "Please try again.",
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className={treasuryPanelClassName()}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10">
            <ArrowLeftRight className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/90">
              Balances
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Convert currency</h2>
            <p className="mt-1 text-sm text-white/55">
              Move funds between Wise balances using live quotes.
            </p>
          </div>
        </div>
      </section>

      <section className={treasuryPanelClassName()}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <TreasuryFieldLabel>From balance</TreasuryFieldLabel>
            <select
              value={sourceBalanceId ?? ""}
              onChange={(event) => {
                setSourceBalanceId(Number(event.target.value));
                setQuote(null);
              }}
              className={treasuryInputClassName()}
            >
              {balances.map((balance) => (
                <option key={balance.id} value={balance.id}>
                  {balance.currency} · {formatTreasuryMoney(balance.amount, balance.currency)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <TreasuryFieldLabel>To balance</TreasuryFieldLabel>
            <select
              value={targetBalanceId ?? ""}
              onChange={(event) => {
                setTargetBalanceId(Number(event.target.value));
                setQuote(null);
              }}
              className={treasuryInputClassName()}
            >
              {balances.map((balance) => (
                <option key={balance.id} value={balance.id}>
                  {balance.currency} · {formatTreasuryMoney(balance.amount, balance.currency)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sameCurrency ? (
          <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] px-3 py-2.5 text-sm text-amber-100">
            Source and target currencies are the same — no conversion is required.
          </p>
        ) : (
          <>
            <div className="mt-4">
              <TreasuryFieldLabel>Amount to convert ({sourceBalance?.currency})</TreasuryFieldLabel>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setQuote(null);
                }}
                className={treasuryInputClassName()}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void fetchQuote()}
                disabled={quoteLoading || !amount}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 text-xs font-semibold text-sky-100 disabled:opacity-60"
              >
                {quoteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Get quote
              </button>
            </div>

            {quote ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">You send</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {formatTreasuryMoney(quote.sourceAmount, quote.sourceCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">You receive</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-300">
                      {formatTreasuryMoney(quote.targetAmount, quote.targetCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Rate</p>
                    <p className="mt-1 text-sm text-white">{quote.rate.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Fee</p>
                    <p className="mt-1 text-sm text-white">
                      {formatTreasuryMoney(quote.fee, quote.sourceCurrency)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void executeConversion()}
                  disabled={executing || !targetRecipient}
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-100 disabled:opacity-60"
                >
                  {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Confirm conversion
                </button>

                {!targetRecipient ? (
                  <p className="mt-2 text-xs text-rose-200">
                    No owned recipient account found for {targetBalance?.currency}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {stage ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-2">
                  {stage === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  ) : stage === "failed" ? (
                    <Loader2 className="h-4 w-4 text-rose-300" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
                  )}
                  <p className="text-sm text-white">{STAGE_LABELS[stage]}</p>
                  <TreasuryStatusBadge status={stage} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

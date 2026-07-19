"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import { useTreasuryContext } from "@/components/treasury/treasury-context";
import {
  formatTreasuryDateTime,
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
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

type TreasuryRecipientRow = WiseRecipient & {
  favourite: boolean;
  lastUsedAt: string | null;
  label: string | null;
};

type TreasurySendMoneyWizardProps = {
  balances: WiseBalance[];
  onComplete?: () => void;
  onCancel?: () => void;
};

const STEPS = ["Amount", "Recipient", "Quote", "Confirm", "Execute"] as const;

const RECIPIENT_FORM = {
  GBP: {
    type: "sort_code",
    fields: [
      { key: "sortCode", label: "Sort code" },
      { key: "accountNumber", label: "Account number" },
    ],
  },
  EUR: {
    type: "iban",
    fields: [{ key: "iban", label: "IBAN" }],
  },
  USD: {
    type: "aba",
    fields: [
      { key: "abartn", label: "ABA routing number" },
      { key: "accountNumber", label: "Account number" },
    ],
  },
} as const;

const STAGE_ORDER: TreasuryTransferStage[] = [
  "draft",
  "awaiting_funding",
  "processing",
  "completed",
];

const STAGE_LABELS: Record<TreasuryTransferStage, string> = {
  draft: "Creating transfer",
  awaiting_funding: "Funding from balance",
  processing: "Processing payment",
  completed: "Transfer sent",
  failed: "Transfer failed",
};

export default function TreasurySendMoneyWizard({
  balances,
  onComplete,
  onCancel,
}: TreasurySendMoneyWizardProps) {
  const { pushToast } = useTreasuryContext();
  const [step, setStep] = useState(0);
  const [balanceId, setBalanceId] = useState<number | null>(balances[0]?.id ?? null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("Unit311 payment");
  const [recipients, setRecipients] = useState<TreasuryRecipientRow[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [creatingRecipient, setCreatingRecipient] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [newRecipientDetails, setNewRecipientDetails] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<WiseQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [stage, setStage] = useState<TreasuryTransferStage | null>(null);
  const [transferId, setTransferId] = useState<number | null>(null);
  const [approvalRequired, setApprovalRequired] = useState(false);

  const selectedBalance = balances.find((entry) => entry.id === balanceId) ?? null;
  const currency = selectedBalance?.currency ?? "GBP";
  const recipientForm =
    RECIPIENT_FORM[currency as keyof typeof RECIPIENT_FORM] ?? RECIPIENT_FORM.GBP;

  const loadRecipients = useCallback(async () => {
    const params = new URLSearchParams({ currency });
    if (recipientSearch.trim()) params.set("search", recipientSearch.trim());
    const response = await fetch(`/api/financials/wise/recipients?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await readTreasuryApiJson<{ recipients?: TreasuryRecipientRow[] }>(response);
    if (response.ok) {
      setRecipients(data.recipients ?? []);
    }
  }, [currency, recipientSearch]);

  useEffect(() => {
    if (step >= 1) {
      startTransition(() => {
        void loadRecipients();
      });
    }
  }, [step, loadRecipients]);

  const sortedRecipients = useMemo(
    () =>
      [...recipients].sort((a, b) => {
        if (a.favourite !== b.favourite) return a.favourite ? -1 : 1;
        if (a.lastUsedAt && b.lastUsedAt) {
          return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
        }
        return a.accountHolderName.localeCompare(b.accountHolderName);
      }),
    [recipients],
  );

  const selectedRecipient =
    sortedRecipients.find((entry) => entry.id === selectedRecipientId) ?? null;

  const sourceAmount = Number(amount);

  const canProceedStep0 =
    selectedBalance &&
    Number.isFinite(sourceAmount) &&
    sourceAmount > 0 &&
    sourceAmount <= selectedBalance.amount;

  const createInlineRecipient = async () => {
    if (!newRecipientName.trim()) {
      pushToast({ title: "Missing name", message: "Account holder name is required." });
      return;
    }

    setCreatingRecipient(true);
    try {
      const response = await fetch("/api/financials/wise/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          type: recipientForm.type,
          accountHolderName: newRecipientName.trim(),
          legalType: "BUSINESS",
          details: { ...newRecipientDetails, legalType: "BUSINESS" },
        }),
      });
      const data = await readTreasuryApiJson<{ recipient?: TreasuryRecipientRow; error?: string }>(
        response,
      );
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create recipient.");
      }
      if (data.recipient) {
        setSelectedRecipientId(data.recipient.id);
        setCreatingRecipient(false);
        setNewRecipientName("");
        setNewRecipientDetails({});
        await loadRecipients();
        pushToast({ title: "Recipient created", message: data.recipient.accountHolderName });
      }
    } catch (createError) {
      pushToast({
        title: "Create failed",
        message: createError instanceof Error ? createError.message : "Please try again.",
      });
    } finally {
      setCreatingRecipient(false);
    }
  };

  const fetchQuote = async () => {
    if (!selectedRecipient || !canProceedStep0) return;

    setQuoteLoading(true);
    setQuote(null);
    try {
      const response = await fetch("/api/financials/wise/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCurrency: currency,
          targetCurrency: selectedRecipient.currency,
          sourceAmount,
          targetAccount: selectedRecipient.id,
        }),
      });
      const data = await readTreasuryApiJson<{ quote?: WiseQuote; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create quote.");
      }
      setQuote(data.quote ?? null);
      setStep(2);
    } catch (quoteError) {
      pushToast({
        title: "Quote failed",
        message: quoteError instanceof Error ? quoteError.message : "Please try again.",
      });
    } finally {
      setQuoteLoading(false);
    }
  };

  const pollTransfer = async (id: number) => {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      const response = await fetch(`/api/financials/wise/transfers/${id}`, { cache: "no-store" });
      const data = await readTreasuryApiJson<{ stage?: TreasuryTransferStage }>(response);
      if (response.ok && data.stage) {
        setStage(data.stage);
        if (data.stage === "completed" || data.stage === "failed") return data.stage;
      }
    }
    return stage;
  };

  const executeTransfer = async () => {
    if (!quote || !selectedRecipient || !selectedBalance) return;

    setExecuting(true);
    setStage("draft");
    setStep(4);

    try {
      const response = await fetch("/api/financials/wise/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          recipientId: selectedRecipient.id,
          balanceId: selectedBalance.id,
          sourceCurrency: quote.sourceCurrency,
          targetCurrency: quote.targetCurrency,
          sourceAmount: quote.sourceAmount,
          targetAmount: quote.targetAmount,
          reference,
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
        throw new Error(data.error ?? "Transfer failed.");
      }

      if (data.approvalRequired) {
        setApprovalRequired(true);
        setStage(null);
        pushToast({
          title: "Approval required",
          message: "This transfer was submitted for approval.",
        });
        return;
      }

      if (data.transfer?.id) {
        setTransferId(data.transfer.id);
        setStage(data.stage ?? "processing");
        const finalStage = await pollTransfer(data.transfer.id);
        if (finalStage === "completed") {
          pushToast({ title: "Transfer sent", message: "Money sent successfully." });
          onComplete?.();
        }
      }
    } catch (executeError) {
      setStage("failed");
      pushToast({
        title: "Transfer failed",
        message: executeError instanceof Error ? executeError.message : "Please try again.",
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className={treasuryPanelClassName()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
              Payments
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Send money</h2>
          </div>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/80"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cancel
            </button>
          ) : null}
        </div>

        <ol className="mt-4 flex flex-wrap gap-2">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium",
                index === step
                  ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                  : index < step
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 bg-white/[0.03] text-white/45",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  index <= step ? "bg-white/15 text-white" : "bg-white/[0.06] text-white/40",
                )}
              >
                {index < step ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      </section>

      {step === 0 ? (
        <section className={treasuryPanelClassName()}>
          <h3 className="text-base font-semibold text-white">Amount & currency</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <TreasuryFieldLabel>Pay from balance</TreasuryFieldLabel>
              <select
                value={balanceId ?? ""}
                onChange={(event) => setBalanceId(Number(event.target.value))}
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
              <TreasuryFieldLabel>Amount ({currency})</TreasuryFieldLabel>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={treasuryInputClassName()}
              />
            </div>
            <div className="sm:col-span-2">
              <TreasuryFieldLabel>Payment reference</TreasuryFieldLabel>
              <input
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className={treasuryInputClassName()}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!canProceedStep0}
              onClick={() => setStep(1)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 text-xs font-semibold text-sky-100 disabled:opacity-60"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className={treasuryPanelClassName()}>
          <h3 className="text-base font-semibold text-white">Select recipient</h3>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              value={recipientSearch}
              onChange={(event) => setRecipientSearch(event.target.value)}
              placeholder="Search recipients…"
              className={cn(treasuryInputClassName(), "mt-0 pl-9")}
            />
          </div>

          <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
            {sortedRecipients.map((recipient) => (
              <li key={recipient.id}>
                <button
                  type="button"
                  onClick={() => setSelectedRecipientId(recipient.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                    selectedRecipientId === recipient.id
                      ? "border-sky-400/40 bg-sky-500/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]",
                  )}
                >
                  <p className="text-sm font-medium text-white">{recipient.accountHolderName}</p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {recipient.accountSummary ?? recipient.maskedAccount} · {recipient.currency}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <details className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-white">
              <Plus className="h-4 w-4 text-sky-300" />
              Create new recipient
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <TreasuryFieldLabel>Account holder name</TreasuryFieldLabel>
                <input
                  type="text"
                  value={newRecipientName}
                  onChange={(event) => setNewRecipientName(event.target.value)}
                  className={treasuryInputClassName()}
                />
              </div>
              {recipientForm.fields.map((field) => (
                <div key={field.key}>
                  <TreasuryFieldLabel>{field.label}</TreasuryFieldLabel>
                  <input
                    type="text"
                    value={newRecipientDetails[field.key] ?? ""}
                    onChange={(event) =>
                      setNewRecipientDetails((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    className={treasuryInputClassName()}
                  />
                </div>
              ))}
              <button
                type="button"
                disabled={creatingRecipient}
                onClick={() => void createInlineRecipient()}
                className="inline-flex h-8 items-center rounded-lg border border-sky-400/30 bg-sky-500/15 px-3 text-xs font-semibold text-sky-100 disabled:opacity-60"
              >
                Save recipient
              </button>
            </div>
          </details>

          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/70"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button
              type="button"
              disabled={!selectedRecipientId || quoteLoading}
              onClick={() => void fetchQuote()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 text-xs font-semibold text-sky-100 disabled:opacity-60"
            >
              {quoteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Get quote
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 && quote ? (
        <section className={treasuryPanelClassName()}>
          <h3 className="text-base font-semibold text-white">Quote</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">You send</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatTreasuryMoney(quote.sourceAmount, quote.sourceCurrency)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Recipient gets</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300">
                {formatTreasuryMoney(quote.targetAmount, quote.targetCurrency)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Exchange rate</p>
              <p className="mt-1 text-sm text-white">{quote.rate.toFixed(4)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Wise fee</p>
              <p className="mt-1 text-sm text-white">
                {formatTreasuryMoney(quote.fee, quote.sourceCurrency)}
              </p>
            </div>
          </div>
          {quote.estimatedDelivery ? (
            <p className="mt-3 text-xs text-white/45">
              Estimated arrival {formatTreasuryDateTime(quote.estimatedDelivery)}
            </p>
          ) : null}
          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/70"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 text-xs font-semibold text-sky-100"
            >
              Review
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 && quote && selectedRecipient ? (
        <section className={treasuryPanelClassName()}>
          <h3 className="text-base font-semibold text-white">Confirm transfer</h3>
          <dl className="mt-4 space-y-0 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/[0.06] py-2">
              <dt className="text-white/50">Recipient</dt>
              <dd className="text-right font-medium text-white">
                {selectedRecipient.accountHolderName}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/[0.06] py-2">
              <dt className="text-white/50">Amount</dt>
              <dd className="text-right font-medium text-white">
                {formatTreasuryMoney(quote.sourceAmount, quote.sourceCurrency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/[0.06] py-2">
              <dt className="text-white/50">Reference</dt>
              <dd className="text-right text-white">{reference}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-white/50">Total fees</dt>
              <dd className="text-right text-white">
                {formatTreasuryMoney(quote.fee, quote.sourceCurrency)}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/70"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button
              type="button"
              disabled={executing}
              onClick={() => void executeTransfer()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-100 disabled:opacity-60"
            >
              Send money
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className={treasuryPanelClassName()}>
          <h3 className="text-base font-semibold text-white">Executing transfer</h3>

          {approvalRequired ? (
            <p className="mt-3 text-sm text-amber-100">
              Transfer submitted for approval. You will be notified when it is processed.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {STAGE_ORDER.map((entry) => {
                const index = stage ? STAGE_ORDER.indexOf(stage) : -1;
                const stageIndex = STAGE_ORDER.indexOf(entry);
                const done = index > stageIndex;
                const active = stage === entry;
                const failed = stage === "failed" && entry === "processing";

                return (
                  <li
                    key={entry}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                      done
                        ? "border-emerald-400/25 bg-emerald-500/10"
                        : active
                          ? "border-sky-400/30 bg-sky-500/10"
                          : "border-white/10 bg-white/[0.02]",
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    ) : active && !failed ? (
                      <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-white/20" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-white">{STAGE_LABELS[entry]}</p>
                      {transferId && active ? (
                        <p className="text-[10px] text-white/40">Transfer #{transferId}</p>
                      ) : null}
                    </div>
                    {active ? <TreasuryStatusBadge status={entry} /> : null}
                  </li>
                );
              })}
              {stage === "failed" ? (
                <li className="flex items-center gap-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5">
                  <Loader2 className="h-4 w-4 text-rose-300" />
                  <p className="text-sm text-rose-100">{STAGE_LABELS.failed}</p>
                  <TreasuryStatusBadge status="failed" />
                </li>
              ) : null}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

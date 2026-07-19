"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useTreasuryContext } from "@/components/treasury/treasury-context";
import {
  readTreasuryApiJson,
  treasuryInputClassName,
  treasuryPanelClassName,
  TreasuryFieldLabel,
  TreasurySkeleton,
} from "@/components/treasury/treasury-ui";
import type { WiseRecipient } from "@/lib/wise-service";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Search, Star, Trash2, X } from "lucide-react";

type TreasuryRecipientRow = WiseRecipient & {
  favourite: boolean;
  lastUsedAt: string | null;
  label: string | null;
};

const CURRENCY_CONFIG = {
  GBP: {
    type: "sort_code",
    country: "GB",
    fields: [
      { key: "sortCode", label: "Sort code", placeholder: "12-34-56" },
      { key: "accountNumber", label: "Account number", placeholder: "12345678" },
    ],
  },
  EUR: {
    type: "iban",
    country: "BE",
    fields: [{ key: "iban", label: "IBAN", placeholder: "BE68539007547034" }],
  },
  USD: {
    type: "aba",
    country: "US",
    fields: [
      { key: "abartn", label: "ABA routing number", placeholder: "021000021" },
      { key: "accountNumber", label: "Account number", placeholder: "1234567890" },
    ],
  },
} as const;

type SupportedCurrency = keyof typeof CURRENCY_CONFIG;

function AddRecipientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { pushToast } = useTreasuryContext();
  const [currency, setCurrency] = useState<SupportedCurrency>("GBP");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [favourite, setFavourite] = useState(false);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const config = CURRENCY_CONFIG[currency];

  const createRecipient = async () => {
    if (!accountHolderName.trim()) {
      pushToast({ title: "Missing name", message: "Account holder name is required." });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/financials/wise/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          type: config.type,
          accountHolderName: accountHolderName.trim(),
          legalType: "BUSINESS",
          favourite,
          details: {
            ...details,
            legalType: "BUSINESS",
          },
        }),
      });
      const data = await readTreasuryApiJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create recipient.");
      }
      pushToast({ title: "Recipient added", message: `${accountHolderName} saved.` });
      onCreated();
      onClose();
    } catch (createError) {
      pushToast({
        title: "Create failed",
        message: createError instanceof Error ? createError.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1422] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Add recipient</h3>
            <p className="mt-1 text-sm text-white/55">Create a Wise payout account.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <TreasuryFieldLabel>Currency</TreasuryFieldLabel>
            <select
              value={currency}
              onChange={(event) => {
                setCurrency(event.target.value as SupportedCurrency);
                setDetails({});
              }}
              className={treasuryInputClassName()}
            >
              {(Object.keys(CURRENCY_CONFIG) as SupportedCurrency[]).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <TreasuryFieldLabel>Account holder name</TreasuryFieldLabel>
            <input
              type="text"
              value={accountHolderName}
              onChange={(event) => setAccountHolderName(event.target.value)}
              className={treasuryInputClassName()}
            />
          </div>
          {config.fields.map((field) => (
            <div key={field.key}>
              <TreasuryFieldLabel>{field.label}</TreasuryFieldLabel>
              <input
                type="text"
                value={details[field.key] ?? ""}
                onChange={(event) =>
                  setDetails((current) => ({ ...current, [field.key]: event.target.value }))
                }
                placeholder={field.placeholder}
                className={treasuryInputClassName()}
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={favourite}
              onChange={(event) => setFavourite(event.target.checked)}
              className="rounded border-white/20 bg-[#0b1524]"
            />
            Mark as favourite
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/70"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void createRecipient()}
            className="inline-flex h-9 items-center rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 text-xs font-semibold text-sky-100 disabled:opacity-60"
          >
            Add recipient
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TreasuryRecipientsPage() {
  const { pushToast } = useTreasuryContext();
  const [recipients, setRecipients] = useState<TreasuryRecipientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecipients = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(
        `/api/financials/wise/recipients?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await readTreasuryApiJson<{ recipients?: TreasuryRecipientRow[]; error?: string }>(
        response,
      );
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load recipients.");
      }
      setRecipients(data.recipients ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load recipients.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecipients("initial");
    }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadRecipients, search]);

  const sortedRecipients = useMemo(
    () =>
      [...recipients].sort((a, b) => {
        if (a.favourite !== b.favourite) return a.favourite ? -1 : 1;
        return a.accountHolderName.localeCompare(b.accountHolderName);
      }),
    [recipients],
  );

  const toggleFavourite = async (recipient: TreasuryRecipientRow) => {
    const next = !recipient.favourite;
    const response = await fetch(`/api/financials/wise/recipients/${recipient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favourite: next }),
    });
    if (!response.ok) {
      pushToast({ title: "Update failed", message: "Could not update favourite status." });
      return;
    }
    setRecipients((current) =>
      current.map((entry) =>
        entry.id === recipient.id ? { ...entry, favourite: next } : entry,
      ),
    );
  };

  const deleteRecipient = async (recipient: TreasuryRecipientRow) => {
    if (!window.confirm(`Delete ${recipient.accountHolderName}?`)) return;

    const response = await fetch(`/api/financials/wise/recipients/${recipient.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await readTreasuryApiJson<{ error?: string }>(response);
      pushToast({
        title: "Delete failed",
        message: data.error ?? "Could not delete recipient.",
      });
      return;
    }
    pushToast({ title: "Recipient deleted", message: recipient.accountHolderName });
    void loadRecipients("refresh");
  };

  return (
    <div className="space-y-4">
      <section className={treasuryPanelClassName()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
              Payouts
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Recipients</h2>
            <p className="mt-1 text-sm text-white/55">
              Manage Wise payout accounts for GBP, EUR, and USD.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadRecipients("refresh")}
              disabled={loading || refreshing}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/25"
            >
              <Plus className="h-3.5 w-3.5" />
              Add recipient
            </button>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipients…"
            className={cn(treasuryInputClassName(), "mt-0 pl-9")}
          />
        </div>
      </section>

      {error ? (
        <section className={treasuryPanelClassName()}>
          <p className="text-sm text-rose-200">{error}</p>
        </section>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <TreasurySkeleton key={index} className="h-20" />
          ))}
        </div>
      ) : sortedRecipients.length === 0 ? (
        <section className={treasuryPanelClassName()}>
          <p className="text-sm text-white/55">No recipients found.</p>
        </section>
      ) : (
        <ul className="space-y-2">
          {sortedRecipients.map((recipient) => (
            <li key={recipient.id} className={treasuryPanelClassName()}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-white">
                      {recipient.accountHolderName}
                    </p>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-medium text-white/55">
                      {recipient.currency}
                    </span>
                    {recipient.favourite ? (
                      <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                        Favourite
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-white/55">
                    {recipient.accountSummary ?? recipient.longAccountSummary ?? recipient.maskedAccount ?? "—"}
                  </p>
                  {recipient.bankName ? (
                    <p className="mt-0.5 text-xs text-white/40">{recipient.bankName}</p>
                  ) : null}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => void toggleFavourite(recipient)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      recipient.favourite
                        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                        : "border-white/15 bg-white/[0.04] text-white/60 hover:text-white",
                    )}
                    aria-label={recipient.favourite ? "Remove favourite" : "Mark favourite"}
                  >
                    <Star className={cn("h-3.5 w-3.5", recipient.favourite && "fill-current")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteRecipient(recipient)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-500/10 text-rose-200 transition-colors hover:bg-rose-500/20"
                    aria-label="Delete recipient"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAddModal ? (
        <AddRecipientModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => void loadRecipients("refresh")}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, startTransition } from "react";

import { useTreasuryContext } from "@/components/treasury/treasury-context";
import {
  readTreasuryApiJson,
  treasuryInputClassName,
  treasuryPanelClassName,
  TreasuryFieldLabel,
  TreasurySkeleton,
} from "@/components/treasury/treasury-ui";
import {
  DEFAULT_TREASURY_SETTINGS,
  type TreasurySettings,
} from "@/lib/treasury/treasury-types";
import { cn } from "@/lib/utils";
import { Save } from "lucide-react";

const CURRENCIES = ["GBP", "USD", "EUR"] as const;

export default function TreasurySettingsPage() {
  const { pushToast } = useTreasuryContext();
  const [settings, setSettings] = useState<TreasurySettings>(DEFAULT_TREASURY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/financials/treasury/settings", { cache: "no-store" });
      const data = await readTreasuryApiJson<{ settings?: TreasurySettings; error?: string }>(
        response,
      );
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load settings.");
      }
      setSettings(data.settings ?? DEFAULT_TREASURY_SETTINGS);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadSettings();
    });
  }, [loadSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/financials/treasury/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await readTreasuryApiJson<{ settings?: TreasurySettings; error?: string }>(
        response,
      );
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save settings.");
      }
      setSettings(data.settings ?? settings);
      pushToast({ title: "Settings saved", message: "Treasury preferences updated." });
    } catch (saveError) {
      pushToast({
        title: "Save failed",
        message: saveError instanceof Error ? saveError.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateLowBalanceAlert = (currency: string, value: string) => {
    const parsed = Number(value);
    setSettings((current) => ({
      ...current,
      lowBalanceAlerts: {
        ...current.lowBalanceAlerts,
        [currency]: Number.isFinite(parsed) ? parsed : 0,
      },
    }));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <TreasurySkeleton className="h-28" />
        <TreasurySkeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className={treasuryPanelClassName()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
              Configuration
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Treasury settings</h2>
            <p className="mt-1 text-sm text-white/55">
              Limits, alerts, and default transfer preferences.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/25 disabled:opacity-60"
          >
            <Save className={cn("h-3.5 w-3.5", saving && "animate-pulse")} />
            Save changes
          </button>
        </div>
      </section>

      {error ? (
        <section className={treasuryPanelClassName()}>
          <p className="text-sm text-rose-200">{error}</p>
        </section>
      ) : null}

      <section className={treasuryPanelClassName()}>
        <h3 className="text-base font-semibold text-white">General</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <TreasuryFieldLabel>Default currency</TreasuryFieldLabel>
            <select
              value={settings.defaultCurrency}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  defaultCurrency: event.target.value as TreasurySettings["defaultCurrency"],
                }))
              }
              className={treasuryInputClassName()}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          <div>
            <TreasuryFieldLabel>Default payment reference</TreasuryFieldLabel>
            <input
              type="text"
              value={settings.defaultReference}
              onChange={(event) =>
                setSettings((current) => ({ ...current, defaultReference: event.target.value }))
              }
              className={treasuryInputClassName()}
            />
          </div>
        </div>
      </section>

      <section className={treasuryPanelClassName()}>
        <h3 className="text-base font-semibold text-white">Limits & approvals</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <TreasuryFieldLabel>Daily transfer limit</TreasuryFieldLabel>
            <input
              type="number"
              min={0}
              step={100}
              value={settings.dailyTransferLimit}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  dailyTransferLimit: Number(event.target.value) || 0,
                }))
              }
              className={treasuryInputClassName()}
            />
          </div>
          <div>
            <TreasuryFieldLabel>Approval threshold</TreasuryFieldLabel>
            <input
              type="number"
              min={0}
              step={100}
              value={settings.approvalThreshold}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  approvalThreshold: Number(event.target.value) || 0,
                }))
              }
              className={treasuryInputClassName()}
            />
            <p className="mt-1.5 text-[11px] text-white/40">
              Transfers at or above this amount require approval before execution.
            </p>
          </div>
        </div>
      </section>

      <section className={treasuryPanelClassName()}>
        <h3 className="text-base font-semibold text-white">Low balance alerts</h3>
        <p className="mt-1 text-sm text-white/55">
          Notify when a currency balance drops below the configured threshold.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {CURRENCIES.map((currency) => (
            <div key={currency}>
              <TreasuryFieldLabel>{currency} threshold</TreasuryFieldLabel>
              <input
                type="number"
                min={0}
                step={100}
                value={settings.lowBalanceAlerts[currency] ?? 0}
                onChange={(event) => updateLowBalanceAlert(currency, event.target.value)}
                className={treasuryInputClassName()}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

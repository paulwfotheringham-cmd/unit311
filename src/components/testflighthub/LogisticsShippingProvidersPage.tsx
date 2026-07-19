"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Link2,
  Plus,
  Plug,
  PlugZap,
  RefreshCw,
  Settings2,
  Unplug,
  X,
} from "lucide-react";

import {
  apiStatusLabel,
  buildInitialLogisticsProviderRows,
  businessAccountLabel,
  connectionStatusLabel,
  healthLabel,
  type LogisticsProviderRow,
  type ProviderConnectionStatus,
} from "@/lib/logistics-shipping-providers-mock";
import { cn } from "@/lib/utils";

type LogisticsShippingProvidersPageProps = {
  onBack: () => void;
  onAddProvider: () => void;
  onContinueSetup: (providerCode: string) => void;
};

const panelClassName =
  "rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6";

const actionBtnClassName =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-white/85 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40";

const primaryActionClassName =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100 transition-colors hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40";

function statusPillClass(status: ProviderConnectionStatus): string {
  switch (status) {
    case "available":
    case "connected":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
    case "setup_in_progress":
      return "border-amber-400/40 bg-amber-500/15 text-amber-200";
    case "disconnected":
      return "border-rose-400/40 bg-rose-500/15 text-rose-200";
    case "not_connected":
    default:
      return "border-white/20 bg-white/10 text-white/80";
  }
}

function healthPillClass(health: LogisticsProviderRow["health"]): string {
  switch (health) {
    case "healthy":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
    case "degraded":
      return "border-amber-400/40 bg-amber-500/15 text-amber-200";
    case "failed":
      return "border-rose-400/40 bg-rose-500/15 text-rose-200";
    default:
      return "border-white/20 bg-white/10 text-white/75";
  }
}

function SetupProgressBar({ row }: { row: LogisticsProviderRow }) {
  const steps = [
    { key: "businessAccount", label: "Business Account", done: row.setupProgress.businessAccount },
    { key: "apiCredentials", label: "API Credentials", done: row.setupProgress.apiCredentials },
    { key: "connected", label: "Connected", done: row.setupProgress.connected },
  ] as const;

  return (
    <ul className="space-y-1.5 text-[11px] text-white/75">
      {steps.map((step) => (
        <li key={step.key} className="flex items-center gap-2">
          {step.done ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
          ) : (
            <X className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
          )}
          <span className={step.done ? "text-white/90" : "text-white/60"}>{step.label}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LogisticsShippingProvidersPage({
  onBack,
  onAddProvider,
  onContinueSetup,
}: LogisticsShippingProvidersPageProps) {
  const [rows, setRows] = useState<LogisticsProviderRow[]>(() => buildInitialLogisticsProviderRows());
  const [guideProviderCode, setGuideProviderCode] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const guideRow = useMemo(
    () => rows.find((row) => row.providerCode === guideProviderCode) ?? null,
    [rows, guideProviderCode],
  );

  const summary = useMemo(() => {
    const connected = rows.filter((row) => row.connectionStatus === "connected").length;
    const inProgress = rows.filter((row) => row.connectionStatus === "setup_in_progress").length;
    return { connected, inProgress, total: rows.length };
  }, [rows]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  function updateRow(code: string, patch: Partial<LogisticsProviderRow>) {
    setRows((current) =>
      current.map((row) => (row.providerCode === code ? { ...row, ...patch } : row)),
    );
  }

  function handleConnect(row: LogisticsProviderRow) {
    if (row.isManualSystemProvider) return;
    onContinueSetup(row.providerCode);
  }

  function handleContinueSetup(row: LogisticsProviderRow) {
    onContinueSetup(row.providerCode);
  }

  function handleManage(row: LogisticsProviderRow) {
    flash(`Manage ${row.registry.name} (mock — credentials via Integration Framework later).`);
  }

  function handleTestConnection(row: LogisticsProviderRow) {
    if (row.isManualSystemProvider) {
      flash("Unit311 Logistics does not require a connection test.");
      return;
    }
    if (row.connectionStatus !== "connected" && row.connectionStatus !== "disconnected") {
      flash("Connect the provider before testing.");
      return;
    }
    const ok = row.health !== "failed";
    updateRow(row.providerCode, {
      health: ok ? "healthy" : "failed",
      lastTestAt: new Date().toISOString(),
      connectionStatus: ok ? "connected" : "disconnected",
    });
    flash(
      ok
        ? `Test Connection: ${row.registry.name} — Connected (mock).`
        : `Test Connection: ${row.registry.name} — Failed (mock).`,
    );
  }

  function handleDisconnect(row: LogisticsProviderRow) {
    if (row.isManualSystemProvider) {
      flash("Unit311 Logistics cannot be disconnected.");
      return;
    }
    updateRow(row.providerCode, {
      connectionStatus: "disconnected",
      health: "unknown",
      setupProgress: { ...row.setupProgress, connected: false },
    });
    flash(`${row.registry.name} disconnected (mock).`);
  }

  return (
    <div className="space-y-6">
      <section className={panelClassName}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-sky-200 hover:text-sky-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Logistics
            </button>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              Logistics → Shipping Providers
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Shipping Providers</h2>
            <p className="mt-1 max-w-xl text-sm text-white/70">
              Providers from the Provider Registry. Connection states are mock — no live courier APIs
              in this phase.
            </p>
          </div>
          <button type="button" onClick={onAddProvider} className={cn(primaryActionClassName, "min-h-11 px-4 text-xs")}>
            <Plus className="h-3.5 w-3.5" />
            Add Provider
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-200/80">Connected</p>
            <p className="text-lg font-semibold text-white">{summary.connected}</p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-amber-200/80">In progress</p>
            <p className="text-lg font-semibold text-white">{summary.inProgress}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">In registry</p>
            <p className="text-lg font-semibold text-white">{summary.total}</p>
          </div>
        </div>

        {toast ? (
          <p className="mt-4 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
            {toast}
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.providerCode}
            className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0b1524]">
                    <Link2 className="h-4 w-4 text-sky-200" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">{row.registry.name}</h3>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                      {row.isManualSystemProvider ? "System provider" : "Registry provider"}
                    </p>
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
                  statusPillClass(row.connectionStatus),
                )}
              >
                {connectionStatusLabel(row.connectionStatus)}
              </span>
            </div>

            <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-[#0b1524]/70 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-[0.1em] text-white/50">Business account</dt>
                <dd className="mt-0.5 font-medium text-white/90">
                  {businessAccountLabel(row.businessAccountStatus)}
                </dd>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0b1524]/70 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-[0.1em] text-white/50">API status</dt>
                <dd className="mt-0.5 font-medium text-white/90">{apiStatusLabel(row.apiStatus)}</dd>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0b1524]/70 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-[0.1em] text-white/50">Connection health</dt>
                <dd className="mt-0.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
                      healthPillClass(row.health),
                    )}
                  >
                    {healthLabel(row.health)}
                  </span>
                </dd>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0b1524]/70 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-[0.1em] text-white/50">Last test</dt>
                <dd className="mt-0.5 font-medium text-white/90">
                  {row.lastTestAt
                    ? new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(row.lastTestAt))
                    : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-3 rounded-lg border border-white/10 bg-[#0b1524]/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-white/50">Capabilities</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/80"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-white/10 bg-[#0b1524]/70 px-3 py-2">
              <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-white/50">Setup progress</p>
              <SetupProgressBar row={row} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!row.isManualSystemProvider && row.connectionStatus === "not_connected" ? (
                <button type="button" className={primaryActionClassName} onClick={() => handleConnect(row)}>
                  <Plug className="h-3 w-3" />
                  Connect
                </button>
              ) : null}
              {!row.isManualSystemProvider && row.connectionStatus === "setup_in_progress" ? (
                <button
                  type="button"
                  className={primaryActionClassName}
                  onClick={() => handleContinueSetup(row)}
                >
                  <PlugZap className="h-3 w-3" />
                  Continue Setup
                </button>
              ) : null}
              {!row.isManualSystemProvider &&
              (row.connectionStatus === "connected" || row.connectionStatus === "disconnected") ? (
                <button type="button" className={actionBtnClassName} onClick={() => handleManage(row)}>
                  <Settings2 className="h-3 w-3" />
                  Manage
                </button>
              ) : null}
              <button
                type="button"
                className={actionBtnClassName}
                disabled={row.isManualSystemProvider}
                onClick={() => handleTestConnection(row)}
              >
                <RefreshCw className="h-3 w-3" />
                Test Connection
              </button>
              <button
                type="button"
                className={actionBtnClassName}
                disabled={
                  row.isManualSystemProvider ||
                  (row.connectionStatus !== "connected" && row.connectionStatus !== "disconnected")
                }
                onClick={() => handleDisconnect(row)}
              >
                <Unplug className="h-3 w-3" />
                Disconnect
              </button>
              <button
                type="button"
                className={actionBtnClassName}
                onClick={() => setGuideProviderCode(row.providerCode)}
              >
                <BookOpen className="h-3 w-3" />
                View Setup Guide
              </button>
            </div>
          </article>
        ))}
      </div>

      {guideRow ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-guide-title"
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#0b1524] p-5 shadow-2xl">
            <h3 id="setup-guide-title" className="text-base font-semibold text-white">
              Setup guide — {guideRow.registry.name}
            </h3>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-white/80">
              <li>Confirm you have a business account with the provider (if required for API).</li>
              <li>Obtain API credentials from the provider developer portal.</li>
              <li>Use Connect / Continue Setup to open the Logistics Setup Wizard marketplace path.</li>
              <li>Complete the Integration Framework connection when live APIs are enabled.</li>
              <li>Test Connection, then use the provider on shipments.</li>
            </ol>
            <p className="mt-4 text-xs text-white/55">
              Mock guide only — no live API documentation linked in this phase.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className={primaryActionClassName}
                onClick={() => setGuideProviderCode(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

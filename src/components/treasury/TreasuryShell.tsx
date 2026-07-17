"use client";

import { useCallback, useEffect, useState } from "react";

import TreasuryActivityFeed from "@/components/treasury/TreasuryActivityFeed";
import TreasuryAnalyticsPage from "@/components/treasury/TreasuryAnalyticsPage";
import TreasuryApprovalPanel from "@/components/treasury/TreasuryApprovalPanel";
import TreasuryConvertPage from "@/components/treasury/TreasuryConvertPage";
import TreasuryDashboard from "@/components/treasury/TreasuryDashboard";
import TreasuryRecipientsPage from "@/components/treasury/TreasuryRecipientsPage";
import TreasurySendMoneyWizard from "@/components/treasury/TreasurySendMoneyWizard";
import TreasurySettingsPage from "@/components/treasury/TreasurySettingsPage";
import TreasuryTransactionsPage from "@/components/treasury/TreasuryTransactionsPage";
import { TreasuryProvider, useTreasuryContext } from "@/components/treasury/treasury-context";
import {
  readTreasuryApiJson,
  treasuryPanelClassName,
} from "@/components/treasury/treasury-ui";
import type {
  TreasuryActivityItem,
  TreasuryAnalytics,
  TreasuryNotification,
  TreasurySummary,
  TreasuryView,
} from "@/lib/treasury/treasury-types";
import {
  buildBalanceSnapshotAnalytics,
  computeTreasurySummary,
} from "@/lib/treasury/treasury-analytics";
import type { WiseBalance, WiseConnectionStatus } from "@/lib/wise-service";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeftRight,
  BarChart3,
  Loader2,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

type TreasuryShellProps = {
  status: WiseConnectionStatus | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  isAdmin?: boolean;
};

type SummaryPayload = {
  summary: TreasurySummary;
  analytics: TreasuryAnalytics;
  activity: TreasuryActivityItem[];
  notifications: TreasuryNotification[];
  balances: WiseBalance[];
  statementsAvailable?: boolean;
  statementsWarning?: string | null;
  statementErrors?: Array<{
    error?: string;
    wise?: Record<string, unknown>;
  }>;
};

function StatusBadge({
  connected,
  configured,
}: {
  connected: boolean;
  configured: boolean;
}) {
  if (!configured) {
    return (
      <span className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-200">
        Setup required
      </span>
    );
  }

  if (connected) {
    return (
      <span className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-200">
        Connected
      </span>
    );
  }

  return (
    <span className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-200">
      Connection error
    </span>
  );
}

function TreasuryToastStack() {
  const { toasts, dismissToast } = useTreasuryContext();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-xl border border-white/15 bg-[#0a1422]/95 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{toast.title}</p>
              <p className="mt-1 text-xs text-white/60">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-xs text-white/45 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TreasuryShellContent({
  status,
  loading,
  refreshing,
  error,
  onRefresh,
  isAdmin = true,
}: TreasuryShellProps) {
  const { setNotifications } = useTreasuryContext();
  const [view, setView] = useState<TreasuryView>("dashboard");
  const [selectedBalance, setSelectedBalance] = useState<{ balanceId: number; currency: string } | null>(
    null,
  );
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [statementsWarning, setStatementsWarning] = useState<string | null>(null);
  const [statementErrors, setStatementErrors] = useState<SummaryPayload["statementErrors"]>(undefined);
  const [payload, setPayload] = useState<SummaryPayload | null>(null);

  const loadSummary = useCallback(async () => {
    if (!status?.connected) {
      setPayload(null);
      setSummaryLoading(false);
      setStatementsWarning(null);
      setStatementErrors(undefined);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    setStatementsWarning(null);
    setStatementErrors(undefined);

    try {
      const response = await fetch("/api/financials/wise/summary", { cache: "no-store" });
      const data = await readTreasuryApiJson<
        SummaryPayload & { error?: string; balances?: WiseBalance[] }
      >(response);

      if (!response.ok) {
        const balancesResponse = await fetch("/api/financials/wise/balances", {
          cache: "no-store",
        });
        const balancesData = await readTreasuryApiJson<{
          balances?: WiseBalance[];
          fetchedAt?: string;
          error?: string;
        }>(balancesResponse);

        if (balancesResponse.ok && balancesData.balances) {
          const balanceAmounts = balancesData.balances.map((balance) => ({
            currency: balance.currency,
            amount: balance.amount,
          }));
          setPayload({
            summary: computeTreasurySummary([], balanceAmounts),
            analytics: buildBalanceSnapshotAnalytics(balanceAmounts),
            activity: [],
            notifications: [],
            balances: balancesData.balances,
            statementsAvailable: false,
            statementsWarning: data.error ?? "Treasury analytics unavailable.",
          });
          setStatementsWarning(data.error ?? "Treasury analytics unavailable.");
          setStatementErrors(undefined);
          setNotifications([]);
          return;
        }

        throw new Error(data.error ?? "Failed to load treasury summary.");
      }

      setPayload(data);
      setNotifications(data.notifications ?? []);
      setStatementsWarning(data.statementsWarning ?? null);
      setStatementErrors(data.statementErrors ?? undefined);
    } catch (loadError) {
      setSummaryError(
        loadError instanceof Error ? loadError.message : "Failed to load treasury summary.",
      );
      setPayload(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [status?.connected, setNotifications]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  function navigate(
    nextView: TreasuryView,
    params?: { balanceId?: number; currency?: string },
  ) {
    if (params?.balanceId && params.currency) {
      setSelectedBalance({ balanceId: params.balanceId, currency: params.currency });
    }
    setView(nextView);
  }

  const navItems: Array<{ view: TreasuryView; label: string; icon: typeof Wallet }> = [
    { view: "dashboard", label: "Dashboard", icon: Wallet },
    { view: "recipients", label: "Recipients", icon: Users },
    { view: "convert", label: "Convert", icon: ArrowLeftRight },
    { view: "analytics", label: "Analytics", icon: BarChart3 },
    { view: "approvals", label: "Approvals", icon: ShieldCheck },
    { view: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <section className={treasuryPanelClassName()}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
              <Wallet className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
                Treasury Management
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-white">Wise</h2>
              <p className="mt-1 max-w-2xl text-sm text-white/55">
                Live balances, transaction history, transfers, conversions, analytics, and approvals.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status ? <StatusBadge configured={status.configured} connected={status.connected} /> : null}
            <button
              type="button"
              onClick={() => navigate("send")}
              disabled={!status?.connected}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Send Money
            </button>
            <button
              type="button"
              onClick={() => {
                onRefresh();
                void loadSummary();
              }}
              disabled={loading || refreshing || summaryLoading}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", (refreshing || summaryLoading) && "animate-spin")}
              />
              Refresh
            </button>
          </div>
        </div>

        {status?.connected ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.view;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => navigate(item.view)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors",
                    active
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {loading ? (
        <section className={treasuryPanelClassName()}>
          <div className="flex items-center gap-3 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking Wise connection…
          </div>
        </section>
      ) : null}

      {error ? (
        <section className={treasuryPanelClassName()}>
          <div className="flex items-start gap-2 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </section>
      ) : null}

      {summaryError && !payload ? (
        <section className={treasuryPanelClassName()}>
          <div className="flex items-start gap-2 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{summaryError}</span>
          </div>
        </section>
      ) : null}

      {statementsWarning ? (
        <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p>{statementsWarning}</p>
          {statementErrors?.[0]?.wise ? (
            <details className="mt-3 text-xs text-amber-100/70">
              <summary className="cursor-pointer text-amber-50/90">Wise API details</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/25 p-3 text-[11px] leading-relaxed text-amber-50/80">
                {JSON.stringify(statementErrors[0].wise, null, 2)}
              </pre>
            </details>
          ) : null}
        </section>
      ) : null}

      {status?.connected && payload ? (
        <>
          {view === "dashboard" ? (
            <TreasuryDashboard
              summary={payload.summary}
              analytics={payload.analytics}
              activity={payload.activity}
              balances={payload.balances}
              loading={summaryLoading}
              onNavigate={navigate}
              onSendMoney={() => navigate("send")}
            />
          ) : null}

          {view === "transactions" && selectedBalance ? (
            <TreasuryTransactionsPage
              balanceId={selectedBalance.balanceId}
              currency={selectedBalance.currency}
              isAdmin={isAdmin}
              onBack={() => navigate("dashboard")}
            />
          ) : null}

          {view === "send" ? (
            <TreasurySendMoneyWizard
              balances={payload.balances}
              onCancel={() => navigate("dashboard")}
              onComplete={() => {
                navigate("dashboard");
                void loadSummary();
              }}
            />
          ) : null}

          {view === "recipients" ? <TreasuryRecipientsPage /> : null}

          {view === "convert" ? (
            <TreasuryConvertPage
              balances={payload.balances}
              onComplete={() => {
                navigate("dashboard");
                void loadSummary();
              }}
            />
          ) : null}

          {view === "analytics" ? (
            <TreasuryAnalyticsPage analytics={payload.analytics} />
          ) : null}

          {view === "approvals" ? (
            <TreasuryApprovalPanel onResolved={() => void loadSummary()} />
          ) : null}

          {view === "settings" ? <TreasurySettingsPage /> : null}
        </>
      ) : null}

      {status?.connected && summaryLoading && !payload ? (
        <section className={treasuryPanelClassName()}>
          <div className="flex items-center gap-3 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading treasury dashboard…
          </div>
        </section>
      ) : null}

      <TreasuryToastStack />
    </div>
  );
}

export default function TreasuryShell(props: TreasuryShellProps) {
  return (
    <TreasuryProvider>
      <TreasuryShellContent {...props} />
    </TreasuryProvider>
  );
}

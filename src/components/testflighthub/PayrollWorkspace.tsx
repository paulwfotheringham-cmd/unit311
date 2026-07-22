"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Play,
  RefreshCw,
  Settings2,
  Wallet,
} from "lucide-react";

import { formatMoney } from "@/lib/accounting/chart-of-accounts";
import type {
  PayrollDashboardSnapshot,
  PayrollRun,
  PayrollSettings,
} from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

type Panel = "dashboard" | "runs" | "settings";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

function statusClass(status: string) {
  if (status === "paid") return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
  if (status === "approved" || status === "ready")
    return "border-sky-400/30 bg-sky-500/15 text-sky-100";
  if (status === "processing") return "border-amber-400/30 bg-amber-500/15 text-amber-100";
  if (status === "cancelled") return "border-rose-400/30 bg-rose-500/15 text-rose-100";
  return "border-white/15 bg-white/5 text-white/70";
}

export default function PayrollWorkspace() {
  const [panel, setPanel] = useState<Panel>("dashboard");
  const [dashboard, setDashboard] = useState<PayrollDashboardSnapshot | null>(null);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const money = useCallback(
    (value: number, currency = dashboard?.currency ?? settings?.defaultCurrency ?? "USD") =>
      formatMoney(value, currency),
    [dashboard?.currency, settings?.defaultCurrency],
  );

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, runsRes, settingsRes] = await Promise.all([
        fetch("/api/payroll/dashboard", { cache: "no-store" }),
        fetch("/api/payroll/runs", { cache: "no-store" }),
        fetch("/api/payroll/settings", { cache: "no-store" }),
      ]);
      const dashData = await readJson<{ dashboard?: PayrollDashboardSnapshot; error?: string }>(
        dashRes,
      );
      const runsData = await readJson<{ runs?: PayrollRun[]; error?: string }>(runsRes);
      const settingsData = await readJson<{ settings?: PayrollSettings; error?: string }>(
        settingsRes,
      );
      if (!dashRes.ok) throw new Error(dashData.error ?? "Failed to load dashboard");
      if (!runsRes.ok) throw new Error(runsData.error ?? "Failed to load runs");
      if (!settingsRes.ok) throw new Error(settingsData.error ?? "Failed to load settings");
      setDashboard(dashData.dashboard ?? null);
      setRuns(runsData.runs ?? []);
      setSettings(settingsData.settings ?? null);
      if (!selectedRunId && (runsData.runs?.length ?? 0) > 0) {
        setSelectedRunId(runsData.runs![0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payroll");
    } finally {
      setLoading(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  async function createRun() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await readJson<{ run?: PayrollRun; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to create run");
      setMessage("Draft payroll run created from live employee salaries.");
      setSelectedRunId(data.run?.id ?? null);
      setPanel("runs");
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function setRunStatus(runId: string, status: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/payroll/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Status update failed");
      await load();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function approveRun(runId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/payroll/runs/${runId}/approve`, { method: "POST" });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Approve failed");
      setMessage("Payroll approved and GL accrual journal posted.");
      await load();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function payRun(runId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/payroll/runs/${runId}/pay`, { method: "POST" });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Payment failed");
      setMessage("Payroll paid via Wise batch · payment journal posted.");
      await load();
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/payroll/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await readJson<{ settings?: PayrollSettings; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to save settings");
      setSettings(data.settings ?? settings);
      setMessage("Payroll settings saved — all employees recalculate from these rates.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function openRun(runId: string) {
    setSelectedRunId(runId);
    setPanel("runs");
    try {
      const response = await fetch(`/api/payroll/runs/${runId}`, { cache: "no-store" });
      const data = await readJson<{ run?: PayrollRun; error?: string }>(response);
      if (response.ok && data.run) {
        setRuns((current) => {
          const others = current.filter((run) => run.id !== runId);
          return [data.run!, ...others];
        });
      }
    } catch {
      /* keep list */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/90">
            Human Resources
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Payroll</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            US monthly payroll engine integrated with HR salaries, General Ledger, Accounts Payable,
            Wise, and the Executive Dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createRun()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/20 px-3 text-xs font-semibold text-violet-50"
          >
            <Play className="h-3.5 w-3.5" />
            Create payroll run
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["dashboard", "Dashboard", Wallet],
            ["runs", "Payroll runs", CheckCircle2],
            ["settings", "Settings", Settings2],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPanel(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold",
              panel === id
                ? "border-violet-400/40 bg-violet-500/20 text-white"
                : "border-white/10 text-white/60 hover:border-white/20 hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      {loading && !dashboard ? (
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payroll…
        </div>
      ) : null}

      {panel === "dashboard" && dashboard ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Monthly gross payroll" value={money(dashboard.monthlyGrossPayroll)} />
            <Kpi
              label="Estimated employer taxes"
              value={money(dashboard.estimatedEmployerTaxes)}
            />
            <Kpi
              label="Estimated employee tax withheld"
              value={money(dashboard.estimatedEmployeeTaxWithheld)}
            />
            <Kpi label="Estimated net payroll" value={money(dashboard.estimatedNetPayroll)} />
            <Kpi
              label="Next payroll date"
              value={dashboard.nextPayrollDate}
              hint={`${dashboard.employeeCount} employees`}
            />
            <Kpi
              label="Payroll run status"
              value={String(dashboard.payrollRunStatus).toUpperCase()}
            />
            <Kpi label="Employees paid" value={String(dashboard.employeesPaid)} />
            <Kpi label="Pending payroll" value={String(dashboard.pendingPayroll)} />
            <Kpi label="Average salary" value={money(dashboard.averageSalary)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-white">Payroll trend</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.trend}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="gross" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="net" fill="#34d399" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-white">Department payroll</h3>
              <div className="mt-4 space-y-2">
                {dashboard.departmentBreakdown.length === 0 ? (
                  <p className="text-sm text-white/45">No eligible employees yet.</p>
                ) : (
                  dashboard.departmentBreakdown.map((row) => (
                    <div
                      key={row.department}
                      className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-white">{row.department}</p>
                        <p className="text-xs text-white/45">{row.employees} people</p>
                      </div>
                      <p className="tabular-nums text-white">{money(row.gross)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-violet-300" />
                <h3 className="text-sm font-semibold text-white">Upcoming payroll calendar</h3>
              </div>
              <div className="mt-4 space-y-2">
                {dashboard.upcomingCalendar.map((item) => (
                  <div
                    key={item.date}
                    className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/45">{item.date}</p>
                    </div>
                    <p className="tabular-nums text-white">{money(item.amount)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-white">Recent payroll runs</h3>
              <div className="mt-4 space-y-2">
                {dashboard.recentRuns.length === 0 ? (
                  <p className="text-sm text-white/45">No runs yet — create the first draft.</p>
                ) : (
                  dashboard.recentRuns.map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => void openRun(run.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-white/8 px-3 py-2 text-left text-sm hover:border-white/20"
                    >
                      <div>
                        <p className="font-medium text-white">Pay {run.payDate}</p>
                        <p className="text-xs text-white/45">
                          {run.employeeCount} employees · {money(run.grossPayroll, run.currency)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                          statusClass(run.status),
                        )}
                      >
                        {run.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {panel === "runs" ? (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {runs.length === 0 ? (
              <p className="p-3 text-sm text-white/45">No payroll runs.</p>
            ) : (
              runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => void openRun(run.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm",
                    selectedRunId === run.id
                      ? "border-violet-400/40 bg-violet-500/15"
                      : "border-white/8 hover:border-white/20",
                  )}
                >
                  <p className="font-medium text-white">{run.payDate}</p>
                  <p className="text-xs text-white/45">
                    {run.status} · {money(run.netPayroll, run.currency)}
                  </p>
                </button>
              ))
            )}
          </div>

          {selectedRun ? (
            <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Payroll run</h3>
                  <p className="mt-1 text-sm text-white/50">
                    Period {selectedRun.periodStart} → {selectedRun.periodEnd}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase",
                    statusClass(selectedRun.status),
                  )}
                >
                  {selectedRun.status}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Employee count" value={String(selectedRun.employeeCount)} />
                <Kpi
                  label="Gross payroll"
                  value={money(selectedRun.grossPayroll, selectedRun.currency)}
                />
                <Kpi
                  label="Taxes"
                  value={money(
                    selectedRun.employeeTax + selectedRun.employerTax,
                    selectedRun.currency,
                  )}
                />
                <Kpi
                  label="Net payroll"
                  value={money(selectedRun.netPayroll, selectedRun.currency)}
                />
                <Kpi
                  label="Journal status"
                  value={selectedRun.journalEntryId ? "Posted" : "Not posted"}
                />
                <Kpi
                  label="Wise payment status"
                  value={selectedRun.wisePaymentStatus.toUpperCase()}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedRun.status === "draft" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setRunStatus(selectedRun.id, "ready")}
                    className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80"
                  >
                    Mark ready
                  </button>
                ) : null}
                {selectedRun.status === "ready" || selectedRun.status === "draft" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void approveRun(selectedRun.id)}
                    className="rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-50"
                  >
                    Approve + post GL
                  </button>
                ) : null}
                {selectedRun.status === "approved" || selectedRun.status === "processing" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void payRun(selectedRun.id)}
                    className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-50"
                  >
                    Pay via Wise
                  </button>
                ) : null}
                {!["paid", "cancelled"].includes(selectedRun.status) ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setRunStatus(selectedRun.id, "cancelled")}
                    className="rounded-xl border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-100"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-white/45">
                    <tr>
                      <th className="px-3 py-2">Employee</th>
                      <th className="px-3 py-2">Department</th>
                      <th className="px-3 py-2">Gross</th>
                      <th className="px-3 py-2">Employee tax</th>
                      <th className="px-3 py-2">Employer tax</th>
                      <th className="px-3 py-2">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRun.lines ?? []).map((line) => (
                      <tr key={line.id} className="border-t border-white/8">
                        <td className="px-3 py-2 text-white">{line.employeeName}</td>
                        <td className="px-3 py-2 text-white/60">{line.department || "—"}</td>
                        <td className="px-3 py-2 tabular-nums text-white">
                          {money(line.gross, line.currency)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-white/70">
                          {money(
                            line.federalTax + line.stateTax + line.socialSecurity + line.medicare,
                            line.currency,
                          )}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-white/70">
                          {money(line.employerTax, line.currency)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-white">
                          {money(line.net, line.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-white/45">
              Select a payroll run.
            </div>
          )}
        </div>
      ) : null}

      {panel === "settings" && settings ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white">Payroll settings</h3>
          <p className="text-sm text-white/50">
            Applies to all employees unless overridden on the employee Payroll tab. V1: United States,
            monthly, USD.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(
              [
                ["federalTaxPct", "Federal tax %"],
                ["stateTaxPct", "State tax %"],
                ["socialSecurityPct", "Social Security %"],
                ["medicarePct", "Medicare %"],
                ["employerPayrollPct", "Employer payroll %"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm text-white/70">
                {label}
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                  value={settings[key]}
                  onChange={(event) =>
                    setSettings({ ...settings, [key]: Number(event.target.value) })
                  }
                />
              </label>
            ))}
            <label className="block text-sm text-white/70">
              Default currency
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                value={settings.defaultCurrency}
                onChange={(event) =>
                  setSettings({ ...settings, defaultCurrency: event.target.value.toUpperCase() })
                }
              />
            </label>
            <label className="block text-sm text-white/70">
              Payroll frequency
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                value={settings.payrollFrequency}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    payrollFrequency: event.target.value as PayrollSettings["payrollFrequency"],
                  })
                }
              >
                <option value="monthly">Monthly</option>
                <option value="biweekly">Biweekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label className="block text-sm text-white/70">
              Pay day (0 = last day of month)
              <input
                type="number"
                min={0}
                max={28}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                value={settings.payDay}
                onChange={(event) =>
                  setSettings({ ...settings, payDay: Number(event.target.value) })
                }
              />
            </label>
            <label className="block text-sm text-white/70">
              Default tax state
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                value={settings.defaultTaxState}
                onChange={(event) =>
                  setSettings({ ...settings, defaultTaxState: event.target.value.toUpperCase() })
                }
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveSettings()}
            className="rounded-xl border border-violet-400/30 bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-50"
          >
            Save settings
          </button>
        </section>
      ) : null}
    </div>
  );
}

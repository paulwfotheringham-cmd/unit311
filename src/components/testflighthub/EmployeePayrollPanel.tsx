"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { formatMoney } from "@/lib/accounting/chart-of-accounts";
import type { PayrollCalculation, PayrollEmployeeProfile } from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-white/70">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white";

export default function EmployeePayrollPanel({ employeeId }: { employeeId: string }) {
  const [profile, setProfile] = useState<Partial<PayrollEmployeeProfile>>({});
  const [calculation, setCalculation] = useState<PayrollCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/payroll/employees/${employeeId}/profile`, {
        cache: "no-store",
      });
      const data = await readJson<{
        profile?: PayrollEmployeeProfile | null;
        calculation?: PayrollCalculation;
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load payroll profile");
      setProfile(data.profile ?? {});
      setCalculation(data.calculation ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payroll");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/payroll/employees/${employeeId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await readJson<{
        profile?: PayrollEmployeeProfile;
        calculation?: PayrollCalculation;
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to save");
      setProfile(data.profile ?? profile);
      setCalculation(data.calculation ?? null);
      setMessage("Payroll profile saved — Finance and Dashboard recalculate automatically.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function patch<K extends keyof PayrollEmployeeProfile>(
    key: K,
    value: PayrollEmployeeProfile[K],
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/55">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payroll…
      </div>
    );
  }

  const currency = calculation?.currency ?? profile.currency ?? "USD";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Payroll</h3>
          <p className="mt-1 text-sm text-white/50">
            Salary feeds from HR compensation. Taxes calculate automatically from Payroll Settings
            (US V1).
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-sm text-violet-100"
        >
          <Save className="h-4 w-4" />
          Save payroll
        </button>
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

      {calculation ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Gross salary", calculation.gross],
            ["Federal tax", calculation.federalTax],
            ["State tax", calculation.stateTax],
            ["Social Security", calculation.socialSecurity],
            ["Medicare", calculation.medicare],
            ["Employer tax", calculation.employerTax],
            ["Net salary", calculation.net],
            ["Total employment cost", calculation.totalEmploymentCost],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                {label}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                {formatMoney(Number(value), currency)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Annual salary">
          <input
            type="number"
            className={inputClass}
            value={profile.annualSalary ?? ""}
            onChange={(event) =>
              patch("annualSalary", event.target.value === "" ? null : Number(event.target.value))
            }
          />
        </Field>
        <Field label="Monthly salary">
          <input
            type="number"
            className={inputClass}
            value={profile.monthlySalary ?? ""}
            onChange={(event) =>
              patch("monthlySalary", event.target.value === "" ? null : Number(event.target.value))
            }
          />
        </Field>
        <Field label="Hourly rate (optional)">
          <input
            type="number"
            className={inputClass}
            value={profile.hourlyRate ?? ""}
            onChange={(event) =>
              patch("hourlyRate", event.target.value === "" ? null : Number(event.target.value))
            }
          />
        </Field>
        <Field label="Bonus">
          <input
            type="number"
            className={inputClass}
            value={profile.bonus ?? 0}
            onChange={(event) => patch("bonus", Number(event.target.value))}
          />
        </Field>
        <Field label="Commission">
          <input
            type="number"
            className={inputClass}
            value={profile.commission ?? 0}
            onChange={(event) => patch("commission", Number(event.target.value))}
          />
        </Field>
        <Field label="Payroll frequency">
          <select
            className={inputClass}
            value={profile.payrollFrequency ?? "monthly"}
            onChange={(event) =>
              patch(
                "payrollFrequency",
                event.target.value as PayrollEmployeeProfile["payrollFrequency"],
              )
            }
          >
            <option value="monthly">Monthly</option>
            <option value="biweekly">Biweekly</option>
            <option value="weekly">Weekly</option>
            <option value="annual">Annual</option>
          </select>
        </Field>
        <Field label="Currency">
          <input
            className={inputClass}
            value={profile.currency ?? "USD"}
            onChange={(event) => patch("currency", event.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Tax state">
          <input
            className={inputClass}
            value={profile.taxState ?? "CA"}
            onChange={(event) => patch("taxState", event.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Federal tax % (override)">
          <input
            type="number"
            className={inputClass}
            value={profile.federalTaxPct ?? ""}
            onChange={(event) =>
              patch(
                "federalTaxPct",
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          />
        </Field>
        <Field label="State tax % (override)">
          <input
            type="number"
            className={inputClass}
            value={profile.stateTaxPct ?? ""}
            onChange={(event) =>
              patch("stateTaxPct", event.target.value === "" ? null : Number(event.target.value))
            }
          />
        </Field>
        <Field label="Social Security % (override)">
          <input
            type="number"
            className={inputClass}
            value={profile.socialSecurityPct ?? ""}
            onChange={(event) =>
              patch(
                "socialSecurityPct",
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          />
        </Field>
        <Field label="Medicare % (override)">
          <input
            type="number"
            className={inputClass}
            value={profile.medicarePct ?? ""}
            onChange={(event) =>
              patch("medicarePct", event.target.value === "" ? null : Number(event.target.value))
            }
          />
        </Field>
        <Field label="Payroll status">
          <select
            className={inputClass}
            value={profile.payrollStatus ?? "active"}
            onChange={(event) =>
              patch(
                "payrollStatus",
                event.target.value as PayrollEmployeeProfile["payrollStatus"],
              )
            }
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="terminated">Terminated</option>
          </select>
        </Field>
        <Field label="Bank account">
          <input
            className={inputClass}
            value={profile.bankAccount ?? ""}
            onChange={(event) => patch("bankAccount", event.target.value)}
          />
        </Field>
        <Field label="Routing number">
          <input
            className={inputClass}
            value={profile.routingNumber ?? ""}
            onChange={(event) => patch("routingNumber", event.target.value)}
          />
        </Field>
        <Field label="Employee ID">
          <input
            className={inputClass}
            value={profile.payrollEmployeeId ?? ""}
            onChange={(event) => patch("payrollEmployeeId", event.target.value)}
          />
        </Field>
        <Field label="Tax ID">
          <input
            className={inputClass}
            value={profile.taxId ?? ""}
            onChange={(event) => patch("taxId", event.target.value)}
          />
        </Field>
        <Field label="Hire date">
          <input
            type="date"
            className={inputClass}
            value={profile.hireDate ?? ""}
            onChange={(event) => patch("hireDate", event.target.value || null)}
          />
        </Field>
        <Field label="Termination date">
          <input
            type="date"
            className={inputClass}
            value={profile.terminationDate ?? ""}
            onChange={(event) => patch("terminationDate", event.target.value || null)}
          />
        </Field>
        <Field label="Manager">
          <input
            className={inputClass}
            value={profile.manager ?? ""}
            onChange={(event) => patch("manager", event.target.value)}
          />
        </Field>
        <Field label="Department">
          <input
            className={inputClass}
            value={profile.department ?? ""}
            onChange={(event) => patch("department", event.target.value)}
          />
        </Field>
        <Field label="Cost centre">
          <input
            className={cn(inputClass)}
            value={profile.costCentre ?? ""}
            onChange={(event) => patch("costCentre", event.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

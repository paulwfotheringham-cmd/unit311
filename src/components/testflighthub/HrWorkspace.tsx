"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";

import {
  formatSalary,
  isActiveHeadcountStatus,
  type HrEmployee,
} from "@/lib/hr-data";
import HrDashboardPanel from "./HrDashboardPanel";
import EmployeeRecordWorkspace from "./EmployeeRecordWorkspace";
import DashboardTopTilesBar from "@/components/testflighthub/DashboardTopTilesBar";
import {
  DEFAULT_HR_TILE_LAYOUT,
  HR_DASHBOARD_TILES,
} from "@/lib/view-dashboard-tile-catalogs";
import { Loader2 } from "lucide-react";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

export default function HrWorkspace({ mode = "employees" }: { mode?: "dashboard" | "employees" }) {
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(mode === "dashboard");
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/hr/employees", { cache: "no-store" });
      const data = await readApiJson<{ employees?: HrEmployee[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load employees");
      setEmployees(data.employees ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "dashboard") return;
    startTransition(() => {
      void loadEmployees();
    });
  }, [loadEmployees, mode]);

  const activeHeadcount = useMemo(
    () => employees.filter((employee) => isActiveHeadcountStatus(employee.employmentStatus)).length,
    [employees],
  );

  const operationalPayroll = useMemo(
    () =>
      employees
        .filter(
          (employee) =>
            employee.employmentStatus !== "former_employee" &&
            employee.employmentStatus !== "archived",
        )
        .reduce((sum, employee) => sum + employee.salaryCurrent + employee.bonus, 0),
    [employees],
  );

  if (mode === "employees") {
    return <EmployeeRecordWorkspace />;
  }

  return (
    <div className="space-y-5">
      <DashboardTopTilesBar
        storageKey="hr-dashboard-tiles"
        catalog={HR_DASHBOARD_TILES}
        defaultLayout={DEFAULT_HR_TILE_LAYOUT}
        title="Customize tiles"
        showCustomizeHint
      />

      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-white">Human Resources</h2>
        <p className="text-sm text-white/50">
          Active headcount {loading ? "…" : activeHeadcount}
          {" · "}
          Operational payroll {loading ? "…" : formatSalary(operationalPayroll)}
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading HR dashboard…
        </div>
      ) : (
        <HrDashboardPanel employees={employees} />
      )}
    </div>
  );
}

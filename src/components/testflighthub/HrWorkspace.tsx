"use client";

import { useCallback, useEffect, useState, startTransition } from "react";

import type { HrEmployee } from "@/lib/hr-data";
import HrDashboardWorkspace from "./HrDashboardWorkspace";
import EmployeeRecordWorkspace from "./EmployeeRecordWorkspace";
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

  if (mode === "employees") {
    return <EmployeeRecordWorkspace />;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-10 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading HR dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
      <HrDashboardWorkspace employees={employees} />
    </div>
  );
}

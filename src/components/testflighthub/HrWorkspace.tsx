"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createBlankEmployeeInput,
  employeeFieldsEqual,
  formatHrDate,
  formatSalary,
  HR_DEPARTMENTS,
  HR_DOCUMENT_KEYS,
  HR_DOCUMENT_LABELS,
  HR_HOLIDAY_CALENDARS,
  HR_LOCATIONS,
  vacationDaysRemaining,
  type HrDocumentKey,
  type HrDocumentSlot,
  type HrEmployee,
} from "@/lib/hr-data";
import { cn } from "@/lib/utils";
import HrDashboardPanel from "./HrDashboardPanel";
import DashboardTopTilesBar from "@/components/testflighthub/DashboardTopTilesBar";
import {
  DEFAULT_HR_TILE_LAYOUT,
  HR_DASHBOARD_TILES,
} from "@/lib/view-dashboard-tile-catalogs";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import { Briefcase, FileText, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-400/50";
}

function selectClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-400/50";
}

function employeePayload(employee: HrEmployee) {
  return {
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    dateJoined: employee.dateJoined,
    location: employee.location,
    role: employee.role,
    department: employee.department,
    manager: employee.manager,
    salaryCurrent: employee.salaryCurrent,
    salaryPrevious: employee.salaryPrevious,
    salaryIncreaseDate: employee.salaryIncreaseDate,
    salaryIncreaseAmount: employee.salaryIncreaseAmount,
    bonus: employee.bonus,
    holidayCalendar: employee.holidayCalendar,
    vacationDaysPerYear: employee.vacationDaysPerYear,
    vacationDaysTaken: employee.vacationDaysTaken,
    documents: employee.documents,
  };
}

function EmployeeFieldsGrid({
  employee,
  onChange,
  managerOptions,
}: {
  employee: Omit<HrEmployee, "id"> | HrEmployee;
  onChange: (patch: Partial<HrEmployee>) => void;
  managerOptions: string[];
}) {
  const daysLeft = vacationDaysRemaining(employee);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FieldLabel>Full name</FieldLabel>
        <input
          className={inputClassName()}
          value={employee.fullName}
          onChange={(event) => onChange({ fullName: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Email</FieldLabel>
        <input
          type="email"
          className={inputClassName()}
          value={employee.email}
          onChange={(event) => onChange({ email: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Phone</FieldLabel>
        <input
          className={inputClassName()}
          value={employee.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Date joined</FieldLabel>
        <input
          type="date"
          className={inputClassName()}
          value={employee.dateJoined}
          onChange={(event) => onChange({ dateJoined: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Location</FieldLabel>
        <select
          className={selectClassName()}
          value={employee.location}
          onChange={(event) => onChange({ location: event.target.value })}
        >
          {HR_LOCATIONS.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Role</FieldLabel>
        <input
          className={inputClassName()}
          value={employee.role}
          placeholder="e.g. Training Manager"
          onChange={(event) => onChange({ role: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Department</FieldLabel>
        <select
          className={selectClassName()}
          value={employee.department}
          onChange={(event) => onChange({ department: event.target.value })}
        >
          <option value="">Select department</option>
          {HR_DEPARTMENTS.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Manager</FieldLabel>
        <input
          className={inputClassName()}
          list="hr-manager-options"
          value={employee.manager}
          placeholder="Line manager"
          onChange={(event) => onChange({ manager: event.target.value })}
        />
        <datalist id="hr-manager-options">
          {managerOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      <div>
        <FieldLabel>Current salary (EUR)</FieldLabel>
        <input
          type="number"
          min={0}
          step={500}
          className={inputClassName()}
          value={employee.salaryCurrent}
          onChange={(event) =>
            onChange({ salaryCurrent: Number(event.target.value) || 0 })
          }
        />
      </div>
      <div>
        <FieldLabel>Last salary (EUR)</FieldLabel>
        <input
          type="number"
          min={0}
          step={500}
          className={inputClassName()}
          value={employee.salaryPrevious}
          onChange={(event) =>
            onChange({ salaryPrevious: Number(event.target.value) || 0 })
          }
        />
      </div>
      <div>
        <FieldLabel>Last pay rise date</FieldLabel>
        <input
          type="date"
          className={inputClassName()}
          value={employee.salaryIncreaseDate ?? ""}
          onChange={(event) =>
            onChange({
              salaryIncreaseDate: event.target.value || null,
            })
          }
        />
      </div>
      <div>
        <FieldLabel>Last pay rise amount (EUR)</FieldLabel>
        <input
          type="number"
          min={0}
          step={500}
          className={inputClassName()}
          value={employee.salaryIncreaseAmount}
          onChange={(event) =>
            onChange({ salaryIncreaseAmount: Number(event.target.value) || 0 })
          }
        />
      </div>
      <div>
        <FieldLabel>Annual bonus (EUR)</FieldLabel>
        <input
          type="number"
          min={0}
          step={250}
          className={inputClassName()}
          value={employee.bonus}
          onChange={(event) => onChange({ bonus: Number(event.target.value) || 0 })}
        />
      </div>
      <div>
        <FieldLabel>Holiday calendar</FieldLabel>
        <select
          className={selectClassName()}
          value={employee.holidayCalendar}
          onChange={(event) => onChange({ holidayCalendar: event.target.value })}
        >
          {HR_HOLIDAY_CALENDARS.map((calendar) => (
            <option key={calendar} value={calendar}>
              {calendar}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Vacation days per year</FieldLabel>
        <input
          type="number"
          min={0}
          max={60}
          className={inputClassName()}
          value={employee.vacationDaysPerYear}
          onChange={(event) =>
            onChange({ vacationDaysPerYear: Number(event.target.value) || 0 })
          }
        />
      </div>
      <div>
        <FieldLabel>Days taken</FieldLabel>
        <input
          type="number"
          min={0}
          max={60}
          className={inputClassName()}
          value={employee.vacationDaysTaken}
          onChange={(event) =>
            onChange({ vacationDaysTaken: Number(event.target.value) || 0 })
          }
        />
      </div>
      <div>
        <FieldLabel>Days remaining</FieldLabel>
        <div className="mt-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80">
          {daysLeft} days
        </div>
      </div>
    </div>
  );
}

function DocumentCard({
  label,
  slot,
  onChange,
}: {
  label: string;
  slot: HrDocumentSlot;
  onChange: (next: HrDocumentSlot) => void;
}) {
  const onFile = Boolean(slot.fileName);

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-300/80" />
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">{label}</p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
            onFile
              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
              : "border-white/15 bg-white/5 text-white/40",
          )}
        >
          {onFile ? "On file" : "Missing"}
        </span>
      </div>
      <div className="mt-3 space-y-3">
        <div>
          <FieldLabel>File name</FieldLabel>
          <input
            className={inputClassName()}
            value={slot.fileName ?? ""}
            placeholder="e.g. employee_contract.pdf"
            onChange={(event) =>
              onChange({
                ...slot,
                fileName: event.target.value.trim() || null,
                uploadedAt: event.target.value.trim()
                  ? slot.uploadedAt ?? new Date().toISOString().slice(0, 10)
                  : null,
              })
            }
          />
        </div>
        <div>
          <FieldLabel>Uploaded</FieldLabel>
          <input
            type="date"
            className={inputClassName()}
            value={slot.uploadedAt ?? ""}
            onChange={(event) =>
              onChange({ ...slot, uploadedAt: event.target.value || null })
            }
          />
        </div>
      </div>
    </article>
  );
}

export default function HrWorkspace({ mode = "employees" }: { mode?: "dashboard" | "employees" }) {
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<HrEmployee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState(() => createBlankEmployeeInput());
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const snapshottedIdRef = useRef<string | null>(null);
  const { showDetail, openDetail, closeDetail } = useMobileDetailPanel();

  const roleOptions = useMemo(() => {
    const roles = new Set(employees.map((e) => e.role).filter(Boolean));
    return Array.from(roles).sort();
  }, [employees]);

  const locationOptions = useMemo(() => {
    const locations = new Set(employees.map((e) => e.location).filter(Boolean));
    return Array.from(locations).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    return employees.filter((employee) => {
      const roleMatch = roleFilter === "All" || employee.role === roleFilter;
      const locationMatch = locationFilter === "All" || employee.location === locationFilter;
      if (!roleMatch || !locationMatch) return false;
      if (!query) return true;
      const haystack =
        `${employee.fullName} ${employee.email} ${employee.role} ${employee.department} ${employee.location}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [employees, employeeSearch, roleFilter, locationFilter]);

  const hasEmployeeFilter =
    employeeSearch.trim().length > 0 || roleFilter !== "All" || locationFilter !== "All";

  const managerOptions = useMemo(
    () => employees.map((employee) => employee.fullName).filter(Boolean),
    [employees],
  );

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0] ?? null,
    [employees, selectedEmployeeId],
  );

  const isDirty = useMemo(() => {
    if (!selectedEmployee) return false;
    if (!savedSnapshot || savedSnapshot.id !== selectedEmployee.id) return true;
    return !employeeFieldsEqual(selectedEmployee, savedSnapshot);
  }, [selectedEmployee, savedSnapshot]);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/hr/employees", { cache: "no-store" });
      const data = await readApiJson<{ employees?: HrEmployee[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load employees");

      const nextEmployees = data.employees ?? [];
      setEmployees(nextEmployees);
      setSelectedEmployeeId((current) => {
        if (current && nextEmployees.some((employee) => employee.id === current)) return current;
        return nextEmployees[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load employees");
      setEmployees([]);
      setSelectedEmployeeId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      snapshottedIdRef.current = null;
      setSavedSnapshot(null);
      return;
    }
    if (snapshottedIdRef.current === selectedEmployeeId) return;
    const employee = employees.find((item) => item.id === selectedEmployeeId);
    if (employee) {
      snapshottedIdRef.current = selectedEmployeeId;
      setSavedSnapshot({ ...employee, documents: { ...employee.documents } });
    }
  }, [selectedEmployeeId, employees]);

  async function saveEmployee(employee: HrEmployee) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/hr/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeePayload(employee)),
      });

      const data = await readApiJson<{ employee?: HrEmployee; error?: string }>(response);
      if (!response.ok || !data.employee) throw new Error(data.error ?? "Failed to save employee");

      setEmployees((current) =>
        current.map((item) => (item.id === data.employee!.id ? data.employee! : item)),
      );
      snapshottedIdRef.current = data.employee.id;
      setSavedSnapshot(data.employee);
      setSaveMessage("Employee saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save employee");
    } finally {
      setBusy(false);
    }
  }

  function patchSelected(patch: Partial<HrEmployee>) {
    if (!selectedEmployee) return;
    const next = { ...selectedEmployee, ...patch };
    setEmployees((current) =>
      current.map((employee) => (employee.id === next.id ? next : employee)),
    );
    setSaveMessage(null);
  }

  function patchDocument(key: HrDocumentKey, slot: HrDocumentSlot) {
    if (!selectedEmployee) return;
    patchSelected({
      documents: { ...selectedEmployee.documents, [key]: slot },
    });
  }

  async function handleSaveEmployee() {
    if (!selectedEmployee) return;
    setError(null);
    setSaveMessage(null);
    await saveEmployee(selectedEmployee);
  }

  function openAddModal() {
    setNewEmployee(createBlankEmployeeInput());
    setShowAddModal(true);
    setError(null);
  }

  async function handleCreateEmployee() {
    if (!newEmployee.fullName.trim()) {
      setError("Full name is required to add a staff member.");
      return;
    }

    setBusy(true);
    setError(null);

    const slug = Date.now().toString(36);
    const draft = {
      ...newEmployee,
      fullName: newEmployee.fullName.trim(),
      email:
        newEmployee.email.trim() ||
        `${newEmployee.fullName.trim().toLowerCase().replace(/\s+/g, ".")}.${slug}@unit311.com`,
    };

    try {
      const response = await fetch("/api/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = await readApiJson<{ employee?: HrEmployee; error?: string }>(response);
      if (!response.ok || !data.employee) throw new Error(data.error ?? "Failed to create employee");

      setEmployees((current) => [data.employee!, ...current]);
      setSelectedEmployeeId(data.employee.id);
      snapshottedIdRef.current = data.employee.id;
      setSavedSnapshot(data.employee);
      setSaveMessage("Staff member added");
      setShowAddModal(false);
      openDetail();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create employee");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteEmployee() {
    if (!selectedEmployee) return;
    if (!window.confirm(`Remove "${selectedEmployee.fullName}" from HR records?`)) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/hr/employees/${selectedEmployee.id}`, {
        method: "DELETE",
      });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete employee");

      const remaining = employees.filter((employee) => employee.id !== selectedEmployee.id);
      setEmployees(remaining);
      setSelectedEmployeeId(remaining[0]?.id ?? null);
      setSaveMessage(null);
      if (remaining.length === 0) closeDetail();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete employee");
    } finally {
      setBusy(false);
    }
  }

  const totalPayroll = useMemo(
    () => employees.reduce((sum, employee) => sum + employee.salaryCurrent, 0),
    [employees],
  );

  return (
    <div className="space-y-6">
      {mode === "dashboard" ? (
        <>
          <DashboardTopTilesBar
            storageKey="unit311-hr-dashboard-tiles"
            catalog={HR_DASHBOARD_TILES}
            defaultLayout={DEFAULT_HR_TILE_LAYOUT}
            title="HR key details"
            showCustomizeHint={false}
          />
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10">
                  <Briefcase className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a78bfa]">
                    People
                  </p>
                  <h2 className="mt-0.5 text-lg font-semibold text-white">Human Resources</h2>
                  <p className="mt-1 text-sm text-white/55">
                    {employees.length} employees · {formatSalary(totalPayroll)} annual payroll
                  </p>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              {error.includes("hr_employees") && (
                <span className="mt-2 block text-xs text-red-200/80">
                  Run{" "}
                  <span className="font-mono">supabase/migrations/024_create_hr_employees.sql</span> in
                  Supabase.
                </span>
              )}
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-sm text-white/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading employees…
            </div>
          ) : (
            <HrDashboardPanel employees={employees} />
          )}
        </>
      ) : null}

      {mode === "employees" ? (
        <>
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10">
              <Briefcase className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a78bfa]">
                People
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-white">Employees</h2>
              <p className="mt-1 text-sm text-white/55">
                {employees.length} employees · {formatSalary(totalPayroll)} annual payroll
              </p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          {error.includes("hr_employees") && (
            <span className="mt-2 block text-xs text-red-200/80">
              Run{" "}
              <span className="font-mono">supabase/migrations/024_create_hr_employees.sql</span> in
              Supabase.
            </span>
          )}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading employees…
        </div>
      ) : (
        <ResponsiveMasterDetail
          showDetail={showDetail && !!selectedEmployee}
          onBack={closeDetail}
          backLabel="Back to employees"
          master={
            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Employees</h2>
                  <p className="mt-1 text-xs text-white/45">{employees.length} on record</p>
                </div>
                <button
                  type="button"
                  onClick={openAddModal}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-500/20 disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add staff
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                  <input
                    type="search"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder="Search by name, email, role…"
                    className={cn(inputClassName(), "mt-0 pl-9")}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Filter by role</FieldLabel>
                    <select
                      className={selectClassName()}
                      value={roleFilter}
                      onChange={(event) => setRoleFilter(event.target.value)}
                    >
                      <option value="All">All roles</option>
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Filter by location</FieldLabel>
                    <select
                      className={selectClassName()}
                      value={locationFilter}
                      onChange={(event) => setLocationFilter(event.target.value)}
                    >
                      <option value="All">All locations</option>
                      {locationOptions.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <FieldLabel>Select employee</FieldLabel>
                  <select
                    className={selectClassName()}
                    value={selectedEmployee?.id ?? ""}
                    onChange={(event) => {
                      setSelectedEmployeeId(event.target.value || null);
                      openDetail();
                    }}
                  >
                    <option value="">Choose an employee…</option>
                    {(hasEmployeeFilter ? filteredEmployees : employees).map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName} · {employee.role || employee.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {hasEmployeeFilter && (
                <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {filteredEmployees.length === 0 ? (
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/45">
                      No employees match your search or filters.
                    </li>
                  ) : (
                    filteredEmployees.map((employee) => {
                      const selected = employee.id === selectedEmployee?.id;

                      return (
                        <li key={employee.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployeeId(employee.id);
                              openDetail();
                            }}
                            className={cn(
                              "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                              selected
                                ? "border-violet-400/40 bg-violet-500/10 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.15)]"
                                : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                            )}
                          >
                            <p className="text-sm font-semibold text-white">{employee.fullName}</p>
                            <p className="mt-1 text-xs text-white/45">
                              {[employee.role, employee.department].filter(Boolean).join(" · ") ||
                                employee.email}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-white/40">
                              <span>{employee.location}</span>
                              <span>·</span>
                              <span>Joined {formatHrDate(employee.dateJoined)}</span>
                              <span>·</span>
                              <span>{formatSalary(employee.salaryCurrent)}</span>
                            </div>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </section>
          }
          detail={
            selectedEmployee ? (
              <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a78bfa]">
                      Employee record
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {selectedEmployee.fullName || "Unnamed"}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">{selectedEmployee.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveEmployee()}
                      disabled={busy || !isDirty}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteEmployee()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>

                {saveMessage && (
                  <p className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {saveMessage}
                  </p>
                )}

                <EmployeeFieldsGrid
                  employee={selectedEmployee}
                  managerOptions={managerOptions}
                  onChange={(patch) => patchSelected(patch)}
                />

                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-white">Documents</h3>
                  <p className="mt-1 text-xs text-white/45">
                    Resume, contract, and share options on file.
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    {HR_DOCUMENT_KEYS.map((key) => (
                      <DocumentCard
                        key={key}
                        label={HR_DOCUMENT_LABELS[key].toUpperCase()}
                        slot={selectedEmployee.documents[key]}
                        onChange={(slot) => patchDocument(key, slot)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            ) : null
          }
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0b1524] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a78bfa]">
                  New staff member
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">Add to HR records</h3>
                <p className="mt-1 text-sm text-white/50">
                  Enter role, compensation, and leave details for the new hire.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/60 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="mt-6">
              <EmployeeFieldsGrid
                employee={newEmployee}
                managerOptions={managerOptions}
                onChange={(patch) => setNewEmployee((current) => ({ ...current, ...patch }))}
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={busy}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateEmployee()}
                disabled={busy || !newEmployee.fullName.trim()}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add staff member
              </button>
            </div>
          </section>
        </div>
      )}
        </>
      ) : null}
    </div>
  );
}

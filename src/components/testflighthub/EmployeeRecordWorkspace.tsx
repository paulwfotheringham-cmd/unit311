"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Loader2, Plus, Save, Search } from "lucide-react";

import {
  createBlankEmployeeInput,
  formatHrDate,
  formatSalary,
  HR_ACTIVE_HEADCOUNT_STATUSES,
  HR_COMPENSATION_CATEGORIES,
  HR_COMPENSATION_CATEGORY_LABELS,
  HR_DEPARTMENTS,
  HR_DOCUMENT_TYPE_LABELS,
  HR_DOCUMENT_TYPES,
  HR_EMPLOYMENT_STATUS_LABELS,
  HR_EMPLOYMENT_STATUSES,
  HR_EMPLOYMENT_TYPE_LABELS,
  HR_EMPLOYMENT_TYPES,
  HR_LOCATIONS,
  statusBadgeClass,
  type HrCompensationCategory,
  type HrDocumentType,
  type HrEmployee,
  type HrEmployeeDetail,
  type HrEmploymentStatus,
} from "@/lib/hr-data";
import { HR_LEAVE_TYPE_LABELS, leaveStatusClass } from "@/lib/hr-leave-data";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import {
  getLeaveRequestsForEmployee,
  resolveLeaveBalanceForLiveEmployee,
} from "@/lib/hr-mock-store";
import { cn } from "@/lib/utils";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import EmployeePerformancePanel from "./EmployeePerformancePanel";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import { useHrMockStore } from "./useHrMockStore";
import { HrStatusPill } from "./hr-ui";

const TABS = [
  "Overview",
  "Employment",
  "Compensation",
  "Leave",
  "Documents",
  "Performance",
  "Notes",
  "Timeline",
  "Reports",
  "Offboarding",
] as const;

type TabId = (typeof TABS)[number];

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

function inputClass() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50";
}

function EmptyStatePanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6">
      <p className="text-sm font-medium text-white/80">{title}</p>
      <p className="mt-2 text-sm text-white/45">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export default function EmployeeRecordWorkspace() {
  const searchParams = useSearchParams();
  const basePath = useInternalOperationsBasePath();
  useHrMockStore();
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HrEmployeeDetail | null>(null);
  const [draft, setDraft] = useState<HrEmployee | null>(null);
  const [tab, setTab] = useState<TabId>("Overview");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState(createBlankEmployeeInput());
  const { showDetail, openDetail, closeDetail } = useMobileDetailPanel();

  useEffect(() => {
    const fromUrl = searchParams.get("employeeId");
    if (fromUrl) {
      setSelectedId(fromUrl);
      openDetail();
    }
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && (TABS as readonly string[]).includes(tabFromUrl)) {
      setTab(tabFromUrl as TabId);
    }
  }, [searchParams, openDetail]);

  const [compForm, setCompForm] = useState({
    category: "salary" as HrCompensationCategory,
    effectiveDate: new Date().toISOString().slice(0, 10),
    amount: 0,
    currency: "EUR",
    reason: "",
    approvedBy: "",
    terms: "",
  });
  const [noteBody, setNoteBody] = useState("");
  const [timelineTitle, setTimelineTitle] = useState("");
  const [timelineDetail, setTimelineDetail] = useState("");
  const [docType, setDocType] = useState<HrDocumentType>("resume");
  const [docNotes, setDocNotes] = useState("");
  const [docExpiry, setDocExpiry] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = includeArchived ? "?includeArchived=true" : "";
      const response = await fetch(`/api/hr/employees${params}`, { cache: "no-store" });
      const data = await readApiJson<{ employees?: HrEmployee[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load employees");
      setEmployees(data.employees ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/hr/employees/${id}`, { cache: "no-store" });
      const data = await readApiJson<{ employee?: HrEmployeeDetail; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load employee");
      if (!data.employee) throw new Error("Employee not found");
      setDetail(data.employee);
      setDraft(data.employee);
      setCompForm((current) => ({
        ...current,
        amount: data.employee!.salaryCurrent,
        currency: data.employee!.currency,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load employee");
      setDetail(null);
      setDraft(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((employee) => {
      if (statusFilter !== "all" && employee.employmentStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        employee.fullName.toLowerCase().includes(q) ||
        employee.email.toLowerCase().includes(q) ||
        employee.employeeNumber.toLowerCase().includes(q) ||
        employee.role.toLowerCase().includes(q) ||
        employee.department.toLowerCase().includes(q)
      );
    });
  }, [employees, query, statusFilter]);

  const activeHeadcount = useMemo(
    () =>
      employees.filter((employee) =>
        (HR_ACTIVE_HEADCOUNT_STATUSES as readonly string[]).includes(employee.employmentStatus),
      ).length,
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

  function selectEmployee(id: string) {
    setSelectedId(id);
    setTab("Overview");
    openDetail();
  }

  async function saveDraft() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/hr/employees/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: draft.fullName,
          preferredName: draft.preferredName,
          email: draft.email,
          phone: draft.phone,
          address: draft.address,
          emergencyContactName: draft.emergencyContactName,
          emergencyContactPhone: draft.emergencyContactPhone,
          emergencyContactRelationship: draft.emergencyContactRelationship,
          nationality: draft.nationality,
          employmentStatus: draft.employmentStatus,
          employmentType: draft.employmentType,
          dateJoined: draft.dateJoined,
          location: draft.location,
          role: draft.role,
          department: draft.department,
          managerEmployeeId: draft.managerEmployeeId,
          probationEndDate: draft.probationEndDate,
          endDate: draft.endDate,
          currency: draft.currency,
          payFrequency: draft.payFrequency,
          holidayCalendar: draft.holidayCalendar,
          vacationDaysPerYear: draft.vacationDaysPerYear,
          vacationDaysTaken: draft.vacationDaysTaken,
          offboarding: draft.offboarding,
        }),
      });
      const data = await readApiJson<{ employee?: HrEmployee; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to save");
      setMessage("Employee saved");
      await loadList();
      await loadDetail(draft.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function archiveSelected() {
    if (!draft) return;
    if (!window.confirm(`Archive ${draft.employeeNumber} ${draft.fullName}? This cannot delete the record.`)) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/hr/employees/${draft.id}/archive`, { method: "POST" });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to archive");
      setMessage("Employee archived");
      await loadList();
      await loadDetail(draft.id);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Failed to archive");
    } finally {
      setSaving(false);
    }
  }

  async function createEmployee() {
    if (!newEmployee.fullName.trim()) {
      setError("Full name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      });
      const data = await readApiJson<{ employee?: HrEmployee; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to create");
      setAddOpen(false);
      setNewEmployee(createBlankEmployeeInput());
      await loadList();
      if (data.employee) selectEmployee(data.employee.id);
      setMessage("Employee created");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function addCompensation() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/hr/employees/${draft.id}/compensation-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compForm),
      });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to add compensation");
      setMessage("Compensation history updated");
      await loadList();
      await loadDetail(draft.id);
    } catch (compError) {
      setError(compError instanceof Error ? compError.message : "Failed to add compensation");
    } finally {
      setSaving(false);
    }
  }

  async function uploadDocument() {
    if (!draft || !docFile) {
      setError("Choose a file to upload");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", docFile);
      form.set("documentType", docType);
      form.set("notes", docNotes);
      if (docExpiry) form.set("expiresAt", docExpiry);
      const response = await fetch(`/api/hr/employees/${draft.id}/documents`, {
        method: "POST",
        body: form,
      });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      setDocFile(null);
      setDocNotes("");
      setDocExpiry("");
      setMessage("Document uploaded");
      await loadDetail(draft.id);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(docId: string) {
    if (!draft) return;
    const response = await fetch(`/api/hr/employees/${draft.id}/documents/${docId}`, {
      method: "DELETE",
    });
    const data = await readApiJson<{ error?: string }>(response);
    if (!response.ok) {
      setError(data.error ?? "Failed to remove document");
      return;
    }
    await loadDetail(draft.id);
  }

  async function downloadDocument(docId: string) {
    if (!draft) return;
    const response = await fetch(`/api/hr/employees/${draft.id}/documents/${docId}`);
    const data = await readApiJson<{ url?: string; error?: string }>(response);
    if (!response.ok || !data.url) {
      setError(data.error ?? "Download unavailable");
      return;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  async function addNote() {
    if (!draft || !noteBody.trim()) return;
    const response = await fetch(`/api/hr/employees/${draft.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody }),
    });
    const data = await readApiJson<{ error?: string }>(response);
    if (!response.ok) {
      setError(data.error ?? "Failed to add note");
      return;
    }
    setNoteBody("");
    await loadDetail(draft.id);
  }

  async function addTimeline() {
    if (!draft || !timelineTitle.trim()) return;
    const response = await fetch(`/api/hr/employees/${draft.id}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: timelineTitle, detail: timelineDetail }),
    });
    const data = await readApiJson<{ error?: string }>(response);
    if (!response.ok) {
      setError(data.error ?? "Failed to add timeline event");
      return;
    }
    setTimelineTitle("");
    setTimelineDetail("");
    await loadDetail(draft.id);
  }

  const master = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Employees</h2>
          <p className="mt-1 text-sm text-white/50">
            Active headcount {activeHeadcount} · Operational payroll{" "}
            {formatSalary(operationalPayroll)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-sm text-violet-100"
        >
          <Plus className="h-4 w-4" />
          Add employee
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/35" />
          <input
            className={cn(inputClass(), "mt-0 pl-9")}
            placeholder="Search name, EMP-####, email…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          className={cn(inputClass(), "mt-0 w-auto")}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          {HR_EMPLOYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {HR_EMPLOYMENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Show archived
        </label>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => selectEmployee(employee.id)}
              className={cn(
                "w-full rounded-2xl border px-3 py-3 text-left transition-colors",
                selectedId === employee.id
                  ? "border-violet-400/40 bg-violet-500/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] text-sky-200/80">{employee.employeeNumber}</p>
                  <p className="text-sm font-medium text-white">{employee.fullName}</p>
                  <p className="text-xs text-white/45">
                    {employee.role || "No role"} · {employee.department || "No department"}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px]",
                    statusBadgeClass(employee.employmentStatus),
                  )}
                >
                  {HR_EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const detailPanel =
    !draft ? (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-sm text-white/45">
        Select an employee to open the master record.
      </div>
    ) : (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-sky-200/90">{draft.employeeNumber}</p>
            <h3 className="text-lg font-semibold text-white">{draft.fullName}</h3>
            <p className="text-sm text-white/50">
              {draft.role || "—"} · {HR_EMPLOYMENT_STATUS_LABELS[draft.employmentStatus]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveDraft()}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
            {draft.employmentStatus !== "archived" ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void archiveSelected()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                tab === item
                  ? "bg-white/10 text-white"
                  : "text-white/45 hover:bg-white/[0.05] hover:text-white/75",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {detailLoading ? (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading record…
          </div>
        ) : null}

        {tab === "Overview" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Full name</FieldLabel>
              <input
                className={inputClass()}
                value={draft.fullName}
                onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Preferred name</FieldLabel>
              <input
                className={inputClass()}
                value={draft.preferredName}
                onChange={(event) => setDraft({ ...draft, preferredName: event.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input
                className={inputClass()}
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <input
                className={inputClass()}
                value={draft.phone}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Address</FieldLabel>
              <input
                className={inputClass()}
                value={draft.address}
                onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Nationality</FieldLabel>
              <input
                className={inputClass()}
                value={draft.nationality}
                onChange={(event) => setDraft({ ...draft, nationality: event.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                className={inputClass()}
                value={draft.employmentStatus}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    employmentStatus: event.target.value as HrEmploymentStatus,
                  })
                }
              >
                {HR_EMPLOYMENT_STATUSES.filter(
                  (status) => status !== "candidate" && status !== "offer_accepted",
                ).map((status) => (
                  <option key={status} value={status}>
                    {HR_EMPLOYMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Emergency contact</FieldLabel>
              <input
                className={inputClass()}
                value={draft.emergencyContactName}
                onChange={(event) =>
                  setDraft({ ...draft, emergencyContactName: event.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel>Emergency phone</FieldLabel>
              <input
                className={inputClass()}
                value={draft.emergencyContactPhone}
                onChange={(event) =>
                  setDraft({ ...draft, emergencyContactPhone: event.target.value })
                }
              />
            </div>
          </div>
        ) : null}

        {tab === "Employment" ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Employment type</FieldLabel>
                <select
                  className={inputClass()}
                  value={draft.employmentType}
                  onChange={(event) => setDraft({ ...draft, employmentType: event.target.value })}
                >
                  {HR_EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {HR_EMPLOYMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Start date</FieldLabel>
                <input
                  type="date"
                  className={inputClass()}
                  value={draft.dateJoined}
                  onChange={(event) => setDraft({ ...draft, dateJoined: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Department</FieldLabel>
                <select
                  className={inputClass()}
                  value={draft.department}
                  onChange={(event) => setDraft({ ...draft, department: event.target.value })}
                >
                  <option value="">Select…</option>
                  {HR_DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Role</FieldLabel>
                <input
                  className={inputClass()}
                  value={draft.role}
                  onChange={(event) => setDraft({ ...draft, role: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Location</FieldLabel>
                <select
                  className={inputClass()}
                  value={draft.location}
                  onChange={(event) => setDraft({ ...draft, location: event.target.value })}
                >
                  {HR_LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Manager</FieldLabel>
                <select
                  className={inputClass()}
                  value={draft.managerEmployeeId ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      managerEmployeeId: event.target.value || null,
                    })
                  }
                >
                  <option value="">None</option>
                  {employees
                    .filter((employee) => employee.id !== draft.id)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.employeeNumber} · {employee.fullName}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <FieldLabel>Probation end</FieldLabel>
                <input
                  type="date"
                  className={inputClass()}
                  value={draft.probationEndDate ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, probationEndDate: event.target.value || null })
                  }
                />
              </div>
              <div>
                <FieldLabel>End date</FieldLabel>
                <input
                  type="date"
                  className={inputClass()}
                  value={draft.endDate ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, endDate: event.target.value || null })
                  }
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.12em] text-white/45">
                Employment history
              </p>
              <div className="space-y-2">
                {(detail?.employmentHistory ?? []).map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70"
                  >
                    {formatHrDate(row.effectiveDate)} · {row.role || "—"} · {row.department || "—"}
                  </div>
                ))}
                {(detail?.employmentHistory.length ?? 0) === 0 ? (
                  <EmptyStatePanel
                    title="Employment history"
                    body="No role or department changes recorded yet. Updates made here will appear in this timeline."
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "Compensation" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">Current salary</p>
                <p className="mt-1 text-lg text-white">
                  {formatSalary(draft.salaryCurrent, draft.currency)}
                </p>
                <p className="text-xs text-white/40">Annual equivalent · {draft.payFrequency}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">Current bonus</p>
                <p className="mt-1 text-lg text-white">
                  {formatSalary(draft.bonus, draft.currency)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">Currency</p>
                <p className="mt-1 text-lg text-white">{draft.currency}</p>
              </div>
            </div>

            <EmptyStatePanel
              title="Payroll history"
              body="No payroll history on this record yet. Payslips and payroll runs are managed in Financials."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Category</FieldLabel>
                <select
                  className={inputClass()}
                  value={compForm.category}
                  onChange={(event) =>
                    setCompForm({
                      ...compForm,
                      category: event.target.value as HrCompensationCategory,
                    })
                  }
                >
                  {HR_COMPENSATION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {HR_COMPENSATION_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Effective date</FieldLabel>
                <input
                  type="date"
                  className={inputClass()}
                  value={compForm.effectiveDate}
                  onChange={(event) =>
                    setCompForm({ ...compForm, effectiveDate: event.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Amount (annual)</FieldLabel>
                <input
                  type="number"
                  className={inputClass()}
                  value={compForm.amount}
                  onChange={(event) =>
                    setCompForm({ ...compForm, amount: Number(event.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <FieldLabel>Currency</FieldLabel>
                <input
                  className={inputClass()}
                  value={compForm.currency}
                  onChange={(event) => setCompForm({ ...compForm, currency: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Reason</FieldLabel>
                <input
                  className={inputClass()}
                  value={compForm.reason}
                  onChange={(event) => setCompForm({ ...compForm, reason: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Approved by</FieldLabel>
                <input
                  className={inputClass()}
                  value={compForm.approvedBy}
                  onChange={(event) =>
                    setCompForm({ ...compForm, approvedBy: event.target.value })
                  }
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void addCompensation()}
              className="rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 py-2 text-sm text-sky-100"
            >
              Add compensation history row
            </button>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.12em] text-white/45">
                  <tr>
                    <th className="px-3 py-2">Effective</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Approved</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail?.compensationHistory ?? []).map((row) => (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="px-3 py-2 text-white/80">{formatHrDate(row.effectiveDate)}</td>
                      <td className="px-3 py-2 text-white/70">
                        {HR_COMPENSATION_CATEGORY_LABELS[row.category]}
                      </td>
                      <td className="px-3 py-2 text-white/80">
                        {row.amount == null ? "—" : formatSalary(row.amount, row.currency)}
                      </td>
                      <td className="px-3 py-2 text-white/55">{row.reason}</td>
                      <td className="px-3 py-2 text-white/55">{row.approvedBy}</td>
                      <td className="px-3 py-2 text-white/55">
                        {row.supersededAt ? "Superseded" : "Current"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(detail?.compensationHistory.length ?? 0) === 0 ? (
                <div className="border-t border-white/10 px-4 py-6 text-sm text-white/45">
                  No compensation changes recorded yet.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "Leave" ? (
          <div className="space-y-4">
            {(() => {
              const balance = resolveLeaveBalanceForLiveEmployee(draft);
              const requests = getLeaveRequestsForEmployee(draft.id);
              return (
                <>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-white/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                        Annual allocated
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white">
                        {balance?.annualAllocated ?? draft.vacationDaysPerYear}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                        Annual taken
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white">
                        {balance?.annualTaken ?? draft.vacationDaysTaken}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                        Remaining
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white">
                        {(balance?.annualAllocated ?? draft.vacationDaysPerYear) -
                          (balance?.annualTaken ?? draft.vacationDaysTaken)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                        Sick taken
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white">
                        {balance?.sickTaken ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                      Leave requests
                    </p>
                    {requests.length > 0 ? (
                      requests.map((request) => (
                        <div
                          key={request.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm text-white">
                              {HR_LEAVE_TYPE_LABELS[request.type]}
                            </p>
                            <p className="text-xs text-white/45">
                              {request.startDate} → {request.endDate} · {request.days} days
                            </p>
                          </div>
                          <HrStatusPill className={leaveStatusClass(request.status)}>
                            {request.status}
                          </HrStatusPill>
                        </div>
                      ))
                    ) : (
                      <EmptyStatePanel
                        title="No leave requests"
                        body="No leave requests for this employee yet."
                        action={
                          <Link
                            href={getInternalNavHref("hr-leave", basePath)}
                            className="inline-flex h-9 items-center rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200"
                          >
                            Open Leave Management
                          </Link>
                        }
                      />
                    )}
                  </div>
                  {requests.length > 0 ? (
                    <Link
                      href={getInternalNavHref("hr-leave", basePath)}
                      className="inline-flex h-9 items-center rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200"
                    >
                      Open Leave Management
                    </Link>
                  ) : null}
                </>
              );
            })()}
          </div>
        ) : null}

        {tab === "Documents" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Document type</FieldLabel>
                <select
                  className={inputClass()}
                  value={docType}
                  onChange={(event) => setDocType(event.target.value as HrDocumentType)}
                >
                  {HR_DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {HR_DOCUMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>File</FieldLabel>
                <input
                  type="file"
                  className={cn(inputClass(), "file:mr-3 file:text-white/70")}
                  onChange={(event) => setDocFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <FieldLabel>Expiry (optional)</FieldLabel>
                <input
                  type="date"
                  className={inputClass()}
                  value={docExpiry}
                  onChange={(event) => setDocExpiry(event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Notes</FieldLabel>
                <input
                  className={inputClass()}
                  value={docNotes}
                  onChange={(event) => setDocNotes(event.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => void uploadDocument()}
              className="rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 py-2 text-sm text-sky-100 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload document"}
            </button>

            <div className="space-y-2">
              {(detail?.documents ?? []).map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-white/90">
                      {HR_DOCUMENT_TYPE_LABELS[doc.documentType]} · {doc.fileName || doc.title}
                    </p>
                    <p className="text-xs text-white/45">
                      {doc.uploadedBy} · {formatHrDate(doc.uploadedAt.slice(0, 10))}
                      {doc.expiresAt ? ` · Expires ${formatHrDate(doc.expiresAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {doc.storagePath ? (
                      <button
                        type="button"
                        className="text-xs text-sky-200"
                        onClick={() => void downloadDocument(doc.id)}
                      >
                        Download
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="text-xs text-rose-200"
                      onClick={() => void removeDocument(doc.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {(detail?.documents.length ?? 0) === 0 ? (
                <EmptyStatePanel
                  title="No documents"
                  body="Upload contracts, IDs, certifications, and other employee files using the form above."
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "Performance" && draft ? <EmployeePerformancePanel employee={draft} /> : null}

        {tab === "Notes" ? (
          <div className="space-y-4">
            <textarea
              className={cn(inputClass(), "min-h-[90px]")}
              placeholder="Add employment note…"
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
            />
            <button
              type="button"
              onClick={() => void addNote()}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80"
            >
              Add note
            </button>
            <div className="space-y-2">
              {(detail?.notes ?? []).map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                >
                  <p className="text-white/85">{note.body}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {note.createdBy} · {formatHrDate(note.createdAt.slice(0, 10))}
                  </p>
                </div>
              ))}
              {(detail?.notes.length ?? 0) === 0 ? (
                <EmptyStatePanel
                  title="No notes"
                  body="Add employment notes to capture context that does not belong in formal records."
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "Timeline" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Event title</FieldLabel>
                <input
                  className={inputClass()}
                  value={timelineTitle}
                  onChange={(event) => setTimelineTitle(event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Detail</FieldLabel>
                <input
                  className={inputClass()}
                  value={timelineDetail}
                  onChange={(event) => setTimelineDetail(event.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void addTimeline()}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80"
            >
              Add timeline event
            </button>
            <div className="space-y-2">
              {(detail?.timeline ?? []).map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                >
                  <p className="text-white/90">{event.title}</p>
                  <p className="text-xs text-white/45">
                    {formatHrDate(event.occurredAt.slice(0, 10))}
                    {event.detail ? ` · ${event.detail}` : ""}
                  </p>
                </div>
              ))}
              {(detail?.timeline.length ?? 0) === 0 ? (
                <EmptyStatePanel
                  title="No timeline events"
                  body="Record milestones such as promotions, transfers, or policy acknowledgements."
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "Reports" && draft ? (
          <div className="space-y-4 rounded-xl border border-white/10 p-4">
            <div>
              <p className="text-sm font-medium text-white">Employee report pack</p>
              <p className="mt-1 text-sm text-white/55">
                Generate a complete pack covering personal details, employment, compensation summary,
                leave, performance, documents, notes, and timeline from the HR Reports centre.
              </p>
            </div>
            <Link
              href={getInternalNavHref("hr-reports", basePath, { employeeId: draft.id })}
              className="inline-flex h-9 items-center rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200"
            >
              Generate employee pack
            </Link>
          </div>
        ) : null}

        {tab === "Offboarding" ? (
          <div className="space-y-4">
            <p className="text-sm text-white/50">
              Capture notice period, final working day, exit interview notes, and settlement
              references when an employee leaves the organisation.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["noticeGivenDate", "Notice given date", "date"],
                  ["noticePeriod", "Notice period", "text"],
                  ["finalWorkingDay", "Final working day", "date"],
                  ["terminationDate", "Termination date", "date"],
                  ["terminationReason", "Termination reason", "text"],
                  ["exitInterview", "Exit interview", "text"],
                  ["finalPayrollRef", "Final payroll ref", "text"],
                  ["outstandingLeavePaidRef", "Outstanding leave paid ref", "text"],
                  ["redundancyPaymentRef", "Redundancy payment ref", "text"],
                  ["severancePaymentRef", "Severance payment ref", "text"],
                  ["outstandingExpensesRef", "Outstanding expenses ref", "text"],
                  ["finalPaymentDate", "Payment date", "date"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key}>
                  <FieldLabel>{label}</FieldLabel>
                  <input
                    type={type}
                    className={inputClass()}
                    value={String(draft.offboarding[key] ?? "")}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        offboarding: {
                          ...draft.offboarding,
                          [key]: event.target.value || (type === "date" ? null : ""),
                        },
                      })
                    }
                  />
                </div>
              ))}
              <div>
                <FieldLabel>Final amount paid (outcome)</FieldLabel>
                <input
                  type="number"
                  className={inputClass()}
                  value={draft.offboarding.finalAmountPaid ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      offboarding: {
                        ...draft.offboarding,
                        finalAmountPaid:
                          event.target.value === "" ? null : Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
              <label className="mt-6 flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={draft.offboarding.companyAssetsReturned}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      offboarding: {
                        ...draft.offboarding,
                        companyAssetsReturned: event.target.checked,
                      },
                    })
                  }
                />
                Company assets returned
              </label>
              <label className="mt-6 flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={draft.offboarding.accountsDisabled}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      offboarding: {
                        ...draft.offboarding,
                        accountsDisabled: event.target.checked,
                      },
                    })
                  }
                />
                Accounts disabled
              </label>
            </div>
          </div>
        ) : null}
      </div>
    );

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      <ResponsiveMasterDetail
        master={master}
        detail={detailPanel}
        showDetail={showDetail}
        onBack={closeDetail}
        backLabel="Back to employees"
      />

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-[#0b1524] p-5">
            <h3 className="text-lg font-semibold text-white">Add employee</h3>
            <div>
              <FieldLabel>Full name</FieldLabel>
              <input
                className={inputClass()}
                value={newEmployee.fullName}
                onChange={(event) =>
                  setNewEmployee({ ...newEmployee, fullName: event.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input
                className={inputClass()}
                value={newEmployee.email}
                onChange={(event) =>
                  setNewEmployee({ ...newEmployee, email: event.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-sm text-violet-100"
                onClick={() => void createEmployee()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

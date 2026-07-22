import {
  createBlankEmployeeInput,
  formatEmployeeNumber,
  isHrEmploymentStatus,
  mapHrEmployee,
  type HrCompensationCategory,
  type HrCompensationHistoryEntry,
  type HrDocumentType,
  type HrEmployee,
  type HrEmployeeDetail,
  type HrEmployeeDocument,
  type HrEmployeeNote,
  type HrEmploymentHistoryEntry,
  type HrEmploymentStatus,
  type HrOffboarding,
  type HrTimelineEvent,
} from "@/lib/hr-data";
import type { HrWorkspaceScope } from "@/lib/hr-workspace";
import { resolveHrWorkspaceId } from "@/lib/hr-workspace";
import { INTERNAL_FILES_BUCKET } from "@/lib/internal-files-data";
import {
  ensureHrEmployeesTable,
  withHrEmployeesTable,
} from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbEmployee = Parameters<typeof mapHrEmployee>[0];

function requireHrSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 10)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function allocateEmployeeNumber(workspaceId: string): Promise<string> {
  const supabase = requireHrSupabase();
  const key = workspaceId || "";

  const { data: existing } = await supabase
    .from("hr_employee_number_seq")
    .select("next_value")
    .eq("workspace_id", key)
    .maybeSingle();

  let next = existing?.next_value ?? 1;
  if (!existing) {
    const { data: rows } = await supabase
      .from("hr_employees")
      .select("employee_number")
      .eq("workspace_id", workspaceId);
    const max = (rows ?? []).reduce((acc, row) => {
      const match = String((row as { employee_number?: string }).employee_number ?? "").match(
        /^EMP-(\d+)$/,
      );
      if (!match) return acc;
      return Math.max(acc, Number(match[1]));
    }, 0);
    next = max + 1;
    await supabase.from("hr_employee_number_seq").upsert({
      workspace_id: key,
      next_value: next + 1,
    });
  } else {
    await supabase
      .from("hr_employee_number_seq")
      .update({ next_value: next + 1 })
      .eq("workspace_id", key);
  }

  return formatEmployeeNumber(next);
}

async function addTimelineEvent(
  workspaceId: string,
  employeeId: string,
  event: {
    eventType: string;
    title: string;
    detail?: string | null;
    occurredAt?: string;
    source?: string;
  },
) {
  const supabase = requireHrSupabase();
  await supabase.from("hr_employee_timeline_events").insert({
    id: newId("tl"),
    workspace_id: workspaceId,
    employee_id: employeeId,
    event_type: event.eventType,
    occurred_at: event.occurredAt ?? new Date().toISOString(),
    title: event.title,
    detail: event.detail ?? null,
    source: event.source ?? "employees",
  });
}

function mapCompensation(row: Record<string, unknown>): HrCompensationHistoryEntry {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    category: row.category as HrCompensationCategory,
    effectiveDate: String(row.effective_date).slice(0, 10),
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
    currency: String(row.currency ?? "EUR"),
    reason: String(row.reason ?? ""),
    approvedBy: String(row.approved_by ?? ""),
    terms: row.terms == null ? null : String(row.terms),
    supersededAt: row.superseded_at ? String(row.superseded_at) : null,
    createdAt: String(row.created_at ?? ""),
  };
}

function mapDocument(row: Record<string, unknown>): HrEmployeeDocument {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    documentType: row.document_type as HrDocumentType,
    title: String(row.title ?? ""),
    fileName: row.file_name == null ? null : String(row.file_name),
    storagePath: row.storage_path == null ? null : String(row.storage_path),
    mimeType: row.mime_type == null ? null : String(row.mime_type),
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    uploadedBy: String(row.uploaded_by ?? ""),
    uploadedAt: String(row.uploaded_at ?? ""),
    expiresAt: row.expires_at ? String(row.expires_at).slice(0, 10) : null,
    notes: row.notes == null ? null : String(row.notes),
  };
}

function mapNote(row: Record<string, unknown>): HrEmployeeNote {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    body: String(row.body ?? ""),
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapTimeline(row: Record<string, unknown>): HrTimelineEvent {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    eventType: String(row.event_type ?? ""),
    occurredAt: String(row.occurred_at ?? ""),
    title: String(row.title ?? ""),
    detail: row.detail == null ? null : String(row.detail),
    source: String(row.source ?? "employees"),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapEmploymentHistory(row: Record<string, unknown>): HrEmploymentHistoryEntry {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    effectiveDate: String(row.effective_date).slice(0, 10),
    department: String(row.department ?? ""),
    role: String(row.role ?? ""),
    location: String(row.location ?? ""),
    officeId: row.office_id == null ? null : String(row.office_id),
    managerEmployeeId: row.manager_employee_id == null ? null : String(row.manager_employee_id),
    reason: row.reason == null ? null : String(row.reason),
    createdAt: String(row.created_at ?? ""),
  };
}

function buildEmployeePayload(input: Partial<HrEmployee> & { offboarding?: Partial<HrOffboarding> }) {
  const payload: Record<string, string | number | boolean | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.fullName !== undefined) payload.full_name = input.fullName.trim();
  if (input.preferredName !== undefined) payload.preferred_name = input.preferredName.trim();
  if (input.email !== undefined) payload.email = input.email.trim();
  if (input.phone !== undefined) payload.phone = input.phone.trim();
  if (input.address !== undefined) payload.address = input.address.trim();
  if (input.emergencyContactName !== undefined) {
    payload.emergency_contact_name = input.emergencyContactName.trim();
  }
  if (input.emergencyContactPhone !== undefined) {
    payload.emergency_contact_phone = input.emergencyContactPhone.trim();
  }
  if (input.emergencyContactRelationship !== undefined) {
    payload.emergency_contact_relationship = input.emergencyContactRelationship.trim();
  }
  if (input.nationality !== undefined) payload.nationality = input.nationality.trim();
  if (input.employmentStatus !== undefined) payload.employment_status = input.employmentStatus;
  if (input.employmentType !== undefined) payload.employment_type = input.employmentType;
  if (input.dateJoined !== undefined) payload.date_joined = input.dateJoined;
  if (input.location !== undefined) payload.location = input.location.trim();
  if (input.officeId !== undefined) payload.office_id = input.officeId;
  if (input.role !== undefined) payload.role = input.role.trim();
  if (input.department !== undefined) payload.department = input.department.trim();
  if (input.manager !== undefined) payload.manager = input.manager.trim();
  if (input.managerEmployeeId !== undefined) payload.manager_employee_id = input.managerEmployeeId;
  if (input.probationEndDate !== undefined) payload.probation_end_date = input.probationEndDate;
  if (input.endDate !== undefined) payload.end_date = input.endDate;
  if (input.currency !== undefined) payload.currency = input.currency;
  if (input.payFrequency !== undefined) payload.pay_frequency = input.payFrequency;
  if (input.salaryPrevious !== undefined) payload.salary_previous = input.salaryPrevious;
  if (input.salaryIncreaseDate !== undefined) {
    payload.salary_increase_date = input.salaryIncreaseDate || null;
  }
  if (input.salaryIncreaseAmount !== undefined) {
    payload.salary_increase_amount = input.salaryIncreaseAmount;
  }
  if (input.holidayCalendar !== undefined) payload.holiday_calendar = input.holidayCalendar;
  if (input.vacationDaysPerYear !== undefined) {
    payload.vacation_days_per_year = input.vacationDaysPerYear;
  }
  if (input.vacationDaysTaken !== undefined) payload.vacation_days_taken = input.vacationDaysTaken;

  const ob = input.offboarding;
  if (ob) {
    if (ob.noticeGivenDate !== undefined) payload.notice_given_date = ob.noticeGivenDate;
    if (ob.noticePeriod !== undefined) payload.notice_period = ob.noticePeriod;
    if (ob.finalWorkingDay !== undefined) payload.final_working_day = ob.finalWorkingDay;
    if (ob.terminationDate !== undefined) payload.termination_date = ob.terminationDate;
    if (ob.terminationReason !== undefined) payload.termination_reason = ob.terminationReason;
    if (ob.exitInterview !== undefined) payload.exit_interview = ob.exitInterview;
    if (ob.companyAssetsReturned !== undefined) {
      payload.company_assets_returned = ob.companyAssetsReturned;
    }
    if (ob.accountsDisabled !== undefined) payload.accounts_disabled = ob.accountsDisabled;
    if (ob.finalPayrollRef !== undefined) payload.final_payroll_ref = ob.finalPayrollRef;
    if (ob.outstandingLeavePaidRef !== undefined) {
      payload.outstanding_leave_paid_ref = ob.outstandingLeavePaidRef;
    }
    if (ob.redundancyPaymentRef !== undefined) {
      payload.redundancy_payment_ref = ob.redundancyPaymentRef;
    }
    if (ob.severancePaymentRef !== undefined) {
      payload.severance_payment_ref = ob.severancePaymentRef;
    }
    if (ob.outstandingExpensesRef !== undefined) {
      payload.outstanding_expenses_ref = ob.outstandingExpensesRef;
    }
    if (ob.finalAmountPaid !== undefined) payload.final_amount_paid = ob.finalAmountPaid;
    if (ob.finalPaymentDate !== undefined) payload.final_payment_date = ob.finalPaymentDate;
  }

  return payload;
}

export type ListHrEmployeesOptions = HrWorkspaceScope & {
  includeArchived?: boolean;
};

export async function listHrEmployees(
  scope?: ListHrEmployeesOptions,
): Promise<HrEmployee[]> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  await ensureHrEmployeesTable();
  return withHrEmployeesTable(async () => {
    const supabase = requireHrSupabase();
    let query = supabase
      .from("hr_employees")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("full_name", { ascending: true });

    if (!scope?.includeArchived) {
      query = query.neq("employment_status", "archived");
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as DbEmployee[]).map(mapHrEmployee);
  });
}

export async function getHrEmployee(
  id: string,
  scope?: HrWorkspaceScope,
): Promise<HrEmployee | null> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  await ensureHrEmployeesTable();
  return withHrEmployeesTable(async () => {
    const supabase = requireHrSupabase();
    const { data, error } = await supabase
      .from("hr_employees")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapHrEmployee(data as DbEmployee) : null;
  });
}

export async function requireHrEmployeeInWorkspace(
  id: string,
  scope?: HrWorkspaceScope,
): Promise<HrEmployee> {
  const employee = await getHrEmployee(id, scope);
  if (!employee) throw new Error("Employee not found.");
  return employee;
}

export async function getHrEmployeeDetail(
  id: string,
  scope?: HrWorkspaceScope,
): Promise<HrEmployeeDetail | null> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  return withHrEmployeesTable(async () => {
    const supabase = requireHrSupabase();
    const { data: employeeRow, error: employeeError } = await supabase
      .from("hr_employees")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (employeeError) throw new Error(employeeError.message);
    if (!employeeRow) return null;

    const employee = mapHrEmployee(employeeRow as DbEmployee);

    const [comp, docs, notes, timeline, history] = await Promise.all([
      supabase
        .from("hr_employee_compensation_history")
        .select("*")
        .eq("employee_id", id)
        .eq("workspace_id", workspaceId)
        .order("effective_date", { ascending: false }),
      supabase
        .from("hr_employee_documents")
        .select("*")
        .eq("employee_id", id)
        .eq("workspace_id", workspaceId)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("hr_employee_notes")
        .select("*")
        .eq("employee_id", id)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      supabase
        .from("hr_employee_timeline_events")
        .select("*")
        .eq("employee_id", id)
        .eq("workspace_id", workspaceId)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("hr_employee_employment_history")
        .select("*")
        .eq("employee_id", id)
        .eq("workspace_id", workspaceId)
        .order("effective_date", { ascending: false }),
    ]);

    for (const result of [comp, docs, notes, timeline, history]) {
      if (result.error) throw new Error(result.error.message);
    }

    return {
      ...employee,
      compensationHistory: (comp.data ?? []).map((row) =>
        mapCompensation(row as Record<string, unknown>),
      ),
      documents: (docs.data ?? []).map((row) => mapDocument(row as Record<string, unknown>)),
      notes: (notes.data ?? []).map((row) => mapNote(row as Record<string, unknown>)),
      timeline: (timeline.data ?? []).map((row) => mapTimeline(row as Record<string, unknown>)),
      employmentHistory: (history.data ?? []).map((row) =>
        mapEmploymentHistory(row as Record<string, unknown>),
      ),
    };
  });
}

async function refreshCompensationCache(employeeId: string, workspaceId: string) {
  const supabase = requireHrSupabase();
  const { data, error } = await supabase
    .from("hr_employee_compensation_history")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("workspace_id", workspaceId)
    .is("superseded_at", null);

  if (error) throw new Error(error.message);

  const currentSalary = (data ?? []).find((row) => row.category === "salary");
  const currentBonus = (data ?? []).find((row) => row.category === "bonus");

  const payload: Record<string, string | number | null> = {
    updated_at: new Date().toISOString(),
  };

  if (currentSalary) {
    payload.salary_current = Number(currentSalary.amount ?? 0);
    payload.currency = String(currentSalary.currency ?? "EUR");
    payload.salary_increase_date = String(currentSalary.effective_date).slice(0, 10);
  }
  if (currentBonus) {
    payload.bonus = Number(currentBonus.amount ?? 0);
  }

  const { error: updateError } = await supabase
    .from("hr_employees")
    .update(payload)
    .eq("id", employeeId)
    .eq("workspace_id", workspaceId);

  if (updateError) throw new Error(updateError.message);
}

export async function appendCompensationHistory(
  employeeId: string,
  input: {
    category: HrCompensationCategory;
    effectiveDate: string;
    amount: number | null;
    currency?: string;
    reason: string;
    approvedBy: string;
    terms?: string | null;
  },
  scope?: HrWorkspaceScope,
): Promise<HrCompensationHistoryEntry> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  await ensureHrEmployeesTable();
  return withHrEmployeesTable(async () => {
    await requireHrEmployeeInWorkspace(employeeId, { workspaceId });
    const supabase = requireHrSupabase();

    await supabase
      .from("hr_employee_compensation_history")
      .update({ superseded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("employee_id", employeeId)
      .eq("workspace_id", workspaceId)
      .eq("category", input.category)
      .is("superseded_at", null);

    const id = newId("comp");
    const { data, error } = await supabase
      .from("hr_employee_compensation_history")
      .insert({
        id,
        workspace_id: workspaceId,
        employee_id: employeeId,
        category: input.category,
        effective_date: input.effectiveDate,
        amount: input.amount,
        currency: input.currency ?? "EUR",
        reason: input.reason.trim() || "Compensation update",
        approved_by: input.approvedBy.trim() || "system",
        terms: input.terms ?? null,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await refreshCompensationCache(employeeId, workspaceId);
    await addTimelineEvent(workspaceId, employeeId, {
      eventType: "compensation_change",
      title: `Compensation updated (${input.category})`,
      detail: `${input.amount ?? "—"} ${input.currency ?? "EUR"} · ${input.reason}`,
      occurredAt: `${input.effectiveDate}T12:00:00.000Z`,
    });

    return mapCompensation(data as Record<string, unknown>);
  });
}

export async function createHrEmployee(
  input: Partial<HrEmployee> & { fullName: string },
  scope?: HrWorkspaceScope,
): Promise<HrEmployee> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  await ensureHrEmployeesTable();
  return withHrEmployeesTable(async () => {
    const supabase = requireHrSupabase();
    const blank = createBlankEmployeeInput();
    const id = `hr-${crypto.randomUUID().slice(0, 8)}`;
    const employeeNumber = await allocateEmployeeNumber(workspaceId);
    const status: HrEmploymentStatus =
      input.employmentStatus && isHrEmploymentStatus(input.employmentStatus)
        ? input.employmentStatus
        : "active";

    const { data, error } = await supabase
      .from("hr_employees")
      .insert({
        id,
        workspace_id: workspaceId,
        employee_number: employeeNumber,
        full_name: input.fullName.trim(),
        preferred_name: input.preferredName?.trim() || "",
        email: input.email?.trim() || `${id}@unit311.com`,
        phone: input.phone?.trim() || "",
        address: input.address?.trim() || "",
        emergency_contact_name: input.emergencyContactName?.trim() || "",
        emergency_contact_phone: input.emergencyContactPhone?.trim() || "",
        emergency_contact_relationship: input.emergencyContactRelationship?.trim() || "",
        nationality: input.nationality?.trim() || "",
        employment_status: status,
        employment_type: input.employmentType || blank.employmentType,
        date_joined: input.dateJoined ?? blank.dateJoined,
        location: input.location?.trim() || blank.location,
        office_id: input.officeId ?? null,
        role: input.role?.trim() || blank.role,
        department: input.department?.trim() || blank.department,
        manager: input.manager?.trim() || blank.manager,
        manager_employee_id: input.managerEmployeeId ?? null,
        probation_end_date: input.probationEndDate ?? null,
        end_date: input.endDate ?? null,
        currency: input.currency || "EUR",
        pay_frequency: input.payFrequency || "annual",
        salary_current: input.salaryCurrent ?? blank.salaryCurrent,
        salary_previous: input.salaryPrevious ?? blank.salaryPrevious,
        salary_increase_date: input.salaryIncreaseDate ?? null,
        salary_increase_amount: input.salaryIncreaseAmount ?? blank.salaryIncreaseAmount,
        bonus: input.bonus ?? blank.bonus,
        holiday_calendar: input.holidayCalendar ?? blank.holidayCalendar,
        vacation_days_per_year: input.vacationDaysPerYear ?? blank.vacationDaysPerYear,
        vacation_days_taken: input.vacationDaysTaken ?? blank.vacationDaysTaken,
        documents: {
          resume: { fileName: null, uploadedAt: null },
          contract: { fileName: null, uploadedAt: null },
          shareOptions: { fileName: null, uploadedAt: null },
        },
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const employee = mapHrEmployee(data as DbEmployee);

    await addTimelineEvent(workspaceId, id, {
      eventType: "joined",
      title: "Joined",
      detail: `Employee ${employeeNumber} created`,
      occurredAt: `${employee.dateJoined}T12:00:00.000Z`,
      source: "system",
    });

    const salary = input.salaryCurrent ?? blank.salaryCurrent;
    if (salary > 0) {
      await appendCompensationHistory(
        id,
        {
          category: "salary",
          effectiveDate: employee.dateJoined,
          amount: salary,
          currency: employee.currency,
          reason: "Initial salary",
          approvedBy: "system",
        },
        { workspaceId },
      );
    }

    return (await getHrEmployee(id, { workspaceId })) ?? employee;
  });
}

export type UpdateHrEmployeePatch = Partial<HrEmployee> & {
  offboarding?: Partial<HrOffboarding>;
  compensationReason?: string;
  compensationApprovedBy?: string;
  compensationEffectiveDate?: string;
};

export async function updateHrEmployee(
  id: string,
  patch: UpdateHrEmployeePatch,
  scope?: HrWorkspaceScope,
): Promise<HrEmployee> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  return withHrEmployeesTable(async () => {
    const current = await requireHrEmployeeInWorkspace(id, { workspaceId });
    const salaryShim =
      patch.salaryCurrent !== undefined && patch.salaryCurrent !== current.salaryCurrent;

    if (salaryShim) {
      await appendCompensationHistory(
        id,
        {
          category: "salary",
          effectiveDate: patch.compensationEffectiveDate || todayIso(),
          amount: patch.salaryCurrent ?? current.salaryCurrent,
          currency: patch.currency || current.currency,
          reason: patch.compensationReason || "Salary update via employee record",
          approvedBy: patch.compensationApprovedBy || "system",
        },
        { workspaceId },
      );
    }

    if (patch.bonus !== undefined && patch.bonus !== current.bonus && !salaryShim) {
      // bonus-only patch also goes through history when explicitly changing bonus
    }
    if (patch.bonus !== undefined && patch.bonus !== current.bonus) {
      await appendCompensationHistory(
        id,
        {
          category: "bonus",
          effectiveDate: patch.compensationEffectiveDate || todayIso(),
          amount: patch.bonus,
          currency: patch.currency || current.currency,
          reason: patch.compensationReason || "Bonus update via employee record",
          approvedBy: patch.compensationApprovedBy || "system",
        },
        { workspaceId },
      );
    }

    const { salaryCurrent: _s, bonus: _b, ...rest } = patch;
    const payload = buildEmployeePayload(salaryShim || patch.bonus !== undefined ? rest : patch);

    if (patch.managerEmployeeId !== undefined) {
      if (patch.managerEmployeeId) {
        const manager = await getHrEmployee(patch.managerEmployeeId, { workspaceId });
        payload.manager = manager?.fullName ?? "";
      } else if (patch.manager === undefined) {
        payload.manager = "";
      }
    }

    if (patch.employmentStatus === "archived" && current.employmentStatus !== "archived") {
      payload.archived_at = new Date().toISOString();
    }

    if (Object.keys(payload).length > 1) {
      const supabase = requireHrSupabase();
      const { error } = await supabase
        .from("hr_employees")
        .update(payload)
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
    }

    if (
      patch.employmentStatus &&
      patch.employmentStatus !== current.employmentStatus &&
      isHrEmploymentStatus(patch.employmentStatus)
    ) {
      await addTimelineEvent(workspaceId, id, {
        eventType: "status_change",
        title: `Status → ${patch.employmentStatus}`,
        detail: `Changed from ${current.employmentStatus}`,
      });
    }

    const roleChanged =
      (patch.role !== undefined && patch.role !== current.role) ||
      (patch.department !== undefined && patch.department !== current.department) ||
      (patch.managerEmployeeId !== undefined &&
        patch.managerEmployeeId !== current.managerEmployeeId);

    if (roleChanged) {
      const supabase = requireHrSupabase();
      await supabase.from("hr_employee_employment_history").insert({
        id: newId("eh"),
        workspace_id: workspaceId,
        employee_id: id,
        effective_date: todayIso(),
        department: patch.department ?? current.department,
        role: patch.role ?? current.role,
        location: patch.location ?? current.location,
        office_id: patch.officeId ?? current.officeId,
        manager_employee_id: patch.managerEmployeeId ?? current.managerEmployeeId,
        reason: "Employment update",
      });
    }

    return requireHrEmployeeInWorkspace(id, { workspaceId });
  });
}

export async function archiveHrEmployee(id: string, scope?: HrWorkspaceScope): Promise<HrEmployee> {
  return updateHrEmployee(id, { employmentStatus: "archived" }, scope);
}

/** @deprecated Hard delete is forbidden — use archiveHrEmployee. */
export async function deleteHrEmployee(_id: string, _scope?: HrWorkspaceScope): Promise<never> {
  throw new Error("Employees cannot be deleted. Archive the employee instead.");
}

export async function listCompensationHistory(employeeId: string, scope?: HrWorkspaceScope) {
  const detail = await getHrEmployeeDetail(employeeId, scope);
  if (!detail) throw new Error("Employee not found.");
  return detail.compensationHistory;
}

export async function listEmployeeDocuments(employeeId: string, scope?: HrWorkspaceScope) {
  const detail = await getHrEmployeeDetail(employeeId, scope);
  if (!detail) throw new Error("Employee not found.");
  return detail.documents;
}

export async function uploadEmployeeDocument(
  employeeId: string,
  input: {
    file: File;
    documentType: HrDocumentType;
    title?: string;
    uploadedBy: string;
    expiresAt?: string | null;
    notes?: string | null;
  },
  scope?: HrWorkspaceScope,
): Promise<HrEmployeeDocument> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  await ensureHrEmployeesTable();
  return withHrEmployeesTable(async () => {
    await requireHrEmployeeInWorkspace(employeeId, { workspaceId });
    const supabase = requireHrSupabase();
    const id = newId("doc");
    const safeName = input.file.name.replace(/[^\w.\-()+ ]+/g, "_");
    const storagePath = `hr-employee-docs/${workspaceId}/${employeeId}/${id}-${safeName}`;
    const buffer = Buffer.from(await input.file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(INTERNAL_FILES_BUCKET)
      .upload(storagePath, buffer, {
        contentType: input.file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw new Error(uploadError.message);

    const { data, error } = await supabase
      .from("hr_employee_documents")
      .insert({
        id,
        workspace_id: workspaceId,
        employee_id: employeeId,
        document_type: input.documentType,
        title: input.title?.trim() || input.file.name,
        file_name: input.file.name,
        storage_path: storagePath,
        mime_type: input.file.type || null,
        size_bytes: input.file.size,
        uploaded_by: input.uploadedBy.trim() || "system",
        uploaded_at: new Date().toISOString(),
        expires_at: input.expiresAt || null,
        notes: input.notes ?? null,
      })
      .select("*")
      .single();

    if (error) {
      await supabase.storage.from(INTERNAL_FILES_BUCKET).remove([storagePath]);
      throw new Error(error.message);
    }

    await addTimelineEvent(workspaceId, employeeId, {
      eventType: "document_added",
      title: `Document uploaded (${input.documentType})`,
      detail: input.file.name,
    });

    return mapDocument(data as Record<string, unknown>);
  });
}

export async function deleteEmployeeDocument(
  employeeId: string,
  documentId: string,
  scope?: HrWorkspaceScope,
) {
  const workspaceId = await resolveHrWorkspaceId(scope);
  return withHrEmployeesTable(async () => {
    await requireHrEmployeeInWorkspace(employeeId, { workspaceId });
    const supabase = requireHrSupabase();
    const { data, error } = await supabase
      .from("hr_employee_documents")
      .select("*")
      .eq("id", documentId)
      .eq("employee_id", employeeId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Document not found.");

    if (data.storage_path) {
      await supabase.storage.from(INTERNAL_FILES_BUCKET).remove([String(data.storage_path)]);
    }

    const { error: delError } = await supabase
      .from("hr_employee_documents")
      .delete()
      .eq("id", documentId)
      .eq("workspace_id", workspaceId);
    if (delError) throw new Error(delError.message);
  });
}

export async function getEmployeeDocumentDownloadUrl(
  employeeId: string,
  documentId: string,
  scope?: HrWorkspaceScope,
) {
  const workspaceId = await resolveHrWorkspaceId(scope);
  return withHrEmployeesTable(async () => {
    await requireHrEmployeeInWorkspace(employeeId, { workspaceId });
    const supabase = requireHrSupabase();
    const { data, error } = await supabase
      .from("hr_employee_documents")
      .select("storage_path, file_name")
      .eq("id", documentId)
      .eq("employee_id", employeeId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.storage_path) throw new Error("Document file not available.");

    const { data: signed, error: signedError } = await supabase.storage
      .from(INTERNAL_FILES_BUCKET)
      .createSignedUrl(String(data.storage_path), 60 * 10);
    if (signedError) throw new Error(signedError.message);
    return { url: signed.signedUrl, fileName: data.file_name as string | null };
  });
}

export async function addEmployeeNote(
  employeeId: string,
  body: string,
  createdBy: string,
  scope?: HrWorkspaceScope,
): Promise<HrEmployeeNote> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  return withHrEmployeesTable(async () => {
    await requireHrEmployeeInWorkspace(employeeId, { workspaceId });
    const supabase = requireHrSupabase();
    const { data, error } = await supabase
      .from("hr_employee_notes")
      .insert({
        id: newId("note"),
        workspace_id: workspaceId,
        employee_id: employeeId,
        body: body.trim(),
        created_by: createdBy.trim() || "system",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await addTimelineEvent(workspaceId, employeeId, {
      eventType: "note",
      title: "Note added",
      detail: body.trim().slice(0, 160),
    });

    return mapNote(data as Record<string, unknown>);
  });
}

export async function addTimelineManualEvent(
  employeeId: string,
  input: { title: string; detail?: string; occurredAt?: string },
  scope?: HrWorkspaceScope,
): Promise<HrTimelineEvent> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  return withHrEmployeesTable(async () => {
    await requireHrEmployeeInWorkspace(employeeId, { workspaceId });
    const supabase = requireHrSupabase();
    const { data, error } = await supabase
      .from("hr_employee_timeline_events")
      .insert({
        id: newId("tl"),
        workspace_id: workspaceId,
        employee_id: employeeId,
        event_type: "manual",
        occurred_at: input.occurredAt ?? new Date().toISOString(),
        title: input.title.trim(),
        detail: input.detail?.trim() || null,
        source: "employees",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapTimeline(data as Record<string, unknown>);
  });
}

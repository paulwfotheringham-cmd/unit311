/** MOD-071 Employees — Phase 1 data model (canonical with FDR). */

export const HR_EMPLOYMENT_STATUSES = [
  "candidate",
  "offer_accepted",
  "employee",
  "probation",
  "active",
  "leave_of_absence",
  "notice_given",
  "former_employee",
  "archived",
] as const;

export type HrEmploymentStatus = (typeof HR_EMPLOYMENT_STATUSES)[number];

/** Platform-standard Active Headcount (dashboards / Software cost / reporting). */
export const HR_ACTIVE_HEADCOUNT_STATUSES: readonly HrEmploymentStatus[] = [
  "active",
  "probation",
  "notice_given",
  "leave_of_absence",
] as const;

export const HR_EMPLOYMENT_STATUS_LABELS: Record<HrEmploymentStatus, string> = {
  candidate: "Candidate",
  offer_accepted: "Offer Accepted",
  employee: "Employee",
  probation: "Probation",
  active: "Active",
  leave_of_absence: "Leave of Absence",
  notice_given: "Notice Given",
  former_employee: "Former Employee",
  archived: "Archived",
};

export const HR_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contractor",
  "fixed_term",
] as const;

export type HrEmploymentType = (typeof HR_EMPLOYMENT_TYPES)[number];

export const HR_EMPLOYMENT_TYPE_LABELS: Record<HrEmploymentType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contractor: "Contractor",
  fixed_term: "Fixed term",
};

export const HR_COMPENSATION_CATEGORIES = [
  "salary",
  "bonus",
  "share_options",
  "pension",
  "benefits",
] as const;

export type HrCompensationCategory = (typeof HR_COMPENSATION_CATEGORIES)[number];

export const HR_COMPENSATION_CATEGORY_LABELS: Record<HrCompensationCategory, string> = {
  salary: "Salary",
  bonus: "Bonus",
  share_options: "Share options",
  pension: "Pension",
  benefits: "Benefits",
};

export const HR_DOCUMENT_TYPES = [
  "resume",
  "employment_contract",
  "passport",
  "visa",
  "right_to_work",
  "driving_licence",
  "qualifications",
  "certifications",
  "training_certificates",
  "medical",
  "insurance",
  "performance_reviews",
  "share_option_agreement",
  "other",
] as const;

export type HrDocumentType = (typeof HR_DOCUMENT_TYPES)[number];

export const HR_DOCUMENT_TYPE_LABELS: Record<HrDocumentType, string> = {
  resume: "Resume",
  employment_contract: "Employment Contract",
  passport: "Passport",
  visa: "Visa",
  right_to_work: "Right to Work",
  driving_licence: "Driving Licence",
  qualifications: "Qualifications",
  certifications: "Certifications",
  training_certificates: "Training Certificates",
  medical: "Medical",
  insurance: "Insurance",
  performance_reviews: "Performance Reviews",
  share_option_agreement: "Share Option Agreement",
  other: "Other",
};

export const HR_LOCATIONS = ["Barcelona", "Madrid", "Remote", "Hybrid"] as const;
export const HR_DEPARTMENTS = [
  "Executive",
  "Operations",
  "Training",
  "Flight Operations",
  "Sales",
  "Marketing",
  "People",
  "Technical",
  "Customer Success",
  "Finance",
  "Administration",
] as const;
export const HR_HOLIDAY_CALENDARS = [
  "Spain (Catalonia)",
  "Spain (National)",
  "United Kingdom",
  "Portugal",
] as const;

export type HrOffboarding = {
  noticeGivenDate: string | null;
  noticePeriod: string;
  finalWorkingDay: string | null;
  terminationDate: string | null;
  terminationReason: string;
  exitInterview: string;
  companyAssetsReturned: boolean;
  accountsDisabled: boolean;
  finalPayrollRef: string;
  outstandingLeavePaidRef: string;
  redundancyPaymentRef: string;
  severancePaymentRef: string;
  outstandingExpensesRef: string;
  finalAmountPaid: number | null;
  finalPaymentDate: string | null;
};

export type HrCompensationHistoryEntry = {
  id: string;
  employeeId: string;
  category: HrCompensationCategory;
  effectiveDate: string;
  amount: number | null;
  currency: string;
  reason: string;
  approvedBy: string;
  terms: string | null;
  supersededAt: string | null;
  createdAt: string;
};

export type HrEmployeeDocument = {
  id: string;
  employeeId: string;
  documentType: HrDocumentType;
  title: string;
  fileName: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: string;
  uploadedAt: string;
  expiresAt: string | null;
  notes: string | null;
};

export type HrEmployeeNote = {
  id: string;
  employeeId: string;
  body: string;
  createdBy: string;
  createdAt: string;
};

export type HrTimelineEvent = {
  id: string;
  employeeId: string;
  eventType: string;
  occurredAt: string;
  title: string;
  detail: string | null;
  source: string;
  createdAt: string;
};

export type HrEmploymentHistoryEntry = {
  id: string;
  employeeId: string;
  effectiveDate: string;
  department: string;
  role: string;
  location: string;
  officeId: string | null;
  managerEmployeeId: string | null;
  reason: string | null;
  createdAt: string;
};

export type HrEmployee = {
  id: string;
  employeeNumber: string;
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  nationality: string;
  employmentStatus: HrEmploymentStatus;
  employmentType: string;
  dateJoined: string;
  location: string;
  officeId: string | null;
  role: string;
  department: string;
  manager: string;
  managerEmployeeId: string | null;
  probationEndDate: string | null;
  endDate: string | null;
  currency: string;
  payFrequency: string;
  salaryCurrent: number;
  salaryPrevious: number;
  salaryIncreaseDate: string | null;
  salaryIncreaseAmount: number;
  bonus: number;
  holidayCalendar: string;
  vacationDaysPerYear: number;
  vacationDaysTaken: number;
  offboarding: HrOffboarding;
  archivedAt: string | null;
};

export type HrEmployeeDetail = HrEmployee & {
  compensationHistory: HrCompensationHistoryEntry[];
  documents: HrEmployeeDocument[];
  notes: HrEmployeeNote[];
  timeline: HrTimelineEvent[];
  employmentHistory: HrEmploymentHistoryEntry[];
};

export function isHrEmploymentStatus(value: unknown): value is HrEmploymentStatus {
  return (
    typeof value === "string" &&
    (HR_EMPLOYMENT_STATUSES as readonly string[]).includes(value)
  );
}

export function isActiveHeadcountStatus(status: HrEmploymentStatus): boolean {
  return (HR_ACTIVE_HEADCOUNT_STATUSES as readonly string[]).includes(status);
}

export function isBoardPackPayrollEligible(status: HrEmploymentStatus): boolean {
  return status !== "former_employee" && status !== "archived";
}

export function formatEmployeeNumber(seq: number): string {
  return `EMP-${String(seq).padStart(4, "0")}`;
}

export function emptyOffboarding(): HrOffboarding {
  return {
    noticeGivenDate: null,
    noticePeriod: "",
    finalWorkingDay: null,
    terminationDate: null,
    terminationReason: "",
    exitInterview: "",
    companyAssetsReturned: false,
    accountsDisabled: false,
    finalPayrollRef: "",
    outstandingLeavePaidRef: "",
    redundancyPaymentRef: "",
    severancePaymentRef: "",
    outstandingExpensesRef: "",
    finalAmountPaid: null,
    finalPaymentDate: null,
  };
}

type DbEmployee = {
  id: string;
  employee_number?: string | null;
  full_name: string;
  preferred_name?: string | null;
  email: string;
  phone: string;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  nationality?: string | null;
  employment_status?: string | null;
  employment_type?: string | null;
  date_joined: string;
  location?: string;
  office_id?: string | null;
  role?: string;
  department?: string;
  manager?: string;
  manager_employee_id?: string | null;
  probation_end_date?: string | null;
  end_date?: string | null;
  currency?: string | null;
  pay_frequency?: string | null;
  salary_current: number | string;
  salary_previous: number | string;
  salary_increase_date: string | null;
  salary_increase_amount?: number | string;
  bonus?: number | string;
  holiday_calendar?: string;
  vacation_days_per_year?: number | string;
  vacation_days_taken?: number | string;
  notice_given_date?: string | null;
  notice_period?: string | null;
  final_working_day?: string | null;
  termination_date?: string | null;
  termination_reason?: string | null;
  exit_interview?: string | null;
  company_assets_returned?: boolean | null;
  accounts_disabled?: boolean | null;
  final_payroll_ref?: string | null;
  outstanding_leave_paid_ref?: string | null;
  redundancy_payment_ref?: string | null;
  severance_payment_ref?: string | null;
  outstanding_expenses_ref?: string | null;
  final_amount_paid?: number | string | null;
  final_payment_date?: string | null;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function mapHrEmployee(row: DbEmployee): HrEmployee {
  const statusRaw = row.employment_status ?? "active";
  const employmentStatus = isHrEmploymentStatus(statusRaw) ? statusRaw : "active";
  return {
    id: row.id,
    employeeNumber: row.employee_number?.trim() || "",
    fullName: row.full_name,
    preferredName: row.preferred_name ?? "",
    email: row.email,
    phone: row.phone,
    address: row.address ?? "",
    emergencyContactName: row.emergency_contact_name ?? "",
    emergencyContactPhone: row.emergency_contact_phone ?? "",
    emergencyContactRelationship: row.emergency_contact_relationship ?? "",
    nationality: row.nationality ?? "",
    employmentStatus,
    employmentType: row.employment_type ?? "full_time",
    dateJoined: row.date_joined.slice(0, 10),
    location: row.location ?? "Barcelona",
    officeId: row.office_id ?? null,
    role: row.role ?? "",
    department: row.department ?? "",
    manager: row.manager ?? "",
    managerEmployeeId: row.manager_employee_id ?? null,
    probationEndDate: row.probation_end_date?.slice(0, 10) ?? null,
    endDate: row.end_date?.slice(0, 10) ?? null,
    currency: row.currency ?? "EUR",
    payFrequency: row.pay_frequency ?? "annual",
    salaryCurrent: Number(row.salary_current),
    salaryPrevious: Number(row.salary_previous),
    salaryIncreaseDate: row.salary_increase_date?.slice(0, 10) ?? null,
    salaryIncreaseAmount: Number(row.salary_increase_amount ?? 0),
    bonus: Number(row.bonus ?? 0),
    holidayCalendar: row.holiday_calendar ?? "Spain (Catalonia)",
    vacationDaysPerYear: Number(row.vacation_days_per_year ?? 22),
    vacationDaysTaken: Number(row.vacation_days_taken ?? 0),
    offboarding: {
      noticeGivenDate: row.notice_given_date?.slice(0, 10) ?? null,
      noticePeriod: row.notice_period ?? "",
      finalWorkingDay: row.final_working_day?.slice(0, 10) ?? null,
      terminationDate: row.termination_date?.slice(0, 10) ?? null,
      terminationReason: row.termination_reason ?? "",
      exitInterview: row.exit_interview ?? "",
      companyAssetsReturned: Boolean(row.company_assets_returned),
      accountsDisabled: Boolean(row.accounts_disabled),
      finalPayrollRef: row.final_payroll_ref ?? "",
      outstandingLeavePaidRef: row.outstanding_leave_paid_ref ?? "",
      redundancyPaymentRef: row.redundancy_payment_ref ?? "",
      severancePaymentRef: row.severance_payment_ref ?? "",
      outstandingExpensesRef: row.outstanding_expenses_ref ?? "",
      finalAmountPaid:
        row.final_amount_paid === null || row.final_amount_paid === undefined
          ? null
          : Number(row.final_amount_paid),
      finalPaymentDate: row.final_payment_date?.slice(0, 10) ?? null,
    },
    archivedAt: row.archived_at ?? null,
  };
}

export function vacationDaysRemaining(
  employee: Pick<HrEmployee, "vacationDaysPerYear" | "vacationDaysTaken">,
) {
  return Math.max(employee.vacationDaysPerYear - employee.vacationDaysTaken, 0);
}

export function createBlankEmployeeInput(): Omit<HrEmployee, "id" | "employeeNumber"> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    fullName: "",
    preferredName: "",
    email: "",
    phone: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    nationality: "",
    employmentStatus: "active",
    employmentType: "full_time",
    dateJoined: today,
    location: "Barcelona",
    officeId: null,
    role: "",
    department: "",
    manager: "",
    managerEmployeeId: null,
    probationEndDate: null,
    endDate: null,
    currency: "EUR",
    payFrequency: "annual",
    salaryCurrent: 32000,
    salaryPrevious: 32000,
    salaryIncreaseDate: null,
    salaryIncreaseAmount: 0,
    bonus: 0,
    holidayCalendar: "Spain (Catalonia)",
    vacationDaysPerYear: 22,
    vacationDaysTaken: 0,
    offboarding: emptyOffboarding(),
    archivedAt: null,
  };
}

export function formatSalary(amount: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatHrDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function statusBadgeClass(status: HrEmploymentStatus): string {
  switch (status) {
    case "active":
    case "probation":
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
    case "notice_given":
    case "leave_of_absence":
      return "border-amber-400/30 bg-amber-500/15 text-amber-100";
    case "former_employee":
    case "archived":
      return "border-white/15 bg-white/[0.06] text-white/55";
    default:
      return "border-sky-400/30 bg-sky-500/15 text-sky-100";
  }
}

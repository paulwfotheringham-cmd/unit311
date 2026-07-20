/** HR Reports catalogue — commercial report types for SME people teams. */

export const HR_REPORT_KINDS = [
  "employee_directory",
  "headcount",
  "performance_summary",
  "leave_summary",
  "training_matrix",
  "probation",
  "contract_expiry",
  "recruitment",
] as const;

export type HrReportKind = (typeof HR_REPORT_KINDS)[number];

export const HR_REPORT_KIND_LABELS: Record<HrReportKind, string> = {
  employee_directory: "Employee Directory",
  headcount: "Headcount",
  performance_summary: "Performance Summary",
  leave_summary: "Leave Summary",
  training_matrix: "Training Matrix",
  probation: "Probation Report",
  contract_expiry: "Contract Expiry Report",
  recruitment: "Recruitment Report",
};

export const HR_REPORT_KIND_DESCRIPTIONS: Record<HrReportKind, string> = {
  employee_directory: "Complete people directory with role, location, manager, and status.",
  headcount: "Active headcount by department, location, and employment type.",
  performance_summary: "Review completion, ratings distribution, and outstanding cycles.",
  leave_summary: "Approved, pending, and taken leave by type and department.",
  training_matrix: "Training attendance and outstanding learning actions.",
  probation: "Employees in probation with review dates and manager ownership.",
  contract_expiry: "Fixed-term and contract end dates approaching renewal.",
  recruitment: "Open roles, pipeline volume, offers, and time to hire.",
};

export const HR_REPORT_OUTPUTS = ["pdf", "excel", "csv"] as const;
export type HrReportOutput = (typeof HR_REPORT_OUTPUTS)[number];

export const HR_REPORT_OUTPUT_LABELS: Record<HrReportOutput, string> = {
  pdf: "PDF",
  excel: "Excel",
  csv: "CSV",
};

export type HrReportFilters = {
  department: string;
  location: string;
  manager: string;
  role: string;
  employmentType: string;
  dateFrom: string;
  dateTo: string;
  employeeId: string;
};

export type HrSavedReport = {
  id: string;
  name: string;
  kind: HrReportKind;
  output: HrReportOutput;
  filters: HrReportFilters;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  rowCount: number;
  previewLines: string[];
};

export function emptyHrReportFilters(): HrReportFilters {
  return {
    department: "all",
    location: "all",
    manager: "all",
    role: "all",
    employmentType: "all",
    dateFrom: "",
    dateTo: "",
    employeeId: "",
  };
}

export function defaultReportName(kind: HrReportKind) {
  const stamp = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  return `${HR_REPORT_KIND_LABELS[kind]} — ${stamp}`;
}

export function sampleReportPreview(kind: HrReportKind, filters: HrReportFilters): string[] {
  const scope = [
    filters.department !== "all" ? `Department: ${filters.department}` : "Department: All",
    filters.location !== "all" ? `Location: ${filters.location}` : "Location: All",
    filters.dateFrom || filters.dateTo
      ? `Period: ${filters.dateFrom || "…"} to ${filters.dateTo || "…"}`
      : "Period: Current",
  ];
  const bodies: Record<HrReportKind, string[]> = {
    employee_directory: [
      "Employee,Number,Department,Role,Location,Manager,Status",
      "María García,EMP-0001,Operations,Operations Lead,Barcelona,Paul Fotheringham,Active",
      "Carlos Mendoza,EMP-0002,Technical,Software Engineer,Barcelona,Hannes Weber,Probation",
    ],
    headcount: [
      "Segment,Count,Share",
      "Operations,8,29%",
      "Technical,6,21%",
      "Customer Success,5,18%",
    ],
    performance_summary: [
      "Status,Count",
      "Completed,12",
      "Submitted,4",
      "Draft,3",
      "Average rating,4.1",
    ],
    leave_summary: [
      "Type,Approved days,Pending requests",
      "Annual Leave,86,3",
      "Sick Leave,14,0",
      "Training,9,1",
    ],
    training_matrix: [
      "Employee,Course,Status,Due",
      "Ana Torres,People Partner essentials,Completed,2026-05-01",
      "Carlos Mendoza,Secure coding,In progress,2026-08-15",
    ],
    probation: [
      "Employee,Joined,Probation end,Manager,Status",
      "Carlos Mendoza,2026-05-12,2026-08-12,Hannes Weber,In progress",
    ],
    contract_expiry: [
      "Employee,Contract end,Type,Action",
      "Fixed-term contractor example,2026-09-30,Fixed term,Renewal discussion",
    ],
    recruitment: [
      "Role,Stage,Candidates,Hiring manager",
      "Senior Full-Stack Engineer,Interview,3,Hannes Weber",
      "Customer Success Specialist,Offer,2,Ashley Cole",
    ],
  };
  return [`${HR_REPORT_KIND_LABELS[kind]}`, ...scope, "", ...bodies[kind]];
}

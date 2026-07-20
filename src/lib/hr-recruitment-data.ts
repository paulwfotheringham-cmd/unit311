/** Recruitment / ATS — vacancy, candidate, interview, offer, timeline. */

export const HR_PIPELINE_STAGES = [
  "role_approved",
  "applications",
  "screening",
  "interview",
  "offer",
  "accepted",
  "onboarding",
] as const;

export type HrPipelineStage = (typeof HR_PIPELINE_STAGES)[number];

export const HR_PIPELINE_STAGE_LABELS: Record<HrPipelineStage, string> = {
  role_approved: "Vacancy Approved",
  applications: "Applications",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  accepted: "Accepted",
  onboarding: "Onboarding",
};

export const HR_VACANCY_STATUSES = ["open", "on_hold", "filled", "cancelled", "archived"] as const;
export type HrVacancyStatus = (typeof HR_VACANCY_STATUSES)[number];

export const HR_VACANCY_STATUS_LABELS: Record<HrVacancyStatus, string> = {
  open: "Open",
  on_hold: "On hold",
  filled: "Filled",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const HR_EMPLOYMENT_TYPES = ["Full time", "Part time", "Contract", "Fixed term"] as const;

export const HR_CANDIDATE_SOURCES = [
  "Careers page",
  "LinkedIn",
  "Referral",
  "Agency",
  "Job board",
  "Direct approach",
] as const;

export type HrVacancy = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  hiringManager: string;
  status: HrVacancyStatus;
  openedAt: string;
  targetStartDate: string;
  closingDate: string;
  headcount: number;
  salaryBand: string;
  description: string;
  requirements: string;
};

export type HrInterviewOutcome = "pass" | "hold" | "fail" | "pending";

export type HrInterview = {
  id: string;
  scheduledAt: string;
  type: "phone" | "video" | "onsite" | "panel";
  interviewer: string;
  interviewers: string;
  status: "scheduled" | "completed" | "cancelled";
  outcome: HrInterviewOutcome;
  rating: number | null;
  strengths: string;
  weaknesses: string;
  feedback: string;
  notes: string;
  recommendation: "strong_yes" | "yes" | "neutral" | "no" | "strong_no" | null;
};

export type HrOfferDetails = {
  status: "none" | "draft" | "sent" | "accepted" | "declined" | "withdrawn";
  salary: string;
  startDate: string;
  employmentType: string;
  notes: string;
  sentAt: string | null;
};

export type HrCandidateTimelineEvent = {
  id: string;
  at: string;
  label: string;
  detail: string;
};

export type HrCandidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  vacancyId: string;
  role: string;
  department: string;
  location: string;
  stage: HrPipelineStage;
  rating: number;
  interviewer: string;
  recruiter: string;
  expectedSalary: string;
  availability: string;
  source: string;
  appliedAt: string;
  notes: string;
  cvLabel: string;
  rejected: boolean;
  interviews: HrInterview[];
  offer: HrOfferDetails;
  timeline: HrCandidateTimelineEvent[];
};

export type HrCandidatePanelTab =
  | "Overview"
  | "CV"
  | "Interview Notes"
  | "Feedback"
  | "Offer"
  | "Timeline"
  | "Actions";

export const HR_CANDIDATE_PANEL_TABS: HrCandidatePanelTab[] = [
  "Overview",
  "CV",
  "Interview Notes",
  "Feedback",
  "Offer",
  "Timeline",
  "Actions",
];

export function emptyOfferDetails(): HrOfferDetails {
  return {
    status: "none",
    salary: "",
    startDate: "",
    employmentType: "Full time",
    notes: "",
    sentAt: null,
  };
}

export function emptyInterview(partial?: Partial<HrInterview>): HrInterview {
  return {
    id: partial?.id ?? `int-${crypto.randomUUID().slice(0, 8)}`,
    scheduledAt: partial?.scheduledAt ?? new Date().toISOString().slice(0, 16),
    type: partial?.type ?? "video",
    interviewer: partial?.interviewer ?? "",
    interviewers: partial?.interviewers ?? partial?.interviewer ?? "",
    status: partial?.status ?? "scheduled",
    outcome: partial?.outcome ?? "pending",
    rating: partial?.rating ?? null,
    strengths: partial?.strengths ?? "",
    weaknesses: partial?.weaknesses ?? "",
    feedback: partial?.feedback ?? "",
    notes: partial?.notes ?? "",
    recommendation: partial?.recommendation ?? null,
  };
}

export function nextPipelineStage(stage: HrPipelineStage): HrPipelineStage | null {
  const index = HR_PIPELINE_STAGES.indexOf(stage);
  if (index < 0 || index >= HR_PIPELINE_STAGES.length - 1) return null;
  return HR_PIPELINE_STAGES[index + 1]!;
}

export function pipelineStageClass(stage: HrPipelineStage) {
  switch (stage) {
    case "offer":
    case "accepted":
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
    case "interview":
      return "border-sky-400/30 bg-sky-500/15 text-sky-200";
    case "onboarding":
      return "border-violet-400/30 bg-violet-500/15 text-violet-200";
    case "screening":
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
    default:
      return "border-white/15 bg-white/5 text-white/60";
  }
}

export function interviewTypeLabel(type: HrInterview["type"]) {
  switch (type) {
    case "phone":
      return "Phone screen";
    case "video":
      return "Video interview";
    case "onsite":
      return "On-site interview";
    case "panel":
      return "Panel interview";
  }
}

export function offerStatusLabel(status: HrOfferDetails["status"]) {
  switch (status) {
    case "none":
      return "No offer";
    case "draft":
      return "Draft";
    case "sent":
      return "Offer sent";
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    case "withdrawn":
      return "Withdrawn";
  }
}

export function interviewOutcomeLabel(outcome: HrInterviewOutcome) {
  switch (outcome) {
    case "pass":
      return "Pass";
    case "hold":
      return "Hold";
    case "fail":
      return "Fail";
    case "pending":
      return "Pending";
  }
}

export function recommendationLabel(
  recommendation: HrInterview["recommendation"],
) {
  switch (recommendation) {
    case "strong_yes":
      return "Strong yes";
    case "yes":
      return "Yes";
    case "neutral":
      return "Neutral";
    case "no":
      return "No";
    case "strong_no":
      return "Strong no";
    default:
      return "Not set";
  }
}

export function startOfWeekIso(from = new Date()) {
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

export function endOfWeekIso(from = new Date()) {
  const start = startOfWeekIso(from);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function isoDateOnly(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

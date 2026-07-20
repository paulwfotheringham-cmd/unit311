/** Recruitment pipeline — vacancy, interview, offer, and candidate timeline. */

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
  role_approved: "Role Approved",
  applications: "Applications Received",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  accepted: "Accepted",
  onboarding: "Onboarding",
};

export const HR_VACANCY_STATUSES = ["open", "on_hold", "filled", "cancelled"] as const;
export type HrVacancyStatus = (typeof HR_VACANCY_STATUSES)[number];

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
  headcount: number;
  salaryBand: string;
  description: string;
  requirements: string;
};

export type HrInterview = {
  id: string;
  scheduledAt: string;
  type: "phone" | "video" | "onsite" | "panel";
  interviewer: string;
  status: "scheduled" | "completed" | "cancelled";
  feedback: string;
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
  vacancyId: string;
  role: string;
  department: string;
  location: string;
  stage: HrPipelineStage;
  rating: number;
  interviewer: string;
  expectedSalary: string;
  appliedAt: string;
  notes: string;
  rejected: boolean;
  interviews: HrInterview[];
  offer: HrOfferDetails;
  timeline: HrCandidateTimelineEvent[];
};

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

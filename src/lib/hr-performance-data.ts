/** Performance Management (MOD-073) — reviews, goals, competencies, career. */

export const HR_PERFORMANCE_RATINGS = [1, 2, 3, 4, 5] as const;
export type HrPerformanceRating = (typeof HR_PERFORMANCE_RATINGS)[number];

export const HR_PERFORMANCE_RATING_LABELS: Record<HrPerformanceRating, string> = {
  1: "Poor",
  2: "Needs Improvement",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
  5: "Outstanding",
};

export const HR_REVIEW_STATUSES = ["draft", "submitted", "approved", "completed"] as const;
export type HrReviewStatus = (typeof HR_REVIEW_STATUSES)[number];

export const HR_REVIEW_STATUS_LABELS: Record<HrReviewStatus, string> = {
  draft: "Draft",
  submitted: "Awaiting Manager",
  approved: "Awaiting Employee",
  completed: "Completed",
};

export const HR_REVIEW_TYPES = [
  "annual",
  "probation",
  "quarterly",
  "return_to_work",
  "custom",
] as const;
export type HrReviewType = (typeof HR_REVIEW_TYPES)[number];

export const HR_REVIEW_TYPE_LABELS: Record<HrReviewType, string> = {
  annual: "Annual",
  probation: "Probation",
  quarterly: "Quarterly",
  return_to_work: "Return to Work",
  custom: "Custom",
};

export const HR_GOAL_SCOPES = ["organisation", "department", "employee"] as const;
export type HrGoalScope = (typeof HR_GOAL_SCOPES)[number];

export const HR_GOAL_SCOPE_LABELS: Record<HrGoalScope, string> = {
  organisation: "Organisation",
  department: "Department",
  employee: "Employee",
};

export const HR_COMPETENCY_CATALOG = [
  "Leadership",
  "Communication",
  "Technical Ability",
  "Problem Solving",
  "Teamwork",
  "Customer Focus",
  "Innovation",
  "Planning",
  "Time Management",
  "Commercial Awareness",
] as const;

export const HR_DEVELOPMENT_KINDS = [
  "training",
  "certification",
  "mentoring",
  "coaching",
  "stretch",
  "other",
] as const;
export type HrDevelopmentKind = (typeof HR_DEVELOPMENT_KINDS)[number];

export const HR_DEVELOPMENT_KIND_LABELS: Record<HrDevelopmentKind, string> = {
  training: "Training course",
  certification: "Certification",
  mentoring: "Mentoring",
  coaching: "Coaching",
  stretch: "Stretch assignment",
  other: "Other",
};

export const HR_PERFORMANCE_SECTIONS = [
  {
    id: "communication",
    title: "Communication",
    questions: [
      { id: "communication", label: "Communicates clearly with colleagues and stakeholders" },
      { id: "customer_focus", label: "Responds effectively to internal and external customers" },
      { id: "collaboration", label: "Shares information and collaborates across teams" },
    ],
  },
  {
    id: "leadership",
    title: "Leadership",
    questions: [
      { id: "leadership", label: "Provides direction and sets a positive example" },
      { id: "decision_making", label: "Makes sound, timely decisions" },
      { id: "initiative", label: "Takes ownership and acts without being prompted" },
    ],
  },
  {
    id: "technical",
    title: "Technical Skills",
    questions: [
      { id: "technical_ability", label: "Applies the technical skills required for the role" },
      { id: "quality_of_work", label: "Delivers work to the expected quality standard" },
      { id: "problem_solving", label: "Identifies issues and resolves them effectively" },
      { id: "safety_compliance", label: "Follows safety, compliance, and operating procedures" },
    ],
  },
  {
    id: "planning",
    title: "Planning",
    questions: [
      { id: "planning", label: "Plans work and manages priorities effectively" },
      { id: "time_management", label: "Meets deadlines and manages time well" },
      { id: "reliability", label: "Can be relied upon to deliver commitments" },
    ],
  },
  {
    id: "teamwork",
    title: "Teamwork",
    questions: [
      { id: "teamwork", label: "Works constructively as part of a team" },
      { id: "adaptability", label: "Adapts well to change and new ways of working" },
      { id: "attendance", label: "Maintains reliable attendance and punctuality" },
    ],
  },
  {
    id: "development",
    title: "Professional Development",
    questions: [
      { id: "learning", label: "Seeks feedback and continues to develop skills" },
      { id: "innovation", label: "Suggests improvements and embraces better ways of working" },
      { id: "professionalism", label: "Conducts themselves with professionalism and integrity" },
    ],
  },
  {
    id: "overall",
    title: "Overall Assessment",
    questions: [
      { id: "overall_contribution", label: "Overall contribution to the organisation this period" },
    ],
  },
] as const;

export const HR_PERFORMANCE_QUESTIONS = HR_PERFORMANCE_SECTIONS.flatMap((section) =>
  section.questions.map((question) => ({ ...question, sectionId: section.id })),
);

export type HrPerformanceQuestionId = (typeof HR_PERFORMANCE_QUESTIONS)[number]["id"];

export type HrQuestionResponse = {
  questionId: HrPerformanceQuestionId;
  rating: HrPerformanceRating | null;
  managerComments: string;
  employeeComments: string;
};

export type HrPerformanceObjective = {
  id: string;
  title: string;
  description: string;
  progressPercent: number;
  dueDate: string;
  status: "on_track" | "at_risk" | "completed" | "deferred";
  weight?: number;
  owner?: string;
  scope?: HrGoalScope;
  department?: string;
  employeeId?: string | null;
  employeeName?: string;
  archived?: boolean;
};

export type HrCompetencyScore = {
  id: string;
  name: string;
  score: HrPerformanceRating;
  notes: string;
};

export type HrDevelopmentItem = {
  id: string;
  focus: string;
  action: string;
  owner: string;
  targetDate: string;
  status: "planned" | "in_progress" | "done";
  kind?: HrDevelopmentKind;
  budget?: string;
  nextReviewDate?: string;
};

export type HrSalaryReviewRecommendation = "increase" | "hold" | "review_later" | null;
export type HrManagerRecommendation = "retain" | "develop" | "performance_plan" | "exit_risk" | null;

export type HrCareerPotential = "low" | "medium" | "high";
export type HrPromotionReady = "now" | "12_months" | "24_months";

export type HrPerformanceReview = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  managerName: string;
  reviewPeriod: string;
  status: HrReviewStatus;
  overallRating: HrPerformanceRating | null;
  strengths: string;
  areasForImprovement: string;
  trainingRecommendations: string;
  promotionRecommendation: "yes" | "no" | "later" | null;
  salaryReviewRecommendation: HrSalaryReviewRecommendation;
  managerRecommendation: HrManagerRecommendation;
  employeeGoals: string;
  nextReviewDate: string | null;
  summary: string;
  responses: HrQuestionResponse[];
  objectives: HrPerformanceObjective[];
  competencies: HrCompetencyScore[];
  developmentPlan: HrDevelopmentItem[];
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  reviewType?: HrReviewType;
  priority?: "high" | "medium" | "low";
  dueDate?: string | null;
  challenges?: string;
  achievements?: string;
  employeeSelfAssessment?: string;
  careerPotential?: HrCareerPotential | null;
  promotionReady?: HrPromotionReady | null;
  successionCandidate?: boolean;
  careerAspirations?: string;
  managerCareerComments?: string;
  signedOffManager?: boolean;
  signedOffEmployee?: boolean;
};

export const HR_PERFORMANCE_PANEL_TABS = [
  "Overview",
  "Objectives",
  "Competencies",
  "Manager Review",
  "Employee Self Review",
  "Development Plan",
  "History",
] as const;

export type HrPerformancePanelTab = (typeof HR_PERFORMANCE_PANEL_TABS)[number];

export const HR_PERFORMANCE_HUB_TABS = [
  "Overview",
  "Review Queue",
  "Goals",
  "Development Plans",
  "Career Progression",
  "Competencies",
  "Reports",
] as const;

export type HrPerformanceHubTab = (typeof HR_PERFORMANCE_HUB_TABS)[number];

export function blankQuestionResponses(): HrQuestionResponse[] {
  return HR_PERFORMANCE_QUESTIONS.map((question) => ({
    questionId: question.id,
    rating: null,
    managerComments: "",
    employeeComments: "",
  }));
}

export function blankCompetencyScores(): HrCompetencyScore[] {
  return HR_COMPETENCY_CATALOG.map((name, index) => ({
    id: `comp-blank-${index}`,
    name,
    score: 3,
    notes: "",
  }));
}

export function reviewStatusClass(status: HrReviewStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
    case "approved":
      return "border-violet-400/30 bg-violet-500/15 text-violet-200";
    case "submitted":
      return "border-sky-400/30 bg-sky-500/15 text-sky-200";
    default:
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
  }
}

export function goalStatusClass(status: HrPerformanceObjective["status"]) {
  switch (status) {
    case "completed":
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
    case "on_track":
      return "border-sky-400/30 bg-sky-500/15 text-sky-200";
    case "at_risk":
      return "border-rose-400/30 bg-rose-500/15 text-rose-200";
    default:
      return "border-white/15 bg-white/5 text-white/55";
  }
}

export function goalStatusLabel(status: HrPerformanceObjective["status"]) {
  switch (status) {
    case "on_track":
      return "On Track";
    case "at_risk":
      return "Behind";
    case "completed":
      return "Completed";
    case "deferred":
      return "Deferred";
  }
}

export function averageRating(responses: HrQuestionResponse[]) {
  const rated = responses.filter((item) => item.rating != null);
  if (!rated.length) return null;
  const sum = rated.reduce((acc, item) => acc + (item.rating ?? 0), 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

export function employeeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function collectGoalsFromReviews(reviews: HrPerformanceReview[]): HrPerformanceObjective[] {
  const goals: HrPerformanceObjective[] = [];
  for (const review of reviews) {
    for (const objective of review.objectives) {
      goals.push({
        ...objective,
        scope: objective.scope ?? "employee",
        owner: objective.owner ?? review.employeeName,
        employeeId: objective.employeeId ?? review.employeeId,
        employeeName: objective.employeeName ?? review.employeeName,
        department: objective.department ?? review.department,
        weight: objective.weight ?? 1,
      });
    }
  }
  return goals;
}

export function computePerformanceHubKpis(
  reviews: HrPerformanceReview[],
  standaloneGoals: HrPerformanceObjective[],
) {
  const today = new Date().toISOString().slice(0, 10);
  const quarterStart = (() => {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3) * 3;
    return new Date(d.getFullYear(), q, 1).toISOString().slice(0, 10);
  })();

  const due = reviews.filter(
    (review) =>
      review.status !== "completed" &&
      ((review.dueDate && review.dueDate <= today) ||
        (review.nextReviewDate && review.nextReviewDate <= today) ||
        review.status === "draft" ||
        review.status === "submitted"),
  ).length;

  const completedThisQuarter = reviews.filter(
    (review) =>
      review.status === "completed" &&
      (review.completedAt ?? review.updatedAt) >= quarterStart,
  ).length;

  const goals = [
    ...standaloneGoals.filter((goal) => !goal.archived),
    ...collectGoalsFromReviews(reviews).filter((goal) => !goal.archived),
  ];
  const onTrack = goals.filter((goal) => goal.status === "on_track").length;
  const behind = goals.filter((goal) => goal.status === "at_risk").length;

  const requiringAttention = reviews.filter(
    (review) =>
      review.status === "draft" ||
      review.status === "submitted" ||
      review.objectives.some((objective) => objective.status === "at_risk") ||
      review.managerRecommendation === "performance_plan" ||
      review.managerRecommendation === "exit_risk",
  ).length;

  const rated = reviews.filter((review) => review.overallRating != null);
  const average =
    rated.length === 0
      ? null
      : Math.round(
          (rated.reduce((sum, review) => sum + (review.overallRating ?? 0), 0) / rated.length) *
            10,
        ) / 10;

  const promotionRecommendations = reviews.filter(
    (review) => review.promotionRecommendation === "yes" || review.promotionReady === "now",
  ).length;

  const trainingRecommendations = reviews.filter(
    (review) => review.trainingRecommendations.trim().length > 0,
  ).length;

  return {
    due,
    completedThisQuarter,
    onTrack,
    behind,
    requiringAttention,
    average,
    promotionRecommendations,
    trainingRecommendations,
  };
}

export function downloadPerformanceTextFile(
  filename: string,
  lines: string[],
  mime: "application/pdf" | "text/csv" | "application/vnd.ms-excel",
) {
  const blob = new Blob([lines.join("\n")], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

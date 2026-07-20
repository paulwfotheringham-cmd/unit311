/** Performance review form — competency sections and recommendation fields. */

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
  submitted: "Submitted",
  approved: "Approved",
  completed: "Completed",
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
};

export type HrSalaryReviewRecommendation = "increase" | "hold" | "review_later" | null;
export type HrManagerRecommendation = "retain" | "develop" | "performance_plan" | "exit_risk" | null;

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

export function blankQuestionResponses(): HrQuestionResponse[] {
  return HR_PERFORMANCE_QUESTIONS.map((question) => ({
    questionId: question.id,
    rating: null,
    managerComments: "",
    employeeComments: "",
  }));
}

export function reviewStatusClass(status: HrReviewStatus) {
  switch (status) {
    case "completed":
    case "approved":
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
    case "submitted":
      return "border-sky-400/30 bg-sky-500/15 text-sky-200";
    default:
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
  }
}

export function averageRating(responses: HrQuestionResponse[]) {
  const rated = responses.filter((item) => item.rating != null);
  if (!rated.length) return null;
  const sum = rated.reduce((acc, item) => acc + (item.rating ?? 0), 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

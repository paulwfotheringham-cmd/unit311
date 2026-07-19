export type QmsModule = {
  id: string;
  title: string;
  description: string;
  status: "complete" | "in-progress" | "not-started";
  lessons: number;
};

export const QMS_MODULES: QmsModule[] = [
  {
    id: "qms-1",
    title: "Quality policy & scope",
    description: "Define the quality management system scope for Unit311 Central operations.",
    status: "complete",
    lessons: 4,
  },
  {
    id: "qms-2",
    title: "Document control",
    description: "Versioning, approval, and distribution of controlled documents.",
    status: "in-progress",
    lessons: 6,
  },
  {
    id: "qms-3",
    title: "Internal audit",
    description: "Plan, conduct, and close internal audits with corrective actions.",
    status: "not-started",
    lessons: 5,
  },
  {
    id: "qms-4",
    title: "Non-conformance & CAPA",
    description: "Log issues, root cause analysis, and corrective/preventive actions.",
    status: "not-started",
    lessons: 5,
  },
  {
    id: "qms-5",
    title: "Management review",
    description: "Executive review inputs, KPIs, and improvement decisions.",
    status: "not-started",
    lessons: 3,
  },
];

export const QMS_TRAINING_COURSES = [
  {
    id: "qms-intro",
    title: "QMS fundamentals",
    duration: "45 min",
    progress: 100,
  },
  {
    id: "qms-audit",
    title: "Internal auditor training",
    duration: "2 hrs",
    progress: 35,
  },
  {
    id: "qms-capa",
    title: "CAPA workflow",
    duration: "1 hr",
    progress: 0,
  },
] as const;


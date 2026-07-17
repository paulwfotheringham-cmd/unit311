export type DiscoveryQuestionRowSize = 1 | 2 | 4;

export type DiscoveryQuestionTemplate = {
  id: string;
  section: string;
  label: string;
  rows: DiscoveryQuestionRowSize;
};

export type DiscoveryCustomQuestionRow = {
  id: string;
  section: string;
  label: string;
  rows: DiscoveryQuestionRowSize;
  answer: string;
};

export type DiscoveryQuestionnaireData = {
  answers: Record<string, string>;
  customRows: DiscoveryCustomQuestionRow[];
  updatedAt: string | null;
};

export const DISCOVERY_QUESTION_SECTIONS = [
  "Business overview",
  "Biggest pain points",
  "Software applications",
  "Final questions",
] as const;

export type DiscoveryQuestionSection = (typeof DISCOVERY_QUESTION_SECTIONS)[number];

export const DISCOVERY_QUESTION_TEMPLATES: DiscoveryQuestionTemplate[] = [
  {
    id: "business-activities",
    section: "Business overview",
    label: "Description of business activities",
    rows: 4,
  },
  {
    id: "main-locations",
    section: "Business overview",
    label: "Main locations of business",
    rows: 1,
  },
  {
    id: "staff-count",
    section: "Business overview",
    label: "Number of staff",
    rows: 1,
  },
  {
    id: "business-age",
    section: "Business overview",
    label: "Age of business",
    rows: 1,
  },
  {
    id: "tech-spend",
    section: "Business overview",
    label: "Approx spend per year on Technology",
    rows: 1,
  },
  {
    id: "software-count",
    section: "Business overview",
    label: "Approx number of software applications",
    rows: 1,
  },
  {
    id: "pain-no-adoption",
    section: "Biggest pain points",
    label: "No one uses the systems",
    rows: 2,
  },
  {
    id: "pain-reports",
    section: "Biggest pain points",
    label: "Reports are impossible to make",
    rows: 2,
  },
  {
    id: "pain-data-accuracy",
    section: "Biggest pain points",
    label: "Data is inaccurate",
    rows: 2,
  },
  {
    id: "pain-cost",
    section: "Biggest pain points",
    label: "Cost of running solutions",
    rows: 1,
  },
  {
    id: "pain-improvements",
    section: "Biggest pain points",
    label: "What would you improve if you could?",
    rows: 4,
  },
  {
    id: "software-executive-assistant",
    section: "Software applications",
    label: "AI Executive Assistant / Board Deck Automation / Other",
    rows: 1,
  },
  {
    id: "software-clients-crm-onboarding",
    section: "Software applications",
    label: "Clients, CRM, Client Acquisition / Onboarding",
    rows: 1,
  },
  {
    id: "software-crm",
    section: "Software applications",
    label: "CRM",
    rows: 1,
  },
  {
    id: "software-project-management",
    section: "Software applications",
    label: "Project Management",
    rows: 1,
  },
  {
    id: "software-financial-reporting",
    section: "Software applications",
    label: "Financial / Reporting",
    rows: 1,
  },
  {
    id: "software-hr",
    section: "Software applications",
    label: "Human Resources / Representative Mgmt",
    rows: 1,
  },
  {
    id: "software-asset-management",
    section: "Software applications",
    label: "Asset Management",
    rows: 1,
  },
  {
    id: "software-inventory-management",
    section: "Software applications",
    label: "Inventory Management",
    rows: 1,
  },
  {
    id: "software-logistics",
    section: "Software applications",
    label: "Logistics",
    rows: 1,
  },
  {
    id: "software-engineering",
    section: "Software applications",
    label: "Engineering Management",
    rows: 1,
  },
  {
    id: "software-information-repository",
    section: "Software applications",
    label: "Information Repository",
    rows: 1,
  },
  {
    id: "software-messaging",
    section: "Software applications",
    label: "Messaging",
    rows: 1,
  },
  {
    id: "software-email",
    section: "Software applications",
    label: "Email",
    rows: 1,
  },
  {
    id: "software-social-media",
    section: "Software applications",
    label: "Social media",
    rows: 1,
  },
  {
    id: "software-support-center",
    section: "Software applications",
    label: "Support Center",
    rows: 1,
  },
  {
    id: "software-training-center",
    section: "Software applications",
    label: "Training Center",
    rows: 1,
  },
  {
    id: "software-qms",
    section: "Software applications",
    label: "Quality Management System",
    rows: 1,
  },
  {
    id: "software-competitors-whiteboard",
    section: "Software applications",
    label: "Competitors / Whiteboard",
    rows: 1,
  },
  {
    id: "software-website-management",
    section: "Software applications",
    label: "Website Management",
    rows: 1,
  },
  {
    id: "software-user-roles",
    section: "Software applications",
    label: "User, Roles & Notification Management",
    rows: 1,
  },
  {
    id: "final-other",
    section: "Final questions",
    label: "Other",
    rows: 4,
  },
  {
    id: "final-next-steps",
    section: "Final questions",
    label: "Next steps",
    rows: 4,
  },
  {
    id: "final-interest-level",
    section: "Final questions",
    label: "Interest level",
    rows: 1,
  },
];

export function createEmptyDiscoveryQuestionnaire(): DiscoveryQuestionnaireData {
  return {
    answers: Object.fromEntries(
      DISCOVERY_QUESTION_TEMPLATES.map((question) => [question.id, ""]),
    ),
    customRows: [],
    updatedAt: null,
  };
}

export function normalizeDiscoveryQuestionnaire(
  value: unknown,
): DiscoveryQuestionnaireData {
  const empty = createEmptyDiscoveryQuestionnaire();

  if (!value || typeof value !== "object") return empty;

  const record = value as Partial<DiscoveryQuestionnaireData>;
  const answers = { ...empty.answers };

  if (record.answers && typeof record.answers === "object") {
    for (const [key, answer] of Object.entries(record.answers)) {
      if (typeof answer === "string") answers[key] = answer;
    }
  }

  const customRows: DiscoveryCustomQuestionRow[] = Array.isArray(record.customRows)
    ? record.customRows
        .filter(
          (row): row is DiscoveryCustomQuestionRow =>
            Boolean(row) &&
            typeof row === "object" &&
            typeof (row as DiscoveryCustomQuestionRow).id === "string" &&
            typeof (row as DiscoveryCustomQuestionRow).section === "string" &&
            typeof (row as DiscoveryCustomQuestionRow).label === "string",
        )
        .map((row) => ({
          id: row.id,
          section: row.section,
          label: row.label,
          rows: (row.rows === 2 || row.rows === 4 ? row.rows : 1) as DiscoveryQuestionRowSize,
          answer: typeof row.answer === "string" ? row.answer : "",
        }))
    : [];

  return {
    answers,
    customRows,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
  };
}

export function discoveryQuestionTextareaRows(rows: DiscoveryQuestionRowSize) {
  switch (rows) {
    case 4:
      return 4;
    case 2:
      return 2;
    default:
      return 1;
  }
}

export const DISCOVERY_QUESTIONNAIRE_NOTES_PREFIX = "Discovery questionnaire JSON:";

export function buildDiscoveryQuestionnaireNotes(data: DiscoveryQuestionnaireData) {
  return `${DISCOVERY_QUESTIONNAIRE_NOTES_PREFIX}\n${JSON.stringify(data)}`;
}

export function parseDiscoveryQuestionnaireFromNotes(
  notes: string | null | undefined,
): DiscoveryQuestionnaireData | null {
  if (!notes?.includes(DISCOVERY_QUESTIONNAIRE_NOTES_PREFIX)) return null;

  const jsonStart = notes.indexOf("{", notes.indexOf(DISCOVERY_QUESTIONNAIRE_NOTES_PREFIX));
  if (jsonStart < 0) return null;

  try {
    return normalizeDiscoveryQuestionnaire(JSON.parse(notes.slice(jsonStart)));
  } catch {
    return null;
  }
}

export function isDiscoveryCallLead(lead: {
  notes: string;
  nextAction: string;
}) {
  return (
    lead.notes.includes("Booked via /book") ||
    lead.nextAction.toLowerCase().includes("executive strategy session")
  );
}

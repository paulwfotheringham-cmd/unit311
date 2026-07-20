export const UNIT311_DETAILS_ROOT_FOLDER_NAME = "Unit311 Details";

export type Unit311BuiltinCategoryId =
  | "platform-overview"
  | "authentication"
  | "vercel"
  | "github"
  | "supabase"
  | "storage"
  | "cursor"
  | "zoho-email"
  | "wise"
  | "xero"
  | "finance"
  | "crm"
  | "workspace-provisioning"
  | "workspace-onboarding"
  | "ai-agent"
  | "nakama-technology-holdings"
  | "website"
  | "linkedin"
  | "voice-and-video"
  | "software-asset-register"
  | "architecture-diagrams"
  | "module-go-live"
  | "domain-go-live";

export type Unit311DetailCategoryId = Unit311BuiltinCategoryId | `custom-${string}`;

export type Unit311DetailCategory = {
  readonly id: Unit311DetailCategoryId;
  readonly label: string;
  readonly folderName: string;
  readonly builtin?: boolean;
};

export const UNIT311_DETAIL_CATEGORIES: readonly Unit311DetailCategory[] = [
  {
    id: "platform-overview",
    label: "Platform Overview",
    folderName: "Platform Overview",
    builtin: true,
  },
  {
    id: "authentication",
    label: "Authentication",
    folderName: "Authentication",
    builtin: true,
  },
  { id: "vercel", label: "Vercel", folderName: "Vercel", builtin: true },
  { id: "github", label: "Github", folderName: "Github", builtin: true },
  { id: "supabase", label: "Supabase", folderName: "Supabase", builtin: true },
  { id: "storage", label: "Storage", folderName: "Storage", builtin: true },
  { id: "cursor", label: "Cursor", folderName: "Cursor", builtin: true },
  { id: "zoho-email", label: "Zoho email", folderName: "Zoho email", builtin: true },
  { id: "wise", label: "Wise", folderName: "Wise", builtin: true },
  { id: "xero", label: "Xero", folderName: "Xero", builtin: true },
  { id: "finance", label: "Finance", folderName: "Finance", builtin: true },
  { id: "crm", label: "CRM", folderName: "CRM", builtin: true },
  {
    id: "workspace-provisioning",
    label: "Workspace Provisioning",
    folderName: "Workspace Provisioning",
    builtin: true,
  },
  {
    id: "workspace-onboarding",
    label: "Workspace Onboarding",
    folderName: "Workspace Onboarding",
    builtin: true,
  },
  { id: "ai-agent", label: "AI Agent", folderName: "AI Agent", builtin: true },
  {
    id: "nakama-technology-holdings",
    label: "Nakama Technology Holdings",
    folderName: "Nakama Technology Holdings",
    builtin: true,
  },
  { id: "website", label: "Website", folderName: "Website", builtin: true },
  { id: "linkedin", label: "Linkedin", folderName: "Linkedin", builtin: true },
  {
    id: "voice-and-video",
    label: "Voice & Video",
    folderName: "Voice & Video",
    builtin: true,
  },
  {
    id: "software-asset-register",
    label: "Software Asset Register",
    folderName: "Software Asset Register",
    builtin: true,
  },
  {
    id: "architecture-diagrams",
    label: "Architecture Diagrams",
    folderName: "Architecture Diagrams",
    builtin: true,
  },
  {
    id: "module-go-live",
    label: "Module Go-Live",
    folderName: "Module Go-Live",
    builtin: true,
  },
  {
    id: "domain-go-live",
    label: "Domain Go-Live",
    folderName: "Domain Go-Live",
    builtin: true,
  },
] as const;

export const UNIT311_DETAIL_ROWS: readonly (readonly Unit311BuiltinCategoryId[])[] = [
  ["platform-overview", "authentication", "website", "storage", "supabase"],
  ["workspace-provisioning", "workspace-onboarding", "crm", "wise", "finance"],
  ["ai-agent", "zoho-email", "vercel", "github", "cursor"],
  ["xero", "nakama-technology-holdings", "linkedin", "voice-and-video"],
  ["software-asset-register", "architecture-diagrams"],
];

const builtinCategoryById = new Map(
  UNIT311_DETAIL_CATEGORIES.map((category) => [category.id, category]),
);

const builtinFolderNames = new Set(
  UNIT311_DETAIL_CATEGORIES.map((category) => category.folderName.toLowerCase()),
);

export function slugifyDetailSectionName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

export function customDetailCategoryId(label: string): Unit311DetailCategoryId {
  return `custom-${slugifyDetailSectionName(label)}`;
}

export function isBuiltinDetailCategoryId(value: string): value is Unit311BuiltinCategoryId {
  return builtinCategoryById.has(value as Unit311BuiltinCategoryId);
}

export function getBuiltinDetailCategory(id: string): Unit311DetailCategory | null {
  return builtinCategoryById.get(id as Unit311BuiltinCategoryId) ?? null;
}

export function isReservedDetailFolderName(name: string) {
  return builtinFolderNames.has(name.trim().toLowerCase());
}

export function detailDocumentBaseName(label: string) {
  return `${label} details`;
}

export function detailDocxFileName(label: string) {
  return `${detailDocumentBaseName(label)}.docx`;
}

export function detailTxtFileName(label: string) {
  return `${detailDocumentBaseName(label)}.txt`;
}

export function detailTasksFileName(label: string) {
  return `${label} tasks.json`;
}

export type Unit311DetailTask = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
};

export function parseUnit311DetailTasks(raw: string): Unit311DetailTask[] {
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is Unit311DetailTask =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Unit311DetailTask).id === "string" &&
          typeof (item as Unit311DetailTask).title === "string" &&
          typeof (item as Unit311DetailTask).done === "boolean" &&
          typeof (item as Unit311DetailTask).createdAt === "string",
      )
      .map((task) => ({
        id: task.id,
        title: task.title.trim(),
        done: task.done,
        createdAt: task.createdAt,
      }))
      .filter((task) => task.title.length > 0);
  } catch {
    return [];
  }
}

export function serializeUnit311DetailTasks(tasks: readonly Unit311DetailTask[]) {
  return JSON.stringify(tasks, null, 2);
}

export function groupCategoriesIntoRows(categories: readonly Unit311DetailCategory[]) {
  const builtinIds = new Set<string>(UNIT311_DETAIL_CATEGORIES.map((category) => category.id));
  const rows: Unit311DetailCategory[][] = UNIT311_DETAIL_ROWS.map((row) =>
    row
      .map((id) => categories.find((category) => category.id === id) ?? null)
      .filter((category): category is Unit311DetailCategory => category !== null),
  );

  const customCategories = categories.filter((category) => !builtinIds.has(category.id));
  if (customCategories.length > 0) {
    rows.push(customCategories);
  }

  return rows;
}

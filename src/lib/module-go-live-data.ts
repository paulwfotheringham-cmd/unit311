export const MODULE_GO_LIVE_STATUSES = ["Not Started", "Needs Work", "Ready"] as const;

export type ModuleGoLiveStatus = (typeof MODULE_GO_LIVE_STATUSES)[number];

export type ModuleGoLiveEntry = {
  readonly id: string;
  readonly module: string;
  status: ModuleGoLiveStatus;
};

/** Permanent module IDs — never change. */
export const MODULE_GO_LIVE_CATALOG: readonly Omit<ModuleGoLiveEntry, "status">[] = [
  { id: "MOD-001", module: "Dashboard" },
  { id: "MOD-002", module: "Executive Assistant" },
  { id: "MOD-010", module: "Clients Dashboard" },
  { id: "MOD-011", module: "Client Directory" },
  { id: "MOD-012", module: "Client Onboarding" },
  { id: "MOD-020", module: "CRM Pipeline" },
  { id: "MOD-021", module: "Discovery & Demo Sessions" },
  { id: "MOD-022", module: "Potential Clients" },
  { id: "MOD-030", module: "Partners" },
  { id: "MOD-040", module: "Projects Dashboard" },
  { id: "MOD-041", module: "Internal Projects" },
  { id: "MOD-042", module: "External Projects" },
  { id: "MOD-050", module: "Grants" },
  { id: "MOD-060", module: "Financial Overview" },
  { id: "MOD-061", module: "General Ledger" },
  { id: "MOD-062", module: "Accounts Receivable" },
  { id: "MOD-063", module: "Accounts Payable" },
  { id: "MOD-064", module: "Expenses" },
  { id: "MOD-065", module: "Bank" },
  { id: "MOD-066", module: "Reports" },
  { id: "MOD-070", module: "Human Resources Dashboard" },
  { id: "MOD-071", module: "Employees" },
  { id: "MOD-072", module: "Leave" },
  { id: "MOD-073", module: "Performance" },
  { id: "MOD-074", module: "Reports" },
  { id: "MOD-201", module: "Recruitment ATS" },
  { id: "MOD-080", module: "Corporate Information Dashboard" },
  { id: "MOD-081", module: "Company Details" },
  { id: "MOD-082", module: "Office Locations" },
  { id: "MOD-083", module: "Bank Accounts" },
  { id: "MOD-084", module: "Professional Advisors" },
  { id: "MOD-085", module: "Software & Licences" },
  { id: "MOD-086", module: "Contracts" },
  { id: "MOD-087", module: "Unit311 Details" },
  { id: "MOD-090", module: "Assets" },
  { id: "MOD-091", module: "Inventory Management" },
  { id: "MOD-092", module: "Logistics" },
  { id: "MOD-100", module: "File Explorer" },
  { id: "MOD-101", module: "Internal Files" },
  { id: "MOD-102", module: "External Files" },
  { id: "MOD-103", module: "Client Explorer" },
  { id: "MOD-110", module: "Calendar" },
  { id: "MOD-111", module: "Email" },
  { id: "MOD-112", module: "Communications" },
  { id: "MOD-113", module: "Social" },
  { id: "MOD-114", module: "Support Desk" },
  { id: "MOD-120", module: "Training Dashboard" },
  { id: "MOD-121", module: "Staff Training" },
  { id: "MOD-122", module: "QMS Training" },
  { id: "MOD-130", module: "Quality Management System" },
  { id: "MOD-140", module: "Engineering Dashboard" },
  { id: "MOD-141", module: "Engineer / Resource Breakdown" },
  { id: "MOD-150", module: "Website Management" },
  { id: "MOD-151", module: "Testing" },
  { id: "MOD-152", module: "Telemetry" },
  { id: "MOD-153", module: "Users" },
  { id: "MOD-160", module: "External Client Dashboard" },
  { id: "MOD-161", module: "External Users" },
  { id: "MOD-170", module: "Profile" },
  { id: "MOD-171", module: "General" },
  { id: "MOD-172", module: "Platform Billing" },
] as const;

/** Unit311 Details content category used for persistence (hidden from Details UI grid). */
export const MODULE_GO_LIVE_STORAGE_CATEGORY_ID = "module-go-live" as const;

export function isModuleGoLiveStatus(value: unknown): value is ModuleGoLiveStatus {
  return (
    typeof value === "string" &&
    (MODULE_GO_LIVE_STATUSES as readonly string[]).includes(value)
  );
}

/** Wave 0 verified defaults when no stored status exists. */
const MODULE_GO_LIVE_DEFAULT_STATUS: Readonly<Partial<Record<string, ModuleGoLiveStatus>>> = {
  /** MOD-001 Command Centre v2. */
  "MOD-001": "Ready",
  /** MOD-200 / MOD-201 — HR domain closed Ready (2026-07-21). Only backlog: HR-201. */
  "MOD-070": "Ready",
  "MOD-071": "Ready",
  "MOD-072": "Ready",
  "MOD-073": "Ready",
  "MOD-074": "Ready",
  "MOD-201": "Ready",
  /** MOD-400 — Corporate Information domain Ready (2026-07-21). */
  "MOD-080": "Ready",
  "MOD-081": "Ready",
  "MOD-082": "Ready",
  "MOD-083": "Ready",
  "MOD-084": "Ready",
  "MOD-085": "Ready",
  "MOD-086": "Ready",
  "MOD-087": "Ready",
  /** MOD-500 — Inventory Management operational EAM Ready (2026-07-21). Asset Register (MOD-090) unchanged. */
  "MOD-091": "Ready",
  /** MOD-600 — Training & Quality Management domain Ready (2026-07-21). */
  "MOD-120": "Ready",
  "MOD-121": "Ready",
  "MOD-122": "Ready",
  "MOD-130": "Ready",
  /** MOD-600/610/620 program wave — Engineering, Website Management, External Client Access. */
  "MOD-140": "Ready",
  "MOD-141": "Ready",
  "MOD-150": "Ready",
  "MOD-160": "Ready",
  /** Profile bound to session / whoami (Wave 0). */
  "MOD-170": "Ready",
  /** Wave 1 — Client Directory lifecycle rewrite (FDR-MOD-011-LIFECYCLE). */
  "MOD-011": "Ready",
  /** Wave 1 — External Users client_id FK (FDR-MOD-161). */
  "MOD-161": "Ready",
  /** MOD-103 Client Files — contained document workspace per Client Directory. */
  "MOD-103": "Ready",
  /** Wave 1 — Clients Dashboard tiles aligned to lifecycle buckets. */
  "MOD-010": "Ready",
};

export function buildDefaultModuleGoLiveRegister(): ModuleGoLiveEntry[] {
  return MODULE_GO_LIVE_CATALOG.map((entry) => ({
    id: entry.id,
    module: entry.module,
    status: MODULE_GO_LIVE_DEFAULT_STATUS[entry.id] ?? ("Not Started" as const),
  }));
}

export function mergeModuleGoLiveRegister(
  stored: unknown,
): ModuleGoLiveEntry[] {
  const byId = new Map<string, ModuleGoLiveStatus>();

  if (stored && typeof stored === "object") {
    const rows = Array.isArray(stored)
      ? stored
      : Array.isArray((stored as { modules?: unknown }).modules)
        ? (stored as { modules: unknown[] }).modules
        : Array.isArray((stored as { entries?: unknown }).entries)
          ? (stored as { entries: unknown[] }).entries
          : [];

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const id = String((row as { id?: unknown }).id ?? "").trim();
      const status = (row as { status?: unknown }).status;
      if (id && isModuleGoLiveStatus(status)) {
        byId.set(id, status);
      }
    }
  }

  return MODULE_GO_LIVE_CATALOG.map((entry) => {
    const storedStatus = byId.get(entry.id);
    const defaultStatus = MODULE_GO_LIVE_DEFAULT_STATUS[entry.id];
    // Explicit stored statuses always win — including intentional "Not Started".
    // Catalogue defaults only fill gaps for modules missing from the stored register.
    return {
      id: entry.id,
      module: entry.module,
      status: storedStatus ?? defaultStatus ?? "Not Started",
    };
  });
}

export function serializeModuleGoLiveRegister(entries: ModuleGoLiveEntry[]): string {
  return `${JSON.stringify(
    {
      version: 1,
      updatedAt: new Date().toISOString(),
      modules: entries.map((entry) => ({
        id: entry.id,
        status: entry.status,
      })),
    },
    null,
    2,
  )}\n`;
}

export function parseModuleGoLiveRegister(content: string): ModuleGoLiveEntry[] {
  const trimmed = content.trim();
  if (!trimmed) {
    return buildDefaultModuleGoLiveRegister();
  }
  try {
    return mergeModuleGoLiveRegister(JSON.parse(trimmed));
  } catch {
    return buildDefaultModuleGoLiveRegister();
  }
}

export function moduleGoLiveStatusClass(status: ModuleGoLiveStatus): string {
  switch (status) {
    case "Ready":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
    case "Needs Work":
      return "border-amber-400/40 bg-amber-500/15 text-amber-100";
    case "Not Started":
    default:
      return "border-white/15 bg-white/[0.04] text-white/70";
  }
}

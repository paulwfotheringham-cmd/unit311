import {
  MODULE_GO_LIVE_CATALOG,
  type ModuleGoLiveEntry,
  type ModuleGoLiveStatus,
} from "@/lib/module-go-live-data";

export const DOMAIN_GO_LIVE_STORAGE_CATEGORY_ID = "domain-go-live" as const;

/** Display status after applying Blocked override. */
export const DOMAIN_GO_LIVE_DISPLAY_STATUSES = [
  "Not Started",
  "In Progress",
  "Ready",
  "Blocked",
] as const;

export type DomainGoLiveDisplayStatus =
  (typeof DOMAIN_GO_LIVE_DISPLAY_STATUSES)[number];

/** Always calculated from Module Go-Live — never persisted. */
export type DomainGoLiveDerivedStatus = "Not Started" | "In Progress" | "Ready";

export type DomainGoLiveCatalogEntry = {
  readonly id: string;
  readonly name: string;
  readonly moduleIds: readonly string[];
};

/**
 * Authoritative module → domain mapping.
 * Every MODULE_GO_LIVE_CATALOG id belongs to exactly one domain.
 */
export const DOMAIN_GO_LIVE_CATALOG: readonly DomainGoLiveCatalogEntry[] = [
  { id: "DOM-01", name: "Home", moduleIds: ["MOD-001"] },
  { id: "DOM-02", name: "Executive Assistant", moduleIds: ["MOD-002"] },
  { id: "DOM-03", name: "Clients", moduleIds: ["MOD-010", "MOD-011"] },
  {
    id: "DOM-04",
    name: "CRM",
    moduleIds: ["MOD-012", "MOD-020", "MOD-021", "MOD-022"],
  },
  { id: "DOM-05", name: "Partners", moduleIds: ["MOD-030"] },
  {
    id: "DOM-06",
    name: "Projects",
    moduleIds: ["MOD-040", "MOD-041", "MOD-042"],
  },
  { id: "DOM-07", name: "Grants", moduleIds: ["MOD-050"] },
  {
    id: "DOM-08",
    name: "Financials",
    moduleIds: [
      "MOD-060",
      "MOD-061",
      "MOD-062",
      "MOD-063",
      "MOD-064",
      "MOD-065",
      "MOD-066",
    ],
  },
  {
    id: "DOM-09",
    name: "Human Resources",
    moduleIds: ["MOD-070", "MOD-071", "MOD-072", "MOD-073", "MOD-074", "MOD-201"],
  },
  {
    id: "DOM-10",
    name: "Corporate Information",
    moduleIds: [
      "MOD-080",
      "MOD-081",
      "MOD-082",
      "MOD-083",
      "MOD-084",
      "MOD-085",
      "MOD-086",
      "MOD-087",
    ],
  },
  {
    id: "DOM-11",
    name: "Operations",
    moduleIds: ["MOD-090", "MOD-091", "MOD-092"],
  },
  {
    id: "DOM-12",
    name: "Productivity & Collaboration",
    moduleIds: [
      "MOD-100",
      "MOD-101",
      "MOD-102",
      "MOD-103",
      "MOD-110",
      "MOD-111",
      "MOD-112",
      "MOD-113",
      "MOD-114",
    ],
  },
  {
    id: "DOM-13",
    name: "Training",
    moduleIds: ["MOD-120", "MOD-121", "MOD-122"],
  },
  { id: "DOM-14", name: "QMS", moduleIds: ["MOD-130"] },
  {
    id: "DOM-15",
    name: "Technology Management",
    moduleIds: ["MOD-140", "MOD-141"],
  },
  {
    id: "DOM-16",
    name: "Tools",
    moduleIds: ["MOD-150", "MOD-151", "MOD-152", "MOD-153"],
  },
  {
    id: "DOM-17",
    name: "External Client Access",
    moduleIds: ["MOD-160", "MOD-161"],
  },
  {
    id: "DOM-18",
    name: "Settings",
    moduleIds: ["MOD-170", "MOD-171", "MOD-172"],
  },
] as const;

export type DomainGoLiveOverride = {
  readonly id: string;
  readonly blocked: boolean;
  readonly blockedReason: string;
  readonly notes: string;
};

export type DomainGoLiveChild = {
  readonly id: string;
  readonly module: string;
  readonly status: ModuleGoLiveStatus;
};

export type DomainGoLiveEntry = {
  readonly id: string;
  readonly name: string;
  readonly derivedStatus: DomainGoLiveDerivedStatus;
  readonly blocked: boolean;
  readonly blockedReason: string;
  readonly notes: string;
  /** Blocked if override active; otherwise derived. */
  readonly status: DomainGoLiveDisplayStatus;
  readonly children: readonly DomainGoLiveChild[];
  readonly canReady: boolean;
};

export type DomainModuleCoverageReport = {
  readonly ok: boolean;
  readonly unmappedModuleIds: readonly string[];
  readonly unknownDomainModuleIds: readonly string[];
  readonly duplicateModuleIds: readonly string[];
};

export function assertDomainModuleCoverage(): DomainModuleCoverageReport {
  const catalogIds = MODULE_GO_LIVE_CATALOG.map((entry) => entry.id);
  const seen = new Map<string, string>();
  const duplicateModuleIds: string[] = [];
  const unknownDomainModuleIds: string[] = [];

  for (const domain of DOMAIN_GO_LIVE_CATALOG) {
    for (const moduleId of domain.moduleIds) {
      if (!catalogIds.includes(moduleId)) {
        unknownDomainModuleIds.push(moduleId);
      }
      const prior = seen.get(moduleId);
      if (prior) {
        duplicateModuleIds.push(moduleId);
      } else {
        seen.set(moduleId, domain.id);
      }
    }
  }

  const unmappedModuleIds = catalogIds.filter((id) => !seen.has(id));

  return {
    ok:
      unmappedModuleIds.length === 0 &&
      unknownDomainModuleIds.length === 0 &&
      duplicateModuleIds.length === 0,
    unmappedModuleIds,
    unknownDomainModuleIds,
    duplicateModuleIds,
  };
}

export function deriveDomainStatus(
  childStatuses: readonly ModuleGoLiveStatus[],
): DomainGoLiveDerivedStatus {
  if (childStatuses.length === 0) return "Not Started";
  if (childStatuses.every((status) => status === "Ready")) return "Ready";
  if (childStatuses.every((status) => status === "Not Started")) return "Not Started";
  return "In Progress";
}

export function buildDomainGoLiveEntries(
  modules: readonly ModuleGoLiveEntry[],
  overrides: readonly DomainGoLiveOverride[],
): DomainGoLiveEntry[] {
  const byModuleId = new Map(modules.map((row) => [row.id, row]));
  const overrideById = new Map(overrides.map((row) => [row.id, row]));

  return DOMAIN_GO_LIVE_CATALOG.map((domain) => {
    const children: DomainGoLiveChild[] = domain.moduleIds.map((moduleId) => {
      const mod = byModuleId.get(moduleId);
      return {
        id: moduleId,
        module: mod?.module ?? moduleId,
        status: mod?.status ?? "Not Started",
      };
    });
    const derivedStatus = deriveDomainStatus(children.map((child) => child.status));
    const override = overrideById.get(domain.id);
    const blocked = Boolean(override?.blocked);
    const blockedReason = override?.blockedReason?.trim() ?? "";
    const notes = override?.notes?.trim() ?? "";
    const status: DomainGoLiveDisplayStatus = blocked ? "Blocked" : derivedStatus;

    return {
      id: domain.id,
      name: domain.name,
      derivedStatus,
      blocked,
      blockedReason,
      notes,
      status,
      children,
      canReady: !blocked && derivedStatus === "Ready",
    };
  });
}

export function parseDomainGoLiveOverrides(content: string): DomainGoLiveOverride[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as {
      domains?: unknown;
    };
    if (!Array.isArray(parsed.domains)) return [];

    const validIds = new Set(DOMAIN_GO_LIVE_CATALOG.map((row) => row.id));
    const overrides: DomainGoLiveOverride[] = [];

    for (const row of parsed.domains) {
      if (!row || typeof row !== "object") continue;
      const id = String((row as { id?: unknown }).id ?? "").trim();
      if (!id || !validIds.has(id)) continue;
      const blocked = Boolean((row as { blocked?: unknown }).blocked);
      const blockedReason = String(
        (row as { blockedReason?: unknown }).blockedReason ?? "",
      ).trim();
      const notes = String((row as { notes?: unknown }).notes ?? "").trim();
      if (!blocked && !blockedReason && !notes) continue;
      overrides.push({ id, blocked, blockedReason, notes });
    }

    return overrides;
  } catch {
    return [];
  }
}

export function serializeDomainGoLiveOverrides(
  overrides: readonly DomainGoLiveOverride[],
): string {
  const domains = overrides
    .filter((row) => row.blocked || row.blockedReason.trim() || row.notes.trim())
    .map((row) => ({
      id: row.id,
      blocked: row.blocked,
      blockedReason: row.blockedReason,
      notes: row.notes,
    }));

  return `${JSON.stringify(
    {
      version: 1,
      updatedAt: new Date().toISOString(),
      domains,
    },
    null,
    2,
  )}\n`;
}

export function domainGoLiveStatusClass(status: DomainGoLiveDisplayStatus): string {
  switch (status) {
    case "Ready":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
    case "In Progress":
      return "border-amber-400/40 bg-amber-500/15 text-amber-100";
    case "Blocked":
      return "border-rose-400/40 bg-rose-500/15 text-rose-100";
    case "Not Started":
    default:
      return "border-white/15 bg-white/[0.04] text-white/70";
  }
}

/** Domains that share one implementation today — informational UI warning. */
export const DOMAIN_SHARED_IMPLEMENTATION_WARNINGS: Readonly<
  Record<string, string>
> = {
  "DOM-06":
    "Projects views still share one implementation until Internal/External behaviour is differentiated.",
  "DOM-15":
    "Technology Management views still share implementations until Devices, Software, and Infrastructure modules diverge.",
};

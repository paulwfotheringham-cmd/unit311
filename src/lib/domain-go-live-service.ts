import type { FilesWorkspaceScope } from "@/lib/files-workspace";
import {
  assertDomainModuleCoverage,
  buildDomainGoLiveEntries,
  DOMAIN_GO_LIVE_CATALOG,
  DOMAIN_GO_LIVE_STORAGE_CATEGORY_ID,
  parseDomainGoLiveOverrides,
  serializeDomainGoLiveOverrides,
  type DomainGoLiveEntry,
  type DomainGoLiveOverride,
  type DomainModuleCoverageReport,
} from "@/lib/domain-go-live-data";
import { getModuleGoLiveRegister } from "@/lib/module-go-live-service";
import {
  loadUnit311DetailContent,
  saveUnit311DetailContent,
} from "@/lib/unit311-details-service";

function isUnknownCategoryError(error: unknown) {
  return error instanceof Error && /unknown category/i.test(error.message);
}

export async function getDomainGoLiveOverrides(
  scope?: FilesWorkspaceScope,
): Promise<DomainGoLiveOverride[]> {
  try {
    const detail = await loadUnit311DetailContent(
      DOMAIN_GO_LIVE_STORAGE_CATEGORY_ID,
      scope,
    );
    return parseDomainGoLiveOverrides(detail.content ?? "");
  } catch (error) {
    if (isUnknownCategoryError(error)) {
      console.warn(
        "[domain-go-live] Storage category missing; using empty overrides.",
        error,
      );
      return [];
    }
    throw error;
  }
}

export async function saveDomainGoLiveOverrides(
  overrides: DomainGoLiveOverride[],
  scope?: FilesWorkspaceScope,
): Promise<DomainGoLiveOverride[]> {
  const validIds = new Set(DOMAIN_GO_LIVE_CATALOG.map((row) => row.id));
  const cleaned = overrides.filter((row) => validIds.has(row.id));
  await saveUnit311DetailContent(
    DOMAIN_GO_LIVE_STORAGE_CATEGORY_ID,
    serializeDomainGoLiveOverrides(cleaned),
    scope,
  );
  return cleaned;
}

export async function getDomainGoLiveRegister(scope?: FilesWorkspaceScope): Promise<{
  domains: DomainGoLiveEntry[];
  coverage: DomainModuleCoverageReport;
}> {
  const coverage = assertDomainModuleCoverage();
  const [modules, overrides] = await Promise.all([
    getModuleGoLiveRegister(scope),
    getDomainGoLiveOverrides(scope),
  ]);
  return {
    domains: buildDomainGoLiveEntries(modules, overrides),
    coverage,
  };
}

export async function setDomainGoLiveBlocked(
  id: string,
  input: { blocked: boolean; blockedReason?: string; notes?: string },
  scope?: FilesWorkspaceScope,
): Promise<{
  domains: DomainGoLiveEntry[];
  coverage: DomainModuleCoverageReport;
}> {
  const domain = DOMAIN_GO_LIVE_CATALOG.find((row) => row.id === id);
  if (!domain) {
    throw new Error(`Unknown domain id: ${id}`);
  }

  if (input.blocked && !String(input.blockedReason ?? "").trim()) {
    throw new Error("blockedReason is required when blocked is true.");
  }

  const current = await getDomainGoLiveOverrides(scope);
  const nextMap = new Map(current.map((row) => [row.id, row]));

  if (!input.blocked && !String(input.notes ?? "").trim()) {
    nextMap.delete(id);
  } else {
    nextMap.set(id, {
      id,
      blocked: Boolean(input.blocked),
      blockedReason: input.blocked
        ? String(input.blockedReason ?? "").trim()
        : "",
      notes: String(input.notes ?? "").trim(),
    });
  }

  await saveDomainGoLiveOverrides([...nextMap.values()], scope);
  return getDomainGoLiveRegister(scope);
}

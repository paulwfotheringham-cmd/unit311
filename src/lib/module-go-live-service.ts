import type { FilesWorkspaceScope } from "@/lib/files-workspace";
import {
  MODULE_GO_LIVE_STORAGE_CATEGORY_ID,
  type ModuleGoLiveEntry,
  type ModuleGoLiveStatus,
  isModuleGoLiveStatus,
  mergeModuleGoLiveRegister,
  parseModuleGoLiveRegister,
  serializeModuleGoLiveRegister,
} from "@/lib/module-go-live-data";
import {
  loadUnit311DetailContent,
  saveUnit311DetailContent,
} from "@/lib/unit311-details-service";

export async function getModuleGoLiveRegister(
  scope?: FilesWorkspaceScope,
): Promise<ModuleGoLiveEntry[]> {
  const detail = await loadUnit311DetailContent(MODULE_GO_LIVE_STORAGE_CATEGORY_ID, scope);
  return parseModuleGoLiveRegister(detail.content ?? "");
}

export async function saveModuleGoLiveRegister(
  entries: ModuleGoLiveEntry[],
  scope?: FilesWorkspaceScope,
): Promise<ModuleGoLiveEntry[]> {
  const merged = mergeModuleGoLiveRegister(entries);
  await saveUnit311DetailContent(
    MODULE_GO_LIVE_STORAGE_CATEGORY_ID,
    serializeModuleGoLiveRegister(merged),
    scope,
  );
  return merged;
}

export async function updateModuleGoLiveStatus(
  id: string,
  status: ModuleGoLiveStatus,
  scope?: FilesWorkspaceScope,
): Promise<ModuleGoLiveEntry[]> {
  if (!isModuleGoLiveStatus(status)) {
    throw new Error("Status must be Not Started, Needs Work, or Ready.");
  }

  const current = await getModuleGoLiveRegister(scope);
  const next = current.map((entry) =>
    entry.id === id ? { ...entry, status } : entry,
  );

  if (!next.some((entry) => entry.id === id)) {
    throw new Error(`Unknown module id: ${id}`);
  }

  return saveModuleGoLiveRegister(next, scope);
}

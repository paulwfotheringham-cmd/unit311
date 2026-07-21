import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  customDetailCategoryId,
  detailDocxFileName,
  detailTasksFileName,
  detailTxtFileName,
  getBuiltinDetailCategory,
  isReservedDetailFolderName,
  parseUnit311DetailTasks,
  serializeUnit311DetailTasks,
  UNIT311_DETAIL_CATEGORIES,
  UNIT311_DETAILS_ROOT_FOLDER_NAME,
  type Unit311DetailCategory,
  type Unit311DetailCategoryId,
  type Unit311DetailTask,
} from "@/lib/unit311-details-data";
import { DOMAIN_GO_LIVE_STORAGE_CATEGORY_ID } from "@/lib/domain-go-live-data";
import { MODULE_GO_LIVE_STORAGE_CATEGORY_ID } from "@/lib/module-go-live-data";
import {
  browseFolder,
  createFolder,
  deleteFile,
  requireFilesSupabase,
  uploadFile,
} from "@/lib/internal-files-service";
import { INTERNAL_FILES_BUCKET, type FileFolder } from "@/lib/internal-files-data";
import {
  resolveFilesWorkspaceId,
  type FilesWorkspaceScope,
} from "@/lib/files-workspace";

function isGoLiveStorageCategory(categoryId: string) {
  return (
    categoryId === MODULE_GO_LIVE_STORAGE_CATEGORY_ID ||
    categoryId === DOMAIN_GO_LIVE_STORAGE_CATEGORY_ID
  );
}

const VOICE_AND_VIDEO_DOC_PATH = "docs/VOICE_AND_VIDEO_ARCHITECTURE.md";

function readSeedDetailContent(categoryId: string): string | null {
  if (categoryId !== "voice-and-video") return null;
  try {
    return readFileSync(join(process.cwd(), VOICE_AND_VIDEO_DOC_PATH), "utf8");
  } catch {
    return null;
  }
}

type DbFile = {
  id: string;
  name: string;
  storage_path: string;
};

export type Unit311DetailsFolderMap = Record<string, string>;

export type Unit311DetailsBootstrap = {
  rootFolderId: string;
  folders: Unit311DetailsFolderMap;
  categories: Unit311DetailCategory[];
};

async function findAllFoldersByName(
  name: string,
  parentId: string | null,
  scope?: FilesWorkspaceScope,
): Promise<FileFolder[]> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  let query = supabase
    .from("file_folders")
    .select("*")
    .eq("name", name)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (parentId === null) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    parentId: row.parent_id as string | null,
    categoryId: row.category_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

async function findFolderByName(
  name: string,
  parentId: string | null,
  scope?: FilesWorkspaceScope,
): Promise<FileFolder | null> {
  const folders = await findAllFoldersByName(name, parentId, scope);
  return folders[0] ?? null;
}

/**
 * Merge sibling folders that share the same name into the oldest keeper.
 * Moves child folders + files, then deletes losers. Prevents Module Go-Live
 * from reading an empty duplicate while content lives in another folder.
 */
async function consolidateDuplicateFoldersByName(
  name: string,
  parentId: string | null,
  scope?: FilesWorkspaceScope,
): Promise<FileFolder | null> {
  const folders = await findAllFoldersByName(name, parentId, scope);
  if (folders.length === 0) return null;
  if (folders.length === 1) return folders[0];

  const keeper = folders[0];
  const losers = folders.slice(1);
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();

  console.warn(
    `[unit311-details] Consolidating ${folders.length} duplicate folders name=${name} workspace=${workspaceId}; keeping ${keeper.id}`,
  );

  for (const loser of losers) {
    const { error: childMoveError } = await supabase
      .from("file_folders")
      .update({ parent_id: keeper.id, updated_at: new Date().toISOString() })
      .eq("parent_id", loser.id)
      .eq("workspace_id", workspaceId);
    if (childMoveError) throw new Error(childMoveError.message);

    const { data: loserFiles, error: listFilesError } = await supabase
      .from("file_objects")
      .select("id, name")
      .eq("folder_id", loser.id)
      .eq("workspace_id", workspaceId);
    if (listFilesError) throw new Error(listFilesError.message);

    for (const file of loserFiles ?? []) {
      const existingInKeeper = await findFilesInFolderByName(
        keeper.id,
        file.name as string,
        scope,
      );
      if (existingInKeeper.length > 0) {
        // Prefer the newest content when both folders have the same filename.
        const { data: loserMeta, error: loserMetaError } = await supabase
          .from("file_objects")
          .select("id, created_at")
          .eq("id", file.id as string)
          .eq("workspace_id", workspaceId)
          .limit(1);
        if (loserMetaError) throw new Error(loserMetaError.message);
        const loserCreated = String(loserMeta?.[0]?.created_at ?? "");
        const keeperFile = existingInKeeper[0];
        const { data: keeperMeta } = await supabase
          .from("file_objects")
          .select("created_at")
          .eq("id", keeperFile.id)
          .eq("workspace_id", workspaceId)
          .limit(1);
        const keeperCreated = String(keeperMeta?.[0]?.created_at ?? "");
        if (loserCreated > keeperCreated) {
          await deleteFile(keeperFile.id, scope);
          const { error: moveFileError } = await supabase
            .from("file_objects")
            .update({ folder_id: keeper.id, updated_at: new Date().toISOString() })
            .eq("id", file.id as string)
            .eq("workspace_id", workspaceId);
          if (moveFileError) throw new Error(moveFileError.message);
        } else {
          await deleteFile(file.id as string, scope);
        }
      } else {
        const { error: moveFileError } = await supabase
          .from("file_objects")
          .update({ folder_id: keeper.id, updated_at: new Date().toISOString() })
          .eq("id", file.id as string)
          .eq("workspace_id", workspaceId);
        if (moveFileError) throw new Error(moveFileError.message);
      }
    }

    const { error: deleteFolderError } = await supabase
      .from("file_folders")
      .delete()
      .eq("id", loser.id)
      .eq("workspace_id", workspaceId);
    if (deleteFolderError) throw new Error(deleteFolderError.message);
  }

  return keeper;
}

async function ensureFolder(
  name: string,
  parentId: string | null,
  scope?: FilesWorkspaceScope,
): Promise<FileFolder> {
  const consolidated = await consolidateDuplicateFoldersByName(name, parentId, scope);
  if (consolidated) return consolidated;
  try {
    return await createFolder(name, parentId, null, scope);
  } catch (error) {
    // Concurrent bootstrap can race; re-read / consolidate after insert conflicts.
    const raced = await consolidateDuplicateFoldersByName(name, parentId, scope);
    if (raced) return raced;
    throw error;
  }
}

async function listChildFolderMap(parentId: string, scope?: FilesWorkspaceScope) {
  const { entries } = await browseFolder({ folderId: parentId }, scope);
  // Prefer the oldest folder when duplicate names exist so lookups stay stable
  // with findFolderByName (created_at ascending).
  const map = new Map<string, { id: string; createdAt: string }>();
  for (const entry of entries) {
    if (entry.kind !== "folder") continue;
    const key = entry.item.name.toLowerCase();
    const createdAt = entry.item.createdAt;
    const existing = map.get(key);
    if (!existing || createdAt < existing.createdAt) {
      map.set(key, { id: entry.item.id, createdAt });
    }
  }
  return new Map([...map.entries()].map(([key, value]) => [key, value.id]));
}

async function listDetailCategories(
  rootFolderId: string,
  scope?: FilesWorkspaceScope,
): Promise<Unit311DetailCategory[]> {
  const { entries } = await browseFolder({ folderId: rootFolderId }, scope);
  const categories: Unit311DetailCategory[] = UNIT311_DETAIL_CATEGORIES.map((category) => ({
    ...category,
  }));

  for (const entry of entries) {
    if (entry.kind !== "folder") continue;

    const displayName = entry.item.name;
    if (isReservedDetailFolderName(displayName)) {
      continue;
    }

    categories.push({
      id: customDetailCategoryId(displayName),
      label: displayName,
      folderName: displayName,
      builtin: false,
    });
  }

  return categories.sort((left, right) => {
    if (left.builtin && !right.builtin) return -1;
    if (!left.builtin && right.builtin) return 1;
    return left.label.localeCompare(right.label);
  });
}

async function resolveCategory(
  categoryId: string,
  rootFolderId: string,
  scope?: FilesWorkspaceScope,
): Promise<Unit311DetailCategory | null> {
  const categories = await listDetailCategories(rootFolderId, scope);
  return categories.find((category) => category.id === categoryId) ?? null;
}

export async function ensureUnit311DetailsFolders(
  scope?: FilesWorkspaceScope,
): Promise<Unit311DetailsBootstrap> {
  const root = await ensureFolder(UNIT311_DETAILS_ROOT_FOLDER_NAME, null, scope);

  for (const category of UNIT311_DETAIL_CATEGORIES) {
    await ensureFolder(category.folderName, root.id, scope);
  }

  const categories = await listDetailCategories(root.id, scope);
  const childFolders = await listChildFolderMap(root.id, scope);
  const folders: Unit311DetailsFolderMap = {};

  for (const category of categories) {
    const folderId = childFolders.get(category.folderName.toLowerCase());
    if (folderId) {
      folders[category.id] = folderId;
    }
  }

  return { rootFolderId: root.id, folders, categories };
}

async function readStorageText(storagePath: string): Promise<string> {
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase.storage.from(INTERNAL_FILES_BUCKET).download(storagePath);
  if (error || !data) return "";
  return data.text();
}

async function findFilesInFolderByName(
  folderId: string,
  name: string,
  scope?: FilesWorkspaceScope,
): Promise<DbFile[]> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  // Prefer newest when duplicates exist — never .maybeSingle() (PGRST116 on >1 row).
  const { data, error } = await supabase
    .from("file_objects")
    .select("id, name, storage_path, created_at")
    .eq("folder_id", folderId)
    .eq("name", name)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length > 1) {
    console.warn(
      `[unit311-details] Duplicate file_objects for workspace=${workspaceId} folder=${folderId} name=${name} count=${rows.length}; using newest.`,
    );
  }
  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    storage_path: row.storage_path as string,
  }));
}

async function findFileInFolder(
  folderId: string,
  name: string,
  scope?: FilesWorkspaceScope,
): Promise<DbFile | null> {
  const files = await findFilesInFolderByName(folderId, name, scope);
  if (files.length <= 1) return files[0] ?? null;

  // Repair: keep newest, delete older duplicates so future .single()-style
  // lookups and unique indexes stay healthy.
  for (const extra of files.slice(1)) {
    try {
      await deleteFile(extra.id, scope);
    } catch (error) {
      console.warn(
        `[unit311-details] Failed deleting duplicate file ${extra.id} (${name}):`,
        error,
      );
    }
  }
  return files[0] ?? null;
}

async function deleteNamedFilesInFolder(
  folderId: string,
  names: string[],
  scope?: FilesWorkspaceScope,
) {
  for (const name of names) {
    const files = await findFilesInFolderByName(folderId, name, scope);
    for (const file of files) {
      await deleteFile(file.id, scope);
    }
  }
}

async function buildDetailDocxBuffer(label: string, content: string): Promise<Buffer> {
  const lines = content.split(/\r?\n/);
  const children = [
    new Paragraph({
      text: `${label} — Unit311 Details`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    }),
    ...lines.map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line })],
          spacing: { after: 120 },
        }),
    ),
  ];

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

function toUploadFile(name: string, buffer: Buffer, mimeType: string) {
  const bytes = Uint8Array.from(buffer);
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], name, { type: mimeType });
}

export async function createUnit311DetailSection(name: string, scope?: FilesWorkspaceScope) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Section name is required.");
  }
  if (trimmed.length > 80) {
    throw new Error("Section name must be 80 characters or fewer.");
  }

  const root = await ensureFolder(UNIT311_DETAILS_ROOT_FOLDER_NAME, null, scope);

  if (isReservedDetailFolderName(trimmed)) {
    throw new Error("This name is already used by a standard section.");
  }

  const existing = await findFolderByName(trimmed, root.id, scope);
  if (existing) {
    throw new Error("A section with this name already exists.");
  }

  const folder = await createFolder(trimmed, root.id, null, scope);
  const category: Unit311DetailCategory = {
    id: customDetailCategoryId(trimmed),
    label: trimmed,
    folderName: trimmed,
    builtin: false,
  };

  return {
    category,
    folderId: folder.id,
    rootFolderId: root.id,
  };
}

export async function loadUnit311DetailContent(
  categoryId: string,
  scope?: FilesWorkspaceScope,
) {
  const bootstrap = await ensureUnit311DetailsFolders(scope);
  const category = await resolveCategory(categoryId, bootstrap.rootFolderId, scope);
  if (!category) {
    throw new Error("Unknown category.");
  }

  const folderId = bootstrap.folders[categoryId];
  if (!folderId) {
    throw new Error("Category folder not found.");
  }

  const txtName = detailTxtFileName(category.label);
  const txtFile = await findFileInFolder(folderId, txtName, scope);
  let content = txtFile ? await readStorageText(txtFile.storage_path) : "";

  if (!content.trim()) {
    const seed = readSeedDetailContent(categoryId);
    if (seed?.trim()) {
      await saveUnit311DetailContent(categoryId, seed, scope);
      content = seed;
    }
  }

  return {
    categoryId,
    label: category.label,
    content,
    folderId,
  };
}

export async function saveUnit311DetailContent(
  categoryId: string,
  content: string,
  scope?: FilesWorkspaceScope,
) {
  const bootstrap = await ensureUnit311DetailsFolders(scope);
  const category = await resolveCategory(categoryId, bootstrap.rootFolderId, scope);
  if (!category) {
    throw new Error("Unknown category.");
  }

  const folderId = bootstrap.folders[categoryId];
  if (!folderId) {
    throw new Error("Category folder not found.");
  }

  const docxName = detailDocxFileName(category.label);
  const txtName = detailTxtFileName(category.label);

  await deleteNamedFilesInFolder(folderId, [docxName, txtName], scope);

  const docxBuffer = await buildDetailDocxBuffer(category.label, content);
  const txtBuffer = Buffer.from(content, "utf8");

  const docxFile = await uploadFile(
    {
      file: toUploadFile(
        docxName,
        docxBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
      folderId,
      categoryId: null,
    },
    scope,
  );

  await uploadFile(
    {
      file: toUploadFile(txtName, txtBuffer, "text/plain"),
      folderId,
      categoryId: null,
    },
    scope,
  );

  return {
    categoryId,
    label: category.label,
    folderId,
    docxFileId: docxFile.id,
    docxFileName: docxName,
  };
}

async function loadTasksFromFolder(
  folderId: string,
  label: string,
  scope?: FilesWorkspaceScope,
): Promise<Unit311DetailTask[]> {
  const tasksFile = await findFileInFolder(folderId, detailTasksFileName(label), scope);
  if (!tasksFile) return [];
  const raw = await readStorageText(tasksFile.storage_path);
  return parseUnit311DetailTasks(raw);
}

export async function saveUnit311DetailTasks(
  categoryId: string,
  tasks: Unit311DetailTask[],
  scope?: FilesWorkspaceScope,
) {
  const bootstrap = await ensureUnit311DetailsFolders(scope);
  const category = await resolveCategory(categoryId, bootstrap.rootFolderId, scope);
  if (!category) {
    throw new Error("Unknown category.");
  }

  const folderId = bootstrap.folders[categoryId];
  if (!folderId) {
    throw new Error("Category folder not found.");
  }

  const tasksName = detailTasksFileName(category.label);
  await deleteNamedFilesInFolder(folderId, [tasksName], scope);

  const normalized = tasks
    .map((task) => ({
      id: task.id,
      title: task.title.trim(),
      done: task.done,
      createdAt: task.createdAt,
    }))
    .filter((task) => task.title.length > 0);

  if (normalized.length > 0) {
    const buffer = Buffer.from(serializeUnit311DetailTasks(normalized), "utf8");
    await uploadFile(
      {
        file: toUploadFile(tasksName, buffer, "application/json"),
        folderId,
        categoryId: null,
      },
      scope,
    );
  }

  return {
    categoryId,
    label: category.label,
    folderId,
    tasksFileName: tasksName,
    taskCount: normalized.length,
  };
}

export async function getUnit311DetailsOverview(scope?: FilesWorkspaceScope) {
  const bootstrap = await ensureUnit311DetailsFolders(scope);
  const contents: Record<string, string> = {};
  const tasks: Record<string, Unit311DetailTask[]> = {};

  for (const category of bootstrap.categories) {
    if (isGoLiveStorageCategory(category.id)) {
      continue;
    }

    const folderId = bootstrap.folders[category.id];
    if (!folderId) {
      contents[category.id] = "";
      tasks[category.id] = [];
      continue;
    }

    const txtFile = await findFileInFolder(folderId, detailTxtFileName(category.label), scope);
    contents[category.id] = txtFile ? await readStorageText(txtFile.storage_path) : "";
    tasks[category.id] = await loadTasksFromFolder(folderId, category.label, scope);
  }

  return {
    rootFolderId: bootstrap.rootFolderId,
    folders: bootstrap.folders,
    categories: bootstrap.categories.filter(
      (category) => !isGoLiveStorageCategory(category.id),
    ),
    contents,
    tasks,
  };
}

export function parseUnit311DetailCategoryId(value: string | null): Unit311DetailCategoryId | null {
  if (!value?.trim()) return null;

  const trimmed = value.trim();
  if (getBuiltinDetailCategory(trimmed)) {
    return trimmed as Unit311DetailCategoryId;
  }

  if (trimmed.startsWith("custom-") && trimmed.length > "custom-".length) {
    return trimmed as Unit311DetailCategoryId;
  }

  return null;
}

export async function listUnit311DetailsRootEntries(scope?: FilesWorkspaceScope) {
  const { rootFolderId } = await ensureUnit311DetailsFolders(scope);
  return browseFolder({ folderId: rootFolderId }, scope);
}

import {
  type BrowseEntry,
  type BreadcrumbSegment,
  type FileFolder,
} from "@/lib/internal-files-data";
import { createFolder, requireFilesSupabase } from "@/lib/internal-files-service";
import {
  resolveFilesWorkspaceId,
  type FilesWorkspaceScope,
} from "@/lib/files-workspace";

const EXTERNAL_ROOT_NAME = "External Files";

type DbFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  category_id: string | null;
  external_scope: boolean;
  created_at: string;
  updated_at: string;
};

type DbFile = {
  id: string;
  name: string;
  folder_id: string | null;
  category_id: string | null;
  storage_path: string;
  mime_type: string | null;
  extension: string | null;
  size_bytes: number;
  created_at: string;
  updated_at: string;
};

function mapExternalFile(row: DbFile) {
  return {
    id: row.id,
    name: row.name,
    folderId: row.folder_id,
    categoryId: row.category_id,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    extension: row.extension,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExternalFolder(row: DbFolder): FileFolder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    categoryId: row.category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findExternalFolder(
  name: string,
  parentId: string | null,
  scope?: FilesWorkspaceScope,
) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  let query = supabase
    .from("file_folders")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("external_scope", true)
    .eq("name", name.trim());

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    if (error.message.includes("external_scope")) return null;
    throw new Error(error.message);
  }
  return data ? mapExternalFolder(data as DbFolder) : null;
}

export async function createExternalFolder(
  name: string,
  parentId: string | null,
  scope?: FilesWorkspaceScope,
) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_folders")
    .insert({
      name: name.trim(),
      parent_id: parentId,
      category_id: null,
      external_scope: true,
      workspace_id: workspaceId,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("external_scope")) {
      return createFolder(name, parentId, null, { workspaceId });
    }
    throw new Error(error.message);
  }

  return mapExternalFolder(data as DbFolder);
}

export async function getOrCreateExternalFilesRoot(
  scope?: FilesWorkspaceScope,
): Promise<FileFolder> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const existing = await findExternalFolder(EXTERNAL_ROOT_NAME, null, { workspaceId });
  if (existing) return existing;
  return createExternalFolder(EXTERNAL_ROOT_NAME, null, { workspaceId });
}

export async function ensureExternalClientFolder(
  organizationName: string,
  scope?: FilesWorkspaceScope,
): Promise<FileFolder> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const organization = organizationName.trim();
  if (!organization) {
    throw new Error("Organisation name is required for external folder creation.");
  }

  const root = await getOrCreateExternalFilesRoot({ workspaceId });
  const existing = await findExternalFolder(organization, root.id, { workspaceId });
  if (existing) return existing;
  return createExternalFolder(organization, root.id, { workspaceId });
}

async function buildExternalBreadcrumb(
  folderId: string | null,
  scope?: FilesWorkspaceScope,
): Promise<BreadcrumbSegment[]> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const segments: BreadcrumbSegment[] = [{ id: null, name: EXTERNAL_ROOT_NAME }];
  if (!folderId) return segments;

  const supabase = requireFilesSupabase();
  const chain: FileFolder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const { data, error } = await supabase
      .from("file_folders")
      .select("*")
      .eq("id", currentId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) break;
    const folder = mapExternalFolder(data as DbFolder);
    chain.unshift(folder);
    currentId = folder.parentId;
  }

  for (const folder of chain) {
    segments.push({ id: folder.id, name: folder.name });
  }

  return segments;
}

export async function browseExternalFilesFromDb(
  options: {
    folderId: string | null;
    query?: string;
  },
  scope?: FilesWorkspaceScope,
): Promise<{ entries: BrowseEntry[]; breadcrumb: BreadcrumbSegment[] }> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const root = await getOrCreateExternalFilesRoot({ workspaceId }).catch(() => null);
  const query = options.query?.trim().toLowerCase() ?? "";
  const activeFolderId = options.folderId ?? root?.id ?? null;

  let folderQuery = supabase
    .from("file_folders")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("external_scope", true)
    .order("name", { ascending: true });

  let fileQuery = supabase
    .from("file_objects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (query) {
    folderQuery = folderQuery.ilike("name", `%${query}%`);
    fileQuery = fileQuery.ilike("name", `%${query}%`);
  } else if (activeFolderId) {
    folderQuery = folderQuery.eq("parent_id", activeFolderId);
    fileQuery = fileQuery.eq("folder_id", activeFolderId);
  } else {
    folderQuery = folderQuery.is("parent_id", null);
    fileQuery = fileQuery.is("folder_id", null);
  }

  const [{ data: folders, error }, { data: files, error: fileError }] = await Promise.all([
    folderQuery,
    fileQuery,
  ]);

  if (error) {
    if (error.message.includes("external_scope")) {
      return { entries: [], breadcrumb: [{ id: null, name: EXTERNAL_ROOT_NAME }] };
    }
    throw new Error(error.message);
  }

  if (fileError) throw new Error(fileError.message);

  const entries: BrowseEntry[] = [
    ...(folders as DbFolder[])
      .map((folder) => ({ kind: "folder" as const, item: mapExternalFolder(folder) }))
      .filter((entry) => !query || entry.item.name.toLowerCase().includes(query)),
    ...(files as DbFile[])
      .map((file) => ({ kind: "file" as const, item: mapExternalFile(file) }))
      .filter((entry) => !query || entry.item.name.toLowerCase().includes(query)),
  ];

  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.item.name.localeCompare(b.item.name);
  });

  const breadcrumb =
    activeFolderId && activeFolderId !== root?.id
      ? await buildExternalBreadcrumb(activeFolderId, { workspaceId })
      : [{ id: root?.id ?? null, name: EXTERNAL_ROOT_NAME }];

  return { entries, breadcrumb };
}

import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  getFileExtension,
  INTERNAL_FILES_BUCKET,
  INTERNAL_FILES_MAX_BYTES,
  type BreadcrumbSegment,
  type BrowseEntry,
  type FileCategory,
  type FileFolder,
  type FileObject,
} from "@/lib/internal-files-data";
import {
  resolveFilesWorkspaceId,
  type FilesWorkspaceScope,
} from "@/lib/files-workspace";

type DbCategory = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

type DbFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  category_id: string | null;
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

function mapCategory(row: DbCategory): FileCategory {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

function mapFolder(row: DbFolder): FileFolder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    categoryId: row.category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFile(row: DbFile): FileObject {
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

export function requireFilesSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

export async function listCategories(scope?: FilesWorkspaceScope): Promise<FileCategory[]> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_categories")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DbCategory[]).map(mapCategory);
}

export async function createCategory(name: string, color: string, scope?: FilesWorkspaceScope) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_categories")
    .insert({ name: name.trim(), color, workspace_id: workspaceId })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCategory(data as DbCategory);
}

export async function updateCategory(
  id: string,
  name: string,
  color: string,
  scope?: FilesWorkspaceScope,
) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("file_categories")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Category not found.");

  const { data, error } = await supabase
    .from("file_categories")
    .update({ name: name.trim(), color })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCategory(data as DbCategory);
}

export async function deleteCategory(id: string, scope?: FilesWorkspaceScope) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("file_categories")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Category not found.");

  const { error } = await supabase
    .from("file_categories")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function getFolderById(
  id: string,
  scope?: FilesWorkspaceScope,
): Promise<FileFolder | null> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_folders")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapFolder(data as DbFolder) : null;
}

export async function buildBreadcrumb(
  folderId: string | null,
  scope?: FilesWorkspaceScope,
): Promise<BreadcrumbSegment[]> {
  const segments: BreadcrumbSegment[] = [{ id: null, name: "Internal Files" }];
  if (!folderId) return segments;

  const chain: FileFolder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = await getFolderById(currentId, scope);
    if (!folder) break;
    chain.unshift(folder);
    currentId = folder.parentId;
  }

  for (const folder of chain) {
    segments.push({ id: folder.id, name: folder.name });
  }

  return segments;
}

export async function browseFolder(
  options: {
    folderId?: string | null;
    query?: string;
    categoryId?: string | null;
  },
  scope?: FilesWorkspaceScope,
): Promise<{ entries: BrowseEntry[]; breadcrumb: BreadcrumbSegment[] }> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const folderId = options.folderId ?? null;
  const query = options.query?.trim() ?? "";
  const categoryId = options.categoryId ?? null;

  let folderQuery = supabase
    .from("file_folders")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });
  let fileQuery = supabase
    .from("file_objects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (query) {
    folderQuery = folderQuery.ilike("name", `%${query}%`);
    fileQuery = fileQuery.ilike("name", `%${query}%`);
  } else if (folderId === null) {
    folderQuery = folderQuery.is("parent_id", null);
    fileQuery = fileQuery.is("folder_id", null);
  } else {
    folderQuery = folderQuery.eq("parent_id", folderId);
    fileQuery = fileQuery.eq("folder_id", folderId);
  }

  if (categoryId) {
    folderQuery = folderQuery.eq("category_id", categoryId);
    fileQuery = fileQuery.eq("category_id", categoryId);
  }

  const [{ data: folders, error: folderError }, { data: files, error: fileError }] =
    await Promise.all([folderQuery, fileQuery]);

  if (folderError) throw new Error(folderError.message);
  if (fileError) throw new Error(fileError.message);

  const entries: BrowseEntry[] = [
    ...(folders as DbFolder[]).map((folder) => ({ kind: "folder" as const, item: mapFolder(folder) })),
    ...(files as DbFile[]).map((file) => ({ kind: "file" as const, item: mapFile(file) })),
  ];

  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.item.name.localeCompare(b.item.name);
  });

  const breadcrumb = await buildBreadcrumb(folderId, scope);
  return { entries, breadcrumb };
}

export async function createFolder(
  name: string,
  parentId: string | null,
  categoryId: string | null,
  scope?: FilesWorkspaceScope,
) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_folders")
    .insert({
      name: name.trim(),
      parent_id: parentId,
      category_id: categoryId,
      workspace_id: workspaceId,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapFolder(data as DbFolder);
}

export async function updateFolder(
  id: string,
  updates: { name?: string; parentId?: string | null; categoryId?: string | null },
  scope?: FilesWorkspaceScope,
) {
  if (updates.parentId === id) {
    throw new Error("A folder cannot be moved into itself.");
  }

  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();

  const existing = await getFolderById(id, { workspaceId });
  if (!existing) throw new Error("Folder not found.");

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.parentId !== undefined) payload.parent_id = updates.parentId;
  if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;

  const { data, error } = await supabase
    .from("file_folders")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapFolder(data as DbFolder);
}

async function deleteFolderRecursive(folderId: string, workspaceId: string) {
  const supabase = requireFilesSupabase();

  const { data: childFolders, error: childFolderError } = await supabase
    .from("file_folders")
    .select("id")
    .eq("parent_id", folderId)
    .eq("workspace_id", workspaceId);

  if (childFolderError) throw new Error(childFolderError.message);

  for (const child of childFolders ?? []) {
    await deleteFolderRecursive(child.id, workspaceId);
  }

  const { data: files, error: filesError } = await supabase
    .from("file_objects")
    .select("storage_path")
    .eq("folder_id", folderId)
    .eq("workspace_id", workspaceId);

  if (filesError) throw new Error(filesError.message);

  if (files && files.length > 0) {
    const paths = files.map((file) => file.storage_path as string);
    const { error: storageError } = await supabase.storage.from(INTERNAL_FILES_BUCKET).remove(paths);
    if (storageError) {
      const message = storageError.message.toLowerCase();
      const missingObject =
        message.includes("not found") ||
        message.includes("does not exist") ||
        message.includes("object not found");
      if (!missingObject) throw new Error(storageError.message);
    }
  }

  const { error: deleteFilesError } = await supabase
    .from("file_objects")
    .delete()
    .eq("folder_id", folderId)
    .eq("workspace_id", workspaceId);
  if (deleteFilesError) throw new Error(deleteFilesError.message);

  const { error: deleteFolderError } = await supabase
    .from("file_folders")
    .delete()
    .eq("id", folderId)
    .eq("workspace_id", workspaceId);
  if (deleteFolderError) throw new Error(deleteFolderError.message);
}

export async function deleteFolder(id: string, scope?: FilesWorkspaceScope) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const existing = await getFolderById(id, { workspaceId });
  if (!existing) throw new Error("Folder not found.");
  await deleteFolderRecursive(id, workspaceId);
}

function buildStoragePath(folderId: string | null, fileName: string) {
  const objectId = crypto.randomUUID();
  const extension = getFileExtension(fileName);
  const safeSuffix = extension ? `.${extension}` : "";
  return `objects/${folderId ?? "root"}/${objectId}${safeSuffix}`;
}

function assertUploadableFile(name: string, size: number) {
  if (!name.trim()) {
    throw new Error("File name is required.");
  }

  if (size <= 0) {
    throw new Error("File is empty.");
  }

  if (size > INTERNAL_FILES_MAX_BYTES) {
    throw new Error(
      `File is too large. Maximum size is ${Math.floor(INTERNAL_FILES_MAX_BYTES / (1024 * 1024))} MB.`,
    );
  }
}

export async function prepareFileUpload(
  options: {
    name: string;
    size: number;
    folderId: string | null;
  },
  scope?: FilesWorkspaceScope,
) {
  assertUploadableFile(options.name, options.size);

  const workspaceId = await resolveFilesWorkspaceId(scope);

  if (options.folderId) {
    const folder = await getFolderById(options.folderId, { workspaceId });
    if (!folder) throw new Error("Folder not found.");
  }

  const supabase = requireFilesSupabase();
  const storagePath = buildStoragePath(options.folderId, options.name);

  const { data, error } = await supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error) throw new Error(error.message);

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
  };
}

export async function completeFileUpload(
  options: {
    name: string;
    storagePath: string;
    folderId: string | null;
    categoryId: string | null;
    mimeType: string | null;
    size: number;
  },
  scope?: FilesWorkspaceScope,
) {
  assertUploadableFile(options.name, options.size);

  const workspaceId = await resolveFilesWorkspaceId(scope);

  if (options.folderId) {
    const folder = await getFolderById(options.folderId, { workspaceId });
    if (!folder) throw new Error("Folder not found.");
  }

  const supabase = requireFilesSupabase();
  const extension = getFileExtension(options.name);

  const { data, error } = await supabase
    .from("file_objects")
    .insert({
      name: options.name,
      folder_id: options.folderId,
      category_id: options.categoryId,
      storage_path: options.storagePath,
      mime_type: options.mimeType,
      extension: extension || null,
      size_bytes: options.size,
      workspace_id: workspaceId,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(INTERNAL_FILES_BUCKET).remove([options.storagePath]);
    throw new Error(error.message);
  }

  return mapFile(data as DbFile);
}

export async function uploadFile(
  options: {
    file: File;
    folderId: string | null;
    categoryId: string | null;
  },
  scope?: FilesWorkspaceScope,
) {
  assertUploadableFile(options.file.name, options.file.size);

  const workspaceId = await resolveFilesWorkspaceId(scope);

  if (options.folderId) {
    const folder = await getFolderById(options.folderId, { workspaceId });
    if (!folder) throw new Error("Folder not found.");
  }

  const supabase = requireFilesSupabase();
  const storagePath = buildStoragePath(options.folderId, options.file.name);

  const buffer = Buffer.from(await options.file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: options.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  return completeFileUpload(
    {
      name: options.file.name,
      storagePath,
      folderId: options.folderId,
      categoryId: options.categoryId,
      mimeType: options.file.type || null,
      size: options.file.size,
    },
    { workspaceId },
  );
}

export async function updateFile(
  id: string,
  updates: { name?: string; folderId?: string | null; categoryId?: string | null },
  scope?: FilesWorkspaceScope,
) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("file_objects")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("File not found.");

  if (updates.folderId) {
    const folder = await getFolderById(updates.folderId, { workspaceId });
    if (!folder) throw new Error("Folder not found.");
  }

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    payload.name = updates.name.trim();
    payload.extension = getFileExtension(updates.name) || null;
  }
  if (updates.folderId !== undefined) payload.folder_id = updates.folderId;
  if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;

  const { data, error } = await supabase
    .from("file_objects")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapFile(data as DbFile);
}

export async function deleteFile(id: string, scope?: FilesWorkspaceScope) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_objects")
    .select("storage_path")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (error) throw new Error(error.message);

  const { error: storageError } = await supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .remove([(data as DbFile).storage_path]);

  if (storageError) {
    // Still remove the database row if the storage object is already gone.
    const message = storageError.message.toLowerCase();
    const missingObject =
      message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("object not found");
    if (!missingObject) throw new Error(storageError.message);
  }

  const { error: deleteError } = await supabase
    .from("file_objects")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (deleteError) throw new Error(deleteError.message);
}

export async function getFileDownloadUrl(id: string, scope?: FilesWorkspaceScope) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_objects")
    .select("storage_path, name, mime_type")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (error) throw new Error(error.message);

  const file = data as DbFile;
  const { data: signed, error: signError } = await supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .createSignedUrl(file.storage_path, 3600);

  if (signError) throw new Error(signError.message);

  return {
    url: signed.signedUrl,
    name: file.name,
    mimeType: file.mime_type,
  };
}

export async function downloadFileBuffer(id: string, scope?: FilesWorkspaceScope) {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_objects")
    .select("storage_path, name, mime_type")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (error) throw new Error(error.message);

  const file = data as DbFile;
  const { data: blob, error: downloadError } = await supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .download(file.storage_path);

  if (downloadError) throw new Error(downloadError.message);

  const buffer = Buffer.from(await blob.arrayBuffer());
  return {
    buffer,
    name: file.name,
    mimeType: file.mime_type,
  };
}

export async function listAllFolders(scope?: FilesWorkspaceScope): Promise<FileFolder[]> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_folders")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data as DbFolder[]).map(mapFolder);
}

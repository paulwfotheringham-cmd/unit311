import type { FileFolder } from "@/lib/internal-files-data";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

async function listFolders(): Promise<FileFolder[]> {
  const response = await fetch("/api/files/folders", { cache: "no-store" });
  const data = await readApiJson<{ folders?: FileFolder[]; error?: string }>(response);
  if (!response.ok) throw new Error(data.error ?? "Failed to list folders");
  return data.folders ?? [];
}

async function createFolder(name: string, parentId: string | null): Promise<FileFolder> {
  const response = await fetch("/api/files/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId }),
  });
  const data = await readApiJson<{ folder?: FileFolder; error?: string }>(response);
  if (!response.ok || !data.folder) throw new Error(data.error ?? "Failed to create folder");
  return data.folder;
}

/** Ensure a nested folder path exists; returns the deepest folder id. */
export async function ensureFolderPath(segments: string[]): Promise<string | null> {
  if (segments.length === 0) return null;

  try {
    let folders = await listFolders();
    let parentId: string | null = null;

    for (const segment of segments) {
      const existing = folders.find(
        (folder) => folder.name === segment && folder.parentId === parentId,
      );
      if (existing) {
        parentId = existing.id;
        continue;
      }
      const created = await createFolder(segment, parentId);
      parentId = created.id;
      folders = [...folders, created];
    }

    return parentId;
  } catch {
    return null;
  }
}

export async function uploadFileBlob(options: {
  blob: Blob;
  filename: string;
  folderId: string | null;
  mimeType: string;
}): Promise<{ ok: boolean; fileObjectId?: string; error?: string }> {
  const file = new File([options.blob], options.filename, { type: options.mimeType });

  try {
    const prepareResponse = await fetch("/api/files/upload/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        folderId: options.folderId,
      }),
    });

    const prepareData = await readApiJson<{
      signedUrl?: string;
      storagePath?: string;
      error?: string;
    }>(prepareResponse);

    if (!prepareResponse.ok || !prepareData.signedUrl || !prepareData.storagePath) {
      throw new Error(prepareData.error ?? "Failed to prepare upload");
    }

    const uploadResponse = await fetch(prepareData.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": options.mimeType },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Storage upload failed (${uploadResponse.status})`);
    }

    const completeResponse = await fetch("/api/files/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        storagePath: prepareData.storagePath,
        folderId: options.folderId,
        categoryId: null,
        mimeType: options.mimeType,
        size: file.size,
      }),
    });

    const completeData = await readApiJson<{ file?: { id: string }; error?: string }>(
      completeResponse,
    );

    if (!completeResponse.ok) {
      throw new Error(completeData.error ?? "Failed to complete upload");
    }

    return { ok: true, fileObjectId: completeData.file?.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

export async function uploadPdfBlob(options: {
  blob: Blob;
  filename: string;
  folderId: string | null;
}): Promise<{ ok: boolean; fileObjectId?: string; error?: string }> {
  return uploadFileBlob({
    ...options,
    mimeType: "application/pdf",
  });
}

export async function saveFileToFolderPath(options: {
  blob: Blob;
  filename: string;
  folderSegments: string[];
  mimeType: string;
}) {
  const folderId = await ensureFolderPath(options.folderSegments);
  const upload = await uploadFileBlob({
    blob: options.blob,
    filename: options.filename,
    folderId,
    mimeType: options.mimeType,
  });
  return { folderId, ...upload };
}

export async function savePdfToFolderPath(options: {
  blob: Blob;
  filename: string;
  folderSegments: string[];
}) {
  const folderId = await ensureFolderPath(options.folderSegments);
  return uploadPdfBlob({
    blob: options.blob,
    filename: options.filename,
    folderId,
  });
}

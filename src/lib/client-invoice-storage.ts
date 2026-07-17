import { INTERNAL_FILES_BUCKET, getFileExtension } from "@/lib/internal-files-data";
import {
  completeFileUpload,
  createFolder,
  listAllFolders,
  requireFilesSupabase,
} from "@/lib/internal-files-service";

const CLIENT_INVOICES_ROOT = "Client Invoices";

export async function findFolderByName(name: string, parentId: string | null) {
  const folders = await listAllFolders();
  return (
    folders.find(
      (folder) =>
        folder.name.toLowerCase() === name.toLowerCase() && folder.parentId === parentId,
    ) ?? null
  );
}

export async function ensureFolderPath(segments: string[]) {
  let parentId: string | null = null;

  for (const segment of segments) {
    const existing = await findFolderByName(segment, parentId);
    if (existing) {
      parentId = existing.id;
      continue;
    }
    const created = await createFolder(segment, parentId, null);
    parentId = created.id;
  }

  if (!parentId) {
    throw new Error("Failed to resolve invoice folder.");
  }

  return parentId;
}

export async function saveInvoicePdfToClientFolder(options: {
  companyName: string;
  fileName: string;
  pdfBytes: Uint8Array;
}) {
  const folderId = await ensureFolderPath([CLIENT_INVOICES_ROOT, options.companyName.trim()]);
  const supabase = requireFilesSupabase();
  const extension = getFileExtension(options.fileName);
  const storagePath = `objects/${folderId}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

  const { error: uploadError } = await supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .upload(storagePath, Buffer.from(options.pdfBytes), {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const file = await completeFileUpload({
    name: options.fileName,
    storagePath,
    folderId,
    categoryId: null,
    mimeType: "application/pdf",
    size: options.pdfBytes.byteLength,
  });

  return { file, folderId, storagePath };
}

export async function saveTransferReceipt(options: {
  companyName: string;
  file: File;
}) {
  const folderId = await ensureFolderPath([
    CLIENT_INVOICES_ROOT,
    options.companyName.trim(),
    "Transfer receipts",
  ]);

  const supabase = requireFilesSupabase();
  const extension = getFileExtension(options.file.name);
  const storagePath = `objects/${folderId}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;
  const buffer = Buffer.from(await options.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: options.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  return completeFileUpload({
    name: options.file.name,
    storagePath,
    folderId,
    categoryId: null,
    mimeType: options.file.type || null,
    size: options.file.size,
  });
}


import sharp from "sharp";

import {
  createWorkspaceArchitectureDiagramArtifacts,
  WORKSPACE_ARCHITECTURE_DIAGRAM_BASENAME,
  WORKSPACE_ARCHITECTURE_LINK_FILE,
  type WorkspaceArchitectureLink,
} from "@/lib/workspace-architecture-diagram";
import {
  detailTxtFileName,
  UNIT311_DETAILS_ROOT_FOLDER_NAME,
} from "@/lib/unit311-details-data";
import {
  createFolder,
  deleteFile,
  downloadFileBuffer,
  getFileDownloadUrl,
  requireFilesSupabase,
  uploadFile,
} from "@/lib/internal-files-service";
import { INTERNAL_FILES_BUCKET, type FileFolder } from "@/lib/internal-files-data";
import { ensureUnit311DetailsFolders } from "@/lib/unit311-details-service";

const SUPABASE_SECTION_FOLDER = "Supabase";
const DIAGRAM_NAME_RE = new RegExp(
  `^${WORKSPACE_ARCHITECTURE_DIAGRAM_BASENAME}-(\\d{8}T\\d{6}Z)\\.(svg|png)$`,
  "i",
);

type DbFile = {
  id: string;
  name: string;
  storage_path: string;
  created_at: string;
  mime_type: string | null;
};

function toUploadFile(name: string, buffer: Buffer, mimeType: string) {
  const bytes = Uint8Array.from(buffer);
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], name, { type: mimeType });
}

async function findFolderByName(
  name: string,
  parentId: string | null,
): Promise<FileFolder | null> {
  const supabase = requireFilesSupabase();
  let query = supabase.from("file_folders").select("*").eq("name", name).limit(1);

  if (parentId === null) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    parentId: data.parent_id as string | null,
    categoryId: data.category_id as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

async function ensureSupabaseDetailsFolder(): Promise<{ rootFolderId: string; folderId: string }> {
  const bootstrap = await ensureUnit311DetailsFolders();
  const existingId = bootstrap.folders.supabase;
  if (existingId) {
    return { rootFolderId: bootstrap.rootFolderId, folderId: existingId };
  }

  const root =
    (await findFolderByName(UNIT311_DETAILS_ROOT_FOLDER_NAME, null)) ??
    (await createFolder(UNIT311_DETAILS_ROOT_FOLDER_NAME, null, null));
  const folder =
    (await findFolderByName(SUPABASE_SECTION_FOLDER, root.id)) ??
    (await createFolder(SUPABASE_SECTION_FOLDER, root.id, null));

  return { rootFolderId: root.id, folderId: folder.id };
}

async function listFilesInFolder(folderId: string): Promise<DbFile[]> {
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_objects")
    .select("id, name, storage_path, created_at, mime_type")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbFile[];
}

async function findFileByName(folderId: string, name: string): Promise<DbFile | null> {
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_objects")
    .select("id, name, storage_path, created_at, mime_type")
    .eq("folder_id", folderId)
    .eq("name", name)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data as DbFile) : null;
}

function parseLinkJson(raw: string): WorkspaceArchitectureLink | null {
  try {
    const parsed = JSON.parse(raw) as WorkspaceArchitectureLink;
    if (
      typeof parsed?.svgFileName === "string" &&
      typeof parsed?.pngFileName === "string" &&
      typeof parsed?.version === "string"
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function pickLatestDiagramPair(files: DbFile[]) {
  const versions = new Map<string, { svg?: DbFile; png?: DbFile }>();

  for (const file of files) {
    const match = file.name.match(DIAGRAM_NAME_RE);
    if (!match) continue;
    const version = match[1];
    const ext = match[2].toLowerCase();
    const entry = versions.get(version) ?? {};
    if (ext === "svg") entry.svg = file;
    if (ext === "png") entry.png = file;
    versions.set(version, entry);
  }

  const sorted = [...versions.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  for (const [version, pair] of sorted) {
    if (pair.svg) {
      return { version, svg: pair.svg, png: pair.png ?? null };
    }
  }
  return null;
}

async function readStorageText(storagePath: string): Promise<string> {
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase.storage.from(INTERNAL_FILES_BUCKET).download(storagePath);
  if (error || !data) return "";
  return data.text();
}

async function ensureLinkedInSupabaseDetails(folderId: string, link: WorkspaceArchitectureLink) {
  const txtName = detailTxtFileName("Supabase");
  const existing = await findFileByName(folderId, txtName);
  const current = existing ? await readStorageText(existing.storage_path) : "";

  const marker = "Workspace Architecture Diagram";
  const linkBlock = [
    "",
    "---",
    marker,
    `Source of truth: ${link.sourceDocument}`,
    `Latest version: ${link.version}`,
    `SVG: ${link.svgFileName}`,
    `PNG: ${link.pngFileName}`,
    `Generated at: ${link.generatedAt}`,
    "Open via Unit311 Details → Supabase → View Architecture Diagram.",
  ].join("\n");

  let nextContent: string;
  if (current.includes(marker)) {
    nextContent = current.replace(
      /\n---\nWorkspace Architecture Diagram[\s\S]*?(?=\n---\n|$)/,
      linkBlock,
    );
    if (!nextContent.includes(marker)) {
      nextContent = `${current.trimEnd()}\n${linkBlock}\n`;
    }
  } else if (current.trim()) {
    nextContent = `${current.trimEnd()}\n${linkBlock}\n`;
  } else {
    nextContent = [
      "Unit311 Central — Supabase",
      "",
      "Production project: kkxtvzxqmbacjatkiupq (Unit311 Central).",
      "Workspace architecture technical specification: docs/WORKSPACE_ARCHITECTURE.md",
      linkBlock,
      "",
    ].join("\n");
  }

  if (existing) {
    await deleteFile(existing.id);
  }

  await uploadFile({
    file: toUploadFile(txtName, Buffer.from(nextContent, "utf8"), "text/plain"),
    folderId,
    categoryId: null,
  });

  // Keep a lightweight pointer file for latest resolution.
  const linkFile = await findFileByName(folderId, WORKSPACE_ARCHITECTURE_LINK_FILE);
  if (linkFile) {
    await deleteFile(linkFile.id);
  }
  await uploadFile({
    file: toUploadFile(
      WORKSPACE_ARCHITECTURE_LINK_FILE,
      Buffer.from(JSON.stringify(link, null, 2), "utf8"),
      "application/json",
    ),
    folderId,
    categoryId: null,
  });
}

export async function regenerateWorkspaceArchitectureDiagram() {
  const { folderId } = await ensureSupabaseDetailsFolder();
  const artifacts = createWorkspaceArchitectureDiagramArtifacts();
  const pngBuffer = await sharp(Buffer.from(artifacts.svg, "utf8"), { density: 160 })
    .png()
    .toBuffer();

  const svgUploaded = await uploadFile({
    file: toUploadFile(artifacts.svgFileName, Buffer.from(artifacts.svg, "utf8"), "image/svg+xml"),
    folderId,
    categoryId: null,
  });

  const pngUploaded = await uploadFile({
    file: toUploadFile(artifacts.pngFileName, pngBuffer, "image/png"),
    folderId,
    categoryId: null,
  });

  await ensureLinkedInSupabaseDetails(folderId, artifacts.link);

  return {
    folderId,
    link: artifacts.link,
    svgFileId: svgUploaded.id,
    pngFileId: pngUploaded.id,
    svg: artifacts.svg,
  };
}

export async function resolveLatestWorkspaceArchitectureDiagram(options?: {
  regenerateIfMissing?: boolean;
}) {
  const regenerateIfMissing = options?.regenerateIfMissing ?? true;
  const { folderId } = await ensureSupabaseDetailsFolder();
  const files = await listFilesInFolder(folderId);

  const linkFile = files.find((file) => file.name === WORKSPACE_ARCHITECTURE_LINK_FILE);
  let link: WorkspaceArchitectureLink | null = null;
  if (linkFile) {
    link = parseLinkJson(await readStorageText(linkFile.storage_path));
  }

  let svgFile: DbFile | null = null;
  let pngFile: DbFile | null = null;

  if (link) {
    svgFile = files.find((file) => file.name === link!.svgFileName) ?? null;
    pngFile = files.find((file) => file.name === link!.pngFileName) ?? null;
  }

  if (!svgFile) {
    const latest = pickLatestDiagramPair(files);
    if (latest) {
      svgFile = latest.svg;
      pngFile = latest.png;
      link = {
        sourceDocument: "docs/WORKSPACE_ARCHITECTURE.md",
        sourceDocumentMtimeMs: 0,
        version: latest.version,
        generatedAt: latest.svg.created_at,
        svgFileName: latest.svg.name,
        pngFileName: latest.png?.name ?? latest.svg.name.replace(/\.svg$/i, ".png"),
      };
    }
  }

  if (!svgFile) {
    if (!regenerateIfMissing) {
      return null;
    }
    const regenerated = await regenerateWorkspaceArchitectureDiagram();
    const svgDownload = await getFileDownloadUrl(regenerated.svgFileId);
    const pngDownload = regenerated.pngFileId
      ? await getFileDownloadUrl(regenerated.pngFileId)
      : null;

    return {
      folderId: regenerated.folderId,
      link: regenerated.link,
      svg: regenerated.svg,
      svgFileId: regenerated.svgFileId,
      pngFileId: regenerated.pngFileId,
      svgDownloadUrl: svgDownload.url,
      pngDownloadUrl: pngDownload?.url ?? null,
      regenerated: true,
    };
  }

  const resolvedLink: WorkspaceArchitectureLink =
    link ??
    ({
      sourceDocument: "docs/WORKSPACE_ARCHITECTURE.md",
      sourceDocumentMtimeMs: 0,
      version: svgFile.name.replace(/^workspace-architecture-|\.svg$/gi, ""),
      generatedAt: svgFile.created_at,
      svgFileName: svgFile.name,
      pngFileName: pngFile?.name ?? svgFile.name.replace(/\.svg$/i, ".png"),
    } satisfies WorkspaceArchitectureLink);

  const svgPayload = await downloadFileBuffer(svgFile.id);
  const svg = svgPayload.buffer.toString("utf8");
  const svgDownload = await getFileDownloadUrl(svgFile.id);
  const pngDownload = pngFile ? await getFileDownloadUrl(pngFile.id) : null;

  return {
    folderId,
    link: resolvedLink,
    svg,
    svgFileId: svgFile.id,
    pngFileId: pngFile?.id ?? null,
    svgDownloadUrl: svgDownload.url,
    pngDownloadUrl: pngDownload?.url ?? null,
    regenerated: false,
  };
}

export function isSupabaseDetailsCategory(categoryId: string | null | undefined) {
  return categoryId === "supabase";
}

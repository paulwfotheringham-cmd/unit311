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
import {
  resolveFilesWorkspaceId,
  type FilesWorkspaceScope,
} from "@/lib/files-workspace";

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
  scope?: FilesWorkspaceScope,
): Promise<FileFolder | null> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  let query = supabase
    .from("file_folders")
    .select("*")
    .eq("name", name)
    .eq("workspace_id", workspaceId)
    .limit(1);

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

async function ensureSupabaseDetailsFolder(
  scope?: FilesWorkspaceScope,
): Promise<{ rootFolderId: string; folderId: string }> {
  const bootstrap = await ensureUnit311DetailsFolders(scope);
  const existingId = bootstrap.folders.supabase;
  if (existingId) {
    return { rootFolderId: bootstrap.rootFolderId, folderId: existingId };
  }

  const root =
    (await findFolderByName(UNIT311_DETAILS_ROOT_FOLDER_NAME, null, scope)) ??
    (await createFolder(UNIT311_DETAILS_ROOT_FOLDER_NAME, null, null, scope));
  const folder =
    (await findFolderByName(SUPABASE_SECTION_FOLDER, root.id, scope)) ??
    (await createFolder(SUPABASE_SECTION_FOLDER, root.id, null, scope));

  return { rootFolderId: root.id, folderId: folder.id };
}

async function listFilesInFolder(
  folderId: string,
  scope?: FilesWorkspaceScope,
): Promise<DbFile[]> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_objects")
    .select("id, name, storage_path, created_at, mime_type")
    .eq("folder_id", folderId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbFile[];
}

async function findFileByName(
  folderId: string,
  name: string,
  scope?: FilesWorkspaceScope,
): Promise<DbFile | null> {
  const workspaceId = await resolveFilesWorkspaceId(scope);
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_objects")
    .select("id, name, storage_path, created_at, mime_type")
    .eq("folder_id", folderId)
    .eq("name", name)
    .eq("workspace_id", workspaceId)
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

async function ensureLinkedInSupabaseDetails(
  folderId: string,
  link: WorkspaceArchitectureLink,
  scope?: FilesWorkspaceScope,
) {
  const txtName = detailTxtFileName("Supabase");
  const existing = await findFileByName(folderId, txtName, scope);
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
    await deleteFile(existing.id, scope);
  }

  await uploadFile(
    {
      file: toUploadFile(txtName, Buffer.from(nextContent, "utf8"), "text/plain"),
      folderId,
      categoryId: null,
    },
    scope,
  );

  const linkFile = await findFileByName(folderId, WORKSPACE_ARCHITECTURE_LINK_FILE, scope);
  if (linkFile) {
    await deleteFile(linkFile.id, scope);
  }
  await uploadFile(
    {
      file: toUploadFile(
        WORKSPACE_ARCHITECTURE_LINK_FILE,
        Buffer.from(JSON.stringify(link, null, 2), "utf8"),
        "application/json",
      ),
      folderId,
      categoryId: null,
    },
    scope,
  );
}

export async function regenerateWorkspaceArchitectureDiagram(scope?: FilesWorkspaceScope) {
  const { folderId } = await ensureSupabaseDetailsFolder(scope);
  const artifacts = createWorkspaceArchitectureDiagramArtifacts();
  const pngBuffer = await sharp(Buffer.from(artifacts.svg, "utf8"), { density: 160 })
    .png()
    .toBuffer();

  const svgUploaded = await uploadFile(
    {
      file: toUploadFile(artifacts.svgFileName, Buffer.from(artifacts.svg, "utf8"), "image/svg+xml"),
      folderId,
      categoryId: null,
    },
    scope,
  );

  const pngUploaded = await uploadFile(
    {
      file: toUploadFile(artifacts.pngFileName, pngBuffer, "image/png"),
      folderId,
      categoryId: null,
    },
    scope,
  );

  await ensureLinkedInSupabaseDetails(folderId, artifacts.link, scope);

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
  workspaceId?: string;
}) {
  const scope: FilesWorkspaceScope | undefined = options?.workspaceId
    ? { workspaceId: options.workspaceId }
    : undefined;
  const regenerateIfMissing = options?.regenerateIfMissing ?? true;
  const { folderId } = await ensureSupabaseDetailsFolder(scope);
  const files = await listFilesInFolder(folderId, scope);

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
    const regenerated = await regenerateWorkspaceArchitectureDiagram(scope);
    const svgDownload = await getFileDownloadUrl(regenerated.svgFileId, scope);
    const pngDownload = regenerated.pngFileId
      ? await getFileDownloadUrl(regenerated.pngFileId, scope)
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

  const svgPayload = await downloadFileBuffer(svgFile.id, scope);
  const svg = svgPayload.buffer.toString("utf8");
  const svgDownload = await getFileDownloadUrl(svgFile.id, scope);
  const pngDownload = pngFile ? await getFileDownloadUrl(pngFile.id, scope) : null;

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

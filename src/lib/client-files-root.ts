import type { ManagedClient } from "@/lib/client-management-data";
import type { BreadcrumbSegment } from "@/lib/internal-files-data";
import {
  buildBreadcrumb,
  browseFolder,
  createFolder,
  getFolderById,
  getFileById,
} from "@/lib/internal-files-service";
import {
  getInternalClient,
  updateInternalClient,
  type ClientsWorkspaceScope,
} from "@/lib/internal-clients-service";

export class ClientFilesError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ClientFilesError";
    this.status = status;
  }
}

export type ClientFilesRootContext = {
  client: ManagedClient;
  rootFolderId: string;
  rootFolderName: string;
};

function filesScope(workspaceId: string) {
  return { workspaceId };
}

/**
 * Walk ancestors; true when folderId is the root or a descendant.
 */
export async function isFolderUnderClientRoot(
  folderId: string,
  rootFolderId: string,
  workspaceId: string,
): Promise<boolean> {
  if (folderId === rootFolderId) return true;

  let currentId: string | null = folderId;
  const seen = new Set<string>();

  while (currentId) {
    if (currentId === rootFolderId) return true;
    if (seen.has(currentId)) return false;
    seen.add(currentId);

    const folder = await getFolderById(currentId, filesScope(workspaceId));
    if (!folder) return false;
    currentId = folder.parentId;
  }

  return false;
}

export async function assertFolderInClientSubtree(
  folderId: string | null | undefined,
  rootFolderId: string,
  workspaceId: string,
  options?: { allowNull?: boolean },
): Promise<string> {
  if (!folderId?.trim()) {
    if (options?.allowNull) return rootFolderId;
    throw new ClientFilesError("Folder is required within the client file workspace.");
  }

  const trimmed = folderId.trim();
  const ok = await isFolderUnderClientRoot(trimmed, rootFolderId, workspaceId);
  if (!ok) {
    throw new ClientFilesError("Folder is outside this client's file workspace.", 403);
  }
  return trimmed;
}

export async function assertFileInClientSubtree(
  fileId: string,
  rootFolderId: string,
  workspaceId: string,
): Promise<void> {
  const file = await getFileById(fileId, filesScope(workspaceId));
  if (!file) throw new ClientFilesError("File not found.", 404);
  if (!file.folderId) {
    throw new ClientFilesError("File is outside this client's file workspace.", 403);
  }
  await assertFolderInClientSubtree(file.folderId, rootFolderId, workspaceId);
}

/**
 * Ensure Client Directory owns a valid Files root folder. Creates or repairs as needed.
 * Throws on failure (not best-effort).
 */
export async function ensureClientFilesRootFolder(
  client: ManagedClient,
  scope?: ClientsWorkspaceScope,
): Promise<ManagedClient> {
  const workspaceId = scope?.workspaceId;
  if (!workspaceId) {
    throw new ClientFilesError("Workspace is required to ensure client files root.", 400);
  }

  const linkedId = client.filesFolderId?.trim() || null;
  if (linkedId) {
    const existing = await getFolderById(linkedId, filesScope(workspaceId));
    if (existing) {
      if (client.filesFolderName !== existing.name) {
        return updateInternalClient(
          client.id,
          { filesFolderName: existing.name },
          scope,
        );
      }
      return client;
    }
  }

  const folderName = client.companyName.trim() || "Client folder";
  const folder = await createFolder(folderName, null, null, filesScope(workspaceId));

  return updateInternalClient(
    client.id,
    {
      filesFolderId: folder.id,
      filesFolderName: folder.name,
    },
    scope,
  );
}

export async function resolveClientFilesRoot(
  clientId: string,
  workspaceId: string,
): Promise<ClientFilesRootContext> {
  const client = await getInternalClient(clientId, { workspaceId });
  if (!client) {
    throw new ClientFilesError("Client not found in Client Directory.", 404);
  }

  const ensured = await ensureClientFilesRootFolder(client, { workspaceId });
  const rootFolderId = ensured.filesFolderId?.trim();
  if (!rootFolderId) {
    throw new ClientFilesError("Failed to provision client files root folder.", 500);
  }

  return {
    client: ensured,
    rootFolderId,
    rootFolderName: ensured.filesFolderName?.trim() || ensured.companyName,
  };
}

export async function buildClientFilesBreadcrumb(
  folderId: string,
  rootFolderId: string,
  rootLabel: string,
  workspaceId: string,
): Promise<BreadcrumbSegment[]> {
  const full = await buildBreadcrumb(folderId, filesScope(workspaceId));
  const rootIndex = full.findIndex((segment) => segment.id === rootFolderId);
  if (rootIndex < 0) {
    return [{ id: rootFolderId, name: rootLabel }];
  }

  const clipped = full.slice(rootIndex).map((segment, index) =>
    index === 0 ? { id: rootFolderId, name: rootLabel } : segment,
  );
  return clipped.length > 0 ? clipped : [{ id: rootFolderId, name: rootLabel }];
}

export async function browseClientFiles(options: {
  clientId: string;
  folderId?: string | null;
  query?: string;
  categoryId?: string | null;
  workspaceId: string;
}) {
  const root = await resolveClientFilesRoot(options.clientId, options.workspaceId);
  const folderId = await assertFolderInClientSubtree(
    options.folderId,
    root.rootFolderId,
    options.workspaceId,
    { allowNull: true },
  );

  const result = await browseFolder(
    {
      folderId,
      query: options.query,
      categoryId: options.categoryId,
    },
    filesScope(options.workspaceId),
  );

  const breadcrumb = await buildClientFilesBreadcrumb(
    folderId,
    root.rootFolderId,
    root.rootFolderName,
    options.workspaceId,
  );

  return {
    ...result,
    breadcrumb,
    client: root.client,
    rootFolderId: root.rootFolderId,
  };
}

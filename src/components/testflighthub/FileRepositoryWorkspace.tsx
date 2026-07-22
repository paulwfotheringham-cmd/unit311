"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import {
  fileTypeLabel,
  formatFileDate,
  formatFileSize,
  type BreadcrumbSegment,
  type BrowseEntry,
  type FileCategory,
  type FileFolder,
} from "@/lib/internal-files-data";
import { browseExternalFiles } from "@/lib/external-files-mock-data";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Presentation,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

function isFolderDescendant(
  candidateId: string,
  ancestorId: string,
  folders: FileFolder[],
): boolean {
  if (candidateId === ancestorId) return true;

  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  let current = byId.get(candidateId);

  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = byId.get(current.parentId);
  }

  return false;
}

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    throw new Error(`Request failed (${response.status})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const message = text.replace(/\s+/g, " ").trim();
    throw new Error(
      response.ok
        ? "Server returned an invalid response."
        : message.length > 180
          ? `${message.slice(0, 180)}...`
          : message,
    );
  }
}

function resolveActiveFolderId(
  scope: FileRepositoryScope,
  folderId: string | null,
  breadcrumb: BreadcrumbSegment[],
  clientRootFolderId?: string | null,
) {
  if (scope === "client") {
    return folderId ?? clientRootFolderId ?? breadcrumb[0]?.id ?? null;
  }
  if (scope === "external" && !folderId) {
    return breadcrumb[0]?.id ?? null;
  }

  return folderId;
}

function entryIcon(entry: BrowseEntry) {
  if (entry.kind === "folder") return Folder;
  const ext = entry.item.extension?.toLowerCase() ?? "";
  if (["doc", "docx", "txt", "pdf"].includes(ext)) return FileText;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["ppt", "pptx"].includes(ext)) return Presentation;
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return ImageIcon;
  return File;
}

export type FileRepositoryScope = "internal" | "external" | "client";

type FileRepositoryWorkspaceProps = {
  scope?: FileRepositoryScope;
  clientId?: string;
  clientName?: string;
  initialFolderId?: string | null;
  rootLabel?: string;
};

function defaultRootLabel(scope: FileRepositoryScope, rootLabel?: string) {
  if (rootLabel?.trim()) return rootLabel.trim();
  if (scope === "external") return "External Files";
  if (scope === "client") return "Client Files";
  return "Internal Files";
}

export default function FileRepositoryWorkspace({
  scope = "internal",
  clientId,
  clientName,
  initialFolderId = null,
  rootLabel,
}: FileRepositoryWorkspaceProps = {}) {
  const usesApi = scope !== "external";
  const usesExternalApi = scope === "external";
  const canMutate = usesApi || usesExternalApi;
  const resolvedRootLabel = defaultRootLabel(scope, rootLabel ?? clientName);
  const clientRootFolderId = scope === "client" ? initialFolderId : null;
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState<string | null>(
    scope === "client" ? initialFolderId : initialFolderId,
  );
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<FileCategory[]>([]);
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbSegment[]>([
    {
      id: scope === "client" ? initialFolderId : null,
      name: resolvedRootLabel,
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<"folder" | "file" | null>(null);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [movePickerFolderId, setMovePickerFolderId] = useState<string | null>(null);
  const [movePickerBreadcrumb, setMovePickerBreadcrumb] = useState<BreadcrumbSegment[]>([
    {
      id: scope === "client" ? initialFolderId : null,
      name: resolvedRootLabel,
    },
  ]);
  const [movePickerFolders, setMovePickerFolders] = useState<FileFolder[]>([]);
  const [movePickerAllFolders, setMovePickerAllFolders] = useState<FileFolder[]>([]);
  const [movePickerLoading, setMovePickerLoading] = useState(false);
  const [movePickerError, setMovePickerError] = useState<string | null>(null);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const visibleEntries = useMemo(() => {
    if (typeFilter === "all" || categoryFilter != null) return entries;
    return entries.filter((entry) => {
      if (entry.kind === "folder") return true;
      const label = fileTypeLabel(entry.item.extension ?? null, entry.item.mimeType ?? null).toLowerCase();
      const ext = (entry.item.extension ?? "").toLowerCase();
      const mime = (entry.item.mimeType ?? "").toLowerCase();
      switch (typeFilter) {
        case "documents":
          return label === "word" || label === "text" || ["doc", "docx", "txt", "rtf", "md"].includes(ext);
        case "pdfs":
          return label === "pdf" || ext === "pdf" || mime.includes("pdf");
        case "images":
          return label === "image" || mime.startsWith("image/");
        case "presentations":
          return label === "powerpoint" || ["ppt", "pptx"].includes(ext);
        case "spreadsheets":
          return label === "excel" || ["xls", "xlsx", "csv"].includes(ext);
        case "archives":
          return label === "archive" || ["zip", "rar", "7z"].includes(ext);
        default:
          return true;
      }
    });
  }, [categoryFilter, entries, typeFilter]);

  const loadCategories = useCallback(async () => {
    if (!usesApi) {
      setCategories([]);
      return;
    }

    const response = await fetch("/api/files/categories");
    const data = (await response.json()) as { categories?: FileCategory[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Failed to load categories");
    setCategories(data.categories ?? []);
  }, [usesApi]);

  const loadBrowse = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (usesExternalApi) {
        const params = new URLSearchParams();
        if (folderId) params.set("folderId", folderId);
        if (query) params.set("q", query);
        const response = await fetch(`/api/files/external/browse?${params.toString()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          entries?: BrowseEntry[];
          breadcrumb?: BreadcrumbSegment[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Failed to load external files");
        setEntries(data.entries ?? []);
        setBreadcrumb(data.breadcrumb ?? [{ id: null, name: resolvedRootLabel }]);
        return;
      }

      if (!usesApi) {
        const data = browseExternalFiles({ folderId, query });
        setEntries(data.entries);
        setBreadcrumb(data.breadcrumb);
        return;
      }

      const params = new URLSearchParams();
      if (folderId) params.set("folderId", folderId);
      if (query) params.set("q", query);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (scope === "client" && clientId) params.set("clientId", clientId);

      const response = await fetch(`/api/files/browse?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as {
        entries?: BrowseEntry[];
        breadcrumb?: BreadcrumbSegment[];
        error?: string;
      };

      if (!response.ok) throw new Error(data.error ?? "Failed to load files");

      const nextBreadcrumb =
        data.breadcrumb ??
        [{ id: scope === "client" ? folderId : null, name: resolvedRootLabel }];

      setEntries(data.entries ?? []);
      setBreadcrumb(nextBreadcrumb);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load files");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, clientId, folderId, query, resolvedRootLabel, scope, usesApi, usesExternalApi]);

  useEffect(() => {
    startTransition(() => {
      setFolderId(initialFolderId);
    });
  }, [initialFolderId]);

  useEffect(() => {
    startTransition(() => {
      void loadCategories().catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load categories");
      });
    });
  }, [loadCategories]);

  useEffect(() => {
    startTransition(() => {
      void loadBrowse();
    });
  }, [loadBrowse]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function refreshAll() {
    await Promise.all([loadCategories(), loadBrowse()]);
  }

  async function handleCreateFolder() {
    const name = window.prompt("New folder name");
    if (!name?.trim()) return;

    if (!canMutate) return;

    setBusy(true);
    try {
      const targetFolderId = resolveActiveFolderId(
        scope,
        folderId,
        breadcrumb,
        clientRootFolderId,
      );
      const response = await fetch("/api/files/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentId: targetFolderId,
          categoryId: categoryFilter,
          externalScope: scope === "external",
          clientId: scope === "client" ? clientId : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to create folder");
      await refreshAll();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to create folder");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;

    if (!canMutate) return;

    setBusy(true);
    setError(null);

    const targetFolderId = resolveActiveFolderId(
      scope,
      folderId,
      breadcrumb,
      clientRootFolderId,
    );

    try {
      for (const file of Array.from(files)) {
        const prepareResponse = await fetch("/api/files/upload/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            folderId: targetFolderId,
            clientId: scope === "client" ? clientId : undefined,
          }),
        });

        const prepareData = await readApiJson<{
          signedUrl?: string;
          storagePath?: string;
          error?: string;
        }>(prepareResponse);

        if (!prepareResponse.ok || !prepareData.signedUrl || !prepareData.storagePath) {
          throw new Error(prepareData.error ?? `Failed to prepare upload for ${file.name}`);
        }

        const uploadResponse = await fetch(prepareData.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name} to storage (${uploadResponse.status}).`);
        }

        const completeResponse = await fetch("/api/files/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            storagePath: prepareData.storagePath,
            folderId: targetFolderId,
            categoryId: categoryFilter,
            mimeType: file.type || null,
            size: file.size,
            clientId: scope === "client" ? clientId : undefined,
          }),
        });

        const completeData = await readApiJson<{ error?: string }>(completeResponse);
        if (!completeResponse.ok) {
          throw new Error(completeData.error ?? `Failed to finalize upload for ${file.name}`);
        }
      }

      await refreshAll();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to upload files");
    } finally {
      setBusy(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  }

  async function handleRename() {
    if (!selectedId || !selectedKind) return;
    const current = entries.find(
      (entry) => entry.item.id === selectedId && entry.kind === selectedKind,
    );
    if (!current) return;

    const name = window.prompt("Rename item", current.item.name);
    if (!name?.trim() || name === current.item.name) return;

    setBusy(true);
    try {
      const endpoint =
        selectedKind === "folder"
          ? `/api/files/folders/${selectedId}`
          : `/api/files/objects/${selectedId}`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          clientId: scope === "client" ? clientId : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to rename item");
      await refreshAll();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to rename item");
    } finally {
      setBusy(false);
    }
  }

  async function loadMovePicker(folderId: string | null) {
    setMovePickerLoading(true);
    setMovePickerError(null);

    try {
      const params = new URLSearchParams();
      if (folderId) params.set("folderId", folderId);
      if (scope === "client" && clientId) params.set("clientId", clientId);

      const foldersUrl =
        scope === "client" && clientId
          ? `/api/files/folders?clientId=${encodeURIComponent(clientId)}`
          : "/api/files/folders";

      const [browseResponse, foldersResponse] = await Promise.all([
        fetch(`/api/files/browse?${params.toString()}`, { cache: "no-store" }),
        movePickerAllFolders.length > 0
          ? Promise.resolve(null)
          : fetch(foldersUrl, { cache: "no-store" }),
      ]);

      const browseData = (await browseResponse.json()) as {
        entries?: BrowseEntry[];
        breadcrumb?: BreadcrumbSegment[];
        error?: string;
      };

      if (!browseResponse.ok) {
        throw new Error(browseData.error ?? "Failed to load folders");
      }

      if (foldersResponse) {
        const foldersData = (await foldersResponse.json()) as {
          folders?: FileFolder[];
          error?: string;
        };
        if (!foldersResponse.ok) {
          throw new Error(foldersData.error ?? "Failed to load folders");
        }
        setMovePickerAllFolders(foldersData.folders ?? []);
      }

      setMovePickerFolderId(folderId);
      setMovePickerBreadcrumb(browseData.breadcrumb ?? [{ id: null, name: "Internal Files" }]);
      setMovePickerFolders(
        (browseData.entries ?? [])
          .filter((entry): entry is BrowseEntry & { kind: "folder" } => entry.kind === "folder")
          .map((entry) => entry.item),
      );
    } catch (loadError) {
      setMovePickerError(loadError instanceof Error ? loadError.message : "Failed to load folders");
      setMovePickerFolders([]);
    } finally {
      setMovePickerLoading(false);
    }
  }

  function isMoveDestinationDisabled(destinationId: string | null) {
    if (!selectedId || selectedKind !== "folder") return false;
    if (destinationId === null) return false;
    return isFolderDescendant(destinationId, selectedId, movePickerAllFolders);
  }

  function openMovePicker() {
    if (!selectedId || !selectedKind) return;

    const startFolderId = scope === "client" ? clientRootFolderId : null;
    setMovePickerOpen(true);
    setMovePickerFolderId(startFolderId);
    setMovePickerBreadcrumb([
      {
        id: startFolderId,
        name: scope === "client" ? resolvedRootLabel : "Internal Files",
      },
    ]);
    setMovePickerFolders([]);
    setMovePickerAllFolders([]);
    setMovePickerError(null);
    void loadMovePicker(startFolderId);
  }

  function closeMovePicker() {
    setMovePickerOpen(false);
    setMovePickerError(null);
  }

  async function confirmMove(destinationId: string | null) {
    if (!selectedId || !selectedKind) return;
    if (isMoveDestinationDisabled(destinationId)) return;

    const resolvedDestination =
      scope === "client"
        ? destinationId ?? clientRootFolderId
        : destinationId;

    setBusy(true);
    setMovePickerError(null);

    try {
      const endpoint =
        selectedKind === "folder"
          ? `/api/files/folders/${selectedId}`
          : `/api/files/objects/${selectedId}`;

      const body =
        selectedKind === "folder"
          ? {
              parentId: resolvedDestination,
              clientId: scope === "client" ? clientId : undefined,
            }
          : {
              folderId: resolvedDestination,
              clientId: scope === "client" ? clientId : undefined,
            };

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to move item");

      closeMovePicker();
      await refreshAll();
    } catch (actionError) {
      setMovePickerError(actionError instanceof Error ? actionError.message : "Failed to move item");
    } finally {
      setBusy(false);
    }
  }

  async function handleMove() {
    openMovePicker();
  }

  async function handleSetCategory(categoryId: string | null) {
    if (!selectedId || !selectedKind) return;

    setBusy(true);
    try {
      const endpoint =
        selectedKind === "folder"
          ? `/api/files/folders/${selectedId}`
          : `/api/files/objects/${selectedId}`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          clientId: scope === "client" ? clientId : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to update category");
      await refreshAll();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update category");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(entry?: BrowseEntry) {
    const target =
      entry ??
      (selectedId && selectedKind
        ? entries.find(
            (row) => row.item.id === selectedId && row.kind === selectedKind,
          )
        : undefined);

    if (!target) return;

    if (
      scope === "client" &&
      target.kind === "folder" &&
      clientRootFolderId &&
      target.item.id === clientRootFolderId
    ) {
      setError("The client root folder cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(`Delete "${target.item.name}"?`);
    if (!confirmed) return;

    setBusy(true);
    try {
      const endpoint =
        target.kind === "folder"
          ? `/api/files/folders/${target.item.id}`
          : `/api/files/objects/${target.item.id}`;

      const deleteUrl =
        scope === "client" && clientId
          ? `${endpoint}?clientId=${encodeURIComponent(clientId)}`
          : endpoint;

      const response = await fetch(deleteUrl, { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete item");

      if (target.kind === "folder" && target.item.id === folderId) {
        setFolderId(target.item.parentId);
      }

      if (selectedId === target.item.id && selectedKind === target.kind) {
        setSelectedId(null);
        setSelectedKind(null);
      }

      await refreshAll();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to delete item");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(fileId: string) {
    setBusy(true);
    try {
      const downloadUrl =
        scope === "client" && clientId
          ? `/api/files/objects/${fileId}?clientId=${encodeURIComponent(clientId)}`
          : `/api/files/objects/${fileId}`;
      const response = await fetch(downloadUrl);
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Failed to download file");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to download file");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCategory() {
    const name = window.prompt("Category name");
    if (!name?.trim()) return;

    setBusy(true);
    try {
      const response = await fetch("/api/files/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: "#60a5fa" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to create category");
      await loadCategories();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to create category");
    } finally {
      setBusy(false);
    }
  }

  function openEntry(entry: BrowseEntry) {
    if (entry.kind === "folder") {
      setFolderId(entry.item.id);
      setSelectedId(null);
      setSelectedKind(null);
      setSearchInput("");
      setQuery("");
      return;
    }

    void handleDownload(entry.item.id);
  }

  return (
    <div className="grid gap-4 grid-cols-1">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <div className="border-b border-white/10 p-4 sm:p-5">
          {usesApi ? (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => void handleCreateCategory()}
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45 hover:text-white"
                >
                  Add
                </button>
              </div>
              <div className="relative mt-2 max-w-sm">
                <button
                  type="button"
                  onClick={() => setCategoriesOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/12 bg-[#0b1524] px-3 py-2.5 text-left text-sm text-white transition-colors hover:border-white/20"
                  aria-expanded={categoriesOpen}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          categoryFilter == null
                            ? "rgba(255,255,255,0.3)"
                            : categoryMap.get(categoryFilter)?.color ?? "rgba(255,255,255,0.3)",
                      }}
                    />
                    <span className="truncate">
                      {categoryFilter != null
                        ? categoryMap.get(categoryFilter)?.name ?? "Category"
                        : typeFilter === "all"
                          ? "All Files"
                          : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-white/40 transition-transform",
                      categoriesOpen && "rotate-90",
                    )}
                  />
                </button>
                {categoriesOpen ? (
                  <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-white/12 bg-[#0b1524] p-1 shadow-xl">
                    {[
                      { id: "all", name: "All Files", color: "rgba(255,255,255,0.3)", kind: "type" as const },
                      { id: "documents", name: "Documents", color: "#60a5fa", kind: "type" as const },
                      { id: "pdfs", name: "PDFs", color: "#f87171", kind: "type" as const },
                      { id: "images", name: "Images", color: "#34d399", kind: "type" as const },
                      { id: "presentations", name: "Presentations", color: "#fbbf24", kind: "type" as const },
                      { id: "spreadsheets", name: "Spreadsheets", color: "#a78bfa", kind: "type" as const },
                      { id: "archives", name: "Archives", color: "#94a3b8", kind: "type" as const },
                      ...categories.map((category) => ({
                        id: category.id,
                        name: category.name,
                        color: category.color,
                        kind: "category" as const,
                      })),
                    ].map((option) => {
                      const selected =
                        option.kind === "category"
                          ? categoryFilter === option.id
                          : categoryFilter == null && typeFilter === option.id;
                      return (
                        <button
                          key={`${option.kind}-${option.id}`}
                          type="button"
                          onClick={() => {
                            if (option.kind === "category") {
                              setCategoryFilter(option.id);
                              setTypeFilter("all");
                            } else {
                              setCategoryFilter(null);
                              setTypeFilter(option.id);
                            }
                            setCategoriesOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                            selected
                              ? "bg-white/[0.08] text-white"
                              : "text-white/65 hover:bg-white/[0.04] hover:text-white",
                          )}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: option.color }}
                          />
                          {option.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/55">
            {breadcrumb.map((segment, index) => (
              <div key={`${segment.id ?? "root"}-${index}`} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="h-4 w-4 text-white/25" />}
                <button
                  type="button"
                  onClick={() => {
                    const nextId =
                      scope === "client" && !segment.id ? clientRootFolderId : segment.id;
                    setFolderId(nextId);
                    setSelectedId(null);
                    setSelectedKind(null);
                    setSearchInput("");
                    setQuery("");
                  }}
                  className={cn(
                    "rounded-lg px-2 py-1 transition-colors hover:bg-white/[0.06] hover:text-white",
                    index === breadcrumb.length - 1 ? "text-white" : "text-white/55",
                  )}
                >
                  {segment.name}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-full sm:min-w-[12rem] sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search files and folders..."
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-400/40"
              />
            </div>

            <button
              type="button"
              disabled={busy || !canMutate}
              onClick={() => void handleCreateFolder()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.08] disabled:opacity-50"
            >
              <FolderPlus className="h-4 w-4" />
              New folder
            </button>

            <button
              type="button"
              disabled={busy || !canMutate}
              onClick={() => uploadInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>

            <input
              ref={uploadInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void handleUpload(event.target.files)}
            />
          </div>

          {selectedId && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRename()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-white/70 hover:bg-white/[0.05]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleMove()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-white/70 hover:bg-white/[0.05]"
              >
                Move
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDelete()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-400/20 px-3 text-xs text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              {selectedKind === "file" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDownload(selectedId)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-white/70 hover:bg-white/[0.05]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              )}
              <select
                disabled={busy}
                value={
                  entries.find((entry) => entry.item.id === selectedId)?.item.categoryId ?? ""
                }
                onChange={(event) =>
                  void handleSetCategory(event.target.value ? event.target.value : null)
                }
                className="h-8 rounded-lg border border-white/10 bg-[#0b1220] px-3 text-xs text-white/70 outline-none"
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="border-b border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
            {(error.includes("schema cache") || error.includes("file_folders") || error.includes("file_categories")) && (
              <div className="mt-2 space-y-1 text-xs text-red-200/80">
                <p>
                  The file repository tables are not in Supabase yet. In your Supabase project, open{" "}
                  <strong className="font-semibold text-red-100">SQL Editor</strong>, paste the full
                  contents of{" "}
                  <span className="font-mono">supabase/migrations/002_create_internal_files.sql</span>
                  , and click <strong className="font-semibold text-red-100">Run</strong>.
                </p>
                <p>Then refresh this page and try creating a folder again.</p>
              </div>
            )}
            {error.includes("Supabase is not configured") && (
              <p className="mt-1 text-xs text-red-200/70">
                Set <span className="font-mono">SUPABASE_URL</span> and{" "}
                <span className="font-mono">SUPABASE_ANON_KEY</span> in Vercel, then redeploy.
              </p>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-3 px-5 py-10 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading repository...
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="px-5 py-10 text-sm text-white/55">
              This folder is empty. Create a folder or upload Word, Excel, PowerPoint, PDF, and other
              internal files.
            </div>
          ) : (
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Size</th>
                  <th className="px-3 py-3">Modified</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry) => {
                  const Icon = entryIcon(entry);
                  const isSelected = selectedId === entry.item.id && selectedKind === entry.kind;
                  const category =
                    entry.item.categoryId != null
                      ? categoryMap.get(entry.item.categoryId)
                      : undefined;

                  return (
                    <tr
                      key={`${entry.kind}-${entry.item.id}`}
                      onClick={(event) => {
                        if (entry.kind === "folder" && !event.metaKey && !event.ctrlKey) {
                          openEntry(entry);
                          return;
                        }

                        setSelectedId(entry.item.id);
                        setSelectedKind(entry.kind);
                      }}
                      onDoubleClick={() => {
                        if (entry.kind === "file") {
                          void handleDownload(entry.item.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer border-b border-white/5 transition-colors",
                        isSelected ? "bg-sky-500/10" : "hover:bg-white/[0.03]",
                      )}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              entry.kind === "folder" ? "text-amber-300" : "text-sky-300",
                            )}
                          />
                          <span className="font-medium text-white">{entry.item.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-white/60">
                        {entry.kind === "folder"
                          ? "Folder"
                          : fileTypeLabel(
                              entry.item.extension,
                              entry.kind === "file" ? entry.item.mimeType : null,
                            )}
                      </td>
                      <td className="px-3 py-3">
                        {category ? (
                          <span
                            className="inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                            style={{
                              borderColor: `${category.color}66`,
                              backgroundColor: `${category.color}22`,
                              color: category.color,
                            }}
                          >
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-white/35">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-white/60">
                        {entry.kind === "folder"
                          ? "—"
                          : formatFileSize(entry.item.sizeBytes)}
                      </td>
                      <td className="px-3 py-3 font-mono text-white/60">
                        {formatFileDate(entry.item.updatedAt)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(entry);
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-400/20 px-2.5 text-xs text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                          aria-label={`Delete ${entry.item.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {(busy || loading) && (
          <div className="border-t border-white/10 px-5 py-2 text-xs text-white/40">
            {busy ? "Working..." : "Refreshing..."}
          </div>
        )}
      </section>

      {movePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-picker-title"
            className="flex max-h-[min(80vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b1220] shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p
                  id="move-picker-title"
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]"
                >
                  Move item
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Choose a destination folder, then click <span className="text-white">Move here</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={closeMovePicker}
                className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-white/10 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/55">
                {movePickerBreadcrumb.map((segment, index) => (
                  <div key={`${segment.id ?? "root"}-${index}`} className="flex items-center gap-2">
                    {index > 0 && <ChevronRight className="h-4 w-4 text-white/25" />}
                    <button
                      type="button"
                      onClick={() => void loadMovePicker(segment.id)}
                      className={cn(
                        "rounded-lg px-2 py-1 transition-colors hover:bg-white/[0.06] hover:text-white",
                        index === movePickerBreadcrumb.length - 1 ? "text-white" : "text-white/55",
                      )}
                    >
                      {segment.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {movePickerLoading ? (
                <div className="flex items-center gap-3 px-5 py-10 text-sm text-white/55">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading folders...
                </div>
              ) : movePickerFolders.length === 0 ? (
                <div className="px-5 py-10 text-sm text-white/55">
                  No subfolders here. You can move the item to this location.
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {movePickerFolders.map((folder) => {
                    const disabled = isMoveDestinationDisabled(folder.id);

                    return (
                      <li key={folder.id}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => void loadMovePicker(folder.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors",
                            disabled
                              ? "cursor-not-allowed text-white/25"
                              : "text-white hover:bg-white/[0.04]",
                          )}
                        >
                          <Folder className="h-4 w-4 shrink-0 text-amber-300" />
                          <span className="font-medium">{folder.name}</span>
                          {disabled && (
                            <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-white/30">
                              Invalid
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {movePickerError && (
              <div className="border-t border-red-400/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
                {movePickerError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={closeMovePicker}
                className="inline-flex h-10 items-center rounded-xl border border-white/10 px-4 text-sm text-white/70 transition-colors hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || isMoveDestinationDisabled(movePickerFolderId)}
                onClick={() => void confirmMove(movePickerFolderId)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                <FolderInput className="h-4 w-4" />
                Move here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

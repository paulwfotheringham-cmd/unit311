"use client";

import { useCallback, useEffect, useState, startTransition } from "react";

import {
  addSavedBoardPack,
  BOARD_PACK_CATEGORY_OPTIONS,
  BOARD_PACK_GRAPH_OPTIONS,
  boardPackFolderName,
  categoryLabel,
  createBlankBoardPackPage,
  defaultBoardPackPages,
  loadBoardPackPages,
  loadSavedBoardPacks,
  saveBoardPackPages,
  type BoardPackPage,
  type SavedBoardPack,
} from "@/lib/board-pack-data";
import {
  boardPackPdfFilename,
  buildBoardPackPdfBlob,
  buildBoardPackPdfUrl,
  downloadBoardPackPdf,
} from "@/lib/board-pack-pdf";
import { buildBoardReviewPdfUrl, downloadBoardReviewPdf } from "@/lib/board-review-pdf";
import type { HrEmployee } from "@/lib/hr-data";
import { savePdfToFolderPath } from "@/lib/pdf-file-storage";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  Eye,
  FileDown,
  FolderOpen,
  GripVertical,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

export default function BoardPackCustomizerWorkspace() {
  const [pages, setPages] = useState<BoardPackPage[]>(defaultBoardPackPages);
  const [packName, setPackName] = useState("Board Review Pack");
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [savedPacks, setSavedPacks] = useState<SavedBoardPack[]>([]);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [packPdfUrl, setPackPdfUrl] = useState<string | null>(null);
  const [reviewPdfUrl, setReviewPdfUrl] = useState<string | null>(null);
  const [generatingPackPdf, setGeneratingPackPdf] = useState(false);
  const [generatingReviewPdf, setGeneratingReviewPdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      setPages(loadBoardPackPages());
      setSavedPacks(loadSavedBoardPacks());
    });
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/hr/employees", { cache: "no-store" });
        const data = (await response.json()) as { employees?: HrEmployee[] };
        if (response.ok && data.employees) {
          setEmployees(data.employees);
        }
      } catch {
        setEmployees([]);
      }
    })();
  }, []);

  useEffect(() => {
    saveBoardPackPages(pages);
  }, [pages]);

  useEffect(() => {
    return () => {
      if (packPdfUrl) URL.revokeObjectURL(packPdfUrl);
      if (reviewPdfUrl) URL.revokeObjectURL(reviewPdfUrl);
    };
  }, [packPdfUrl, reviewPdfUrl]);

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? null;

  useEffect(() => {
    if (pages.length > 0 && !selectedPageId) {
      startTransition(() => {
        setSelectedPageId(pages[0].id);
      });
    }
  }, [pages, selectedPageId]);

  function updatePage(id: string, patch: Partial<BoardPackPage>) {
    setPages((current) => current.map((page) => (page.id === id ? { ...page, ...patch } : page)));
  }

  function addPage() {
    const page = createBlankBoardPackPage();
    setPages((current) => [...current, page]);
    setSelectedPageId(page.id);
  }

  function removePage(id: string) {
    setPages((current) => {
      const next = current.filter((page) => page.id !== id);
      if (selectedPageId === id) setSelectedPageId(next[0]?.id ?? null);
      return next.length > 0 ? next : defaultBoardPackPages();
    });
  }

  const closePackPdfViewer = useCallback(() => {
    setPackPdfUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const closeReviewPdfViewer = useCallback(() => {
    setReviewPdfUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  async function handleViewPackPdf() {
    setGeneratingPackPdf(true);
    setError(null);
    try {
      closePackPdfViewer();
      const url = buildBoardPackPdfUrl({ packName, pages, companyName: SITE_NAME });
      setPackPdfUrl(url);
    } catch (viewError) {
      setError(viewError instanceof Error ? viewError.message : "Failed to generate PDF");
    } finally {
      setGeneratingPackPdf(false);
    }
  }

  function handleDownloadPackPdf() {
    downloadBoardPackPdf({ packName, pages, companyName: SITE_NAME });
  }

  function handleViewReviewPdf() {
    setGeneratingReviewPdf(true);
    setError(null);
    try {
      closeReviewPdfViewer();
      const url = buildBoardReviewPdfUrl({ employees, companyName: SITE_NAME });
      setReviewPdfUrl(url);
    } catch (viewError) {
      setError(viewError instanceof Error ? viewError.message : "Failed to generate board review PDF");
    } finally {
      setGeneratingReviewPdf(false);
    }
  }

  function handleDownloadReviewPdf() {
    setGeneratingReviewPdf(true);
    try {
      downloadBoardReviewPdf({ employees, companyName: SITE_NAME });
    } finally {
      setGeneratingReviewPdf(false);
    }
  }

  async function handleSavePack() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const blob = buildBoardPackPdfBlob({ packName, pages, companyName: SITE_NAME });
      const filename = boardPackPdfFilename({ packName, pages });
      const folderName = boardPackFolderName();
      const folderSegments = ["Financials", folderName];
      const primaryCategory = pages[0]?.category ?? "executive";

      const upload = await savePdfToFolderPath({
        blob,
        filename,
        folderSegments,
      });

      const entry: SavedBoardPack = {
        id: `pack-${Date.now().toString(36)}`,
        packName: packName.trim() || "Board Review Pack",
        savedAt: new Date().toISOString(),
        filename,
        folderPath: folderSegments.join(" / "),
        category: primaryCategory,
        pageCount: pages.length,
        folderId: null,
        fileObjectId: upload.fileObjectId ?? null,
      };

      addSavedBoardPack(entry);
      setSavedPacks(loadSavedBoardPacks());

      if (upload.ok) {
        setMessage(`Saved to Internal Files → ${folderSegments.join(" → ")}`);
      } else {
        setMessage(
          `Pack saved locally. File upload unavailable${upload.error ? `: ${upload.error}` : ""}.`,
        );
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save pack");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={generatingReviewPdf}
            onClick={handleViewReviewPdf}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.08] disabled:opacity-60"
          >
            <Eye className="h-3.5 w-3.5" />
            {generatingReviewPdf ? "Generating…" : "View board review PDF"}
          </button>
          <button
            type="button"
            disabled={generatingReviewPdf}
            onClick={handleDownloadReviewPdf}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-60"
          >
            <FileDown className="h-3.5 w-3.5" />
            {generatingReviewPdf ? "Generating…" : "Download board review PDF"}
          </button>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10">
              <Settings2 className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Customize board pack</h3>
              <p className="mt-1 text-sm text-white/55">
                Build slides with narrative text and charts from accountancy, projects, and financials.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={generatingPackPdf}
              onClick={() => void handleViewPackPdf()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.08] disabled:opacity-60"
            >
              <Eye className="h-3.5 w-3.5" />
              {generatingPackPdf ? "Generating…" : "Preview custom pack"}
            </button>
            <button
              type="button"
              onClick={handleDownloadPackPdf}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.08]"
            >
              <FileDown className="h-3.5 w-3.5" />
              Download custom pack
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSavePack()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/25 disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save pack"}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <FieldLabel>Pack name</FieldLabel>
          <input
            value={packName}
            onChange={(event) => setPackName(event.target.value)}
            placeholder="Q2 2026 Board Review"
            className={cn(inputClassName(), "max-w-md")}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/15 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Pages</p>
            <button
              type="button"
              onClick={addPage}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/15 px-2 text-[10px] font-semibold text-sky-200"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
          <ul className="mt-3 space-y-1">
            {pages.map((page, index) => (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => setSelectedPageId(page.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors",
                    selectedPage?.id === page.id
                      ? "bg-sky-500/15 text-white"
                      : "text-white/60 hover:bg-white/[0.05] hover:text-white/85",
                  )}
                >
                  <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
                  <span className="min-w-0 flex-1 truncate">
                    {index + 1}. {page.title || "Untitled"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {selectedPage ? (
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-white">Edit page</h3>
              <button
                type="button"
                onClick={() => removePage(selectedPage.id)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-400/30 px-2 text-[11px] font-semibold text-rose-200"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Title</FieldLabel>
                <input
                  value={selectedPage.title}
                  onChange={(event) => updatePage(selectedPage.id, { title: event.target.value })}
                  placeholder="Executive Summary"
                  className={inputClassName()}
                />
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <select
                  value={selectedPage.category}
                  onChange={(event) =>
                    updatePage(selectedPage.id, {
                      category: event.target.value as BoardPackPage["category"],
                    })
                  }
                  className={inputClassName()}
                >
                  {BOARD_PACK_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Graph</FieldLabel>
                <select
                  value={selectedPage.graphType}
                  onChange={(event) =>
                    updatePage(selectedPage.id, {
                      graphType: event.target.value as BoardPackPage["graphType"],
                    })
                  }
                  className={inputClassName()}
                >
                  {BOARD_PACK_GRAPH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Content</FieldLabel>
                <textarea
                  value={selectedPage.bodyText}
                  onChange={(event) =>
                    updatePage(selectedPage.id, { bodyText: event.target.value })
                  }
                  rows={8}
                  placeholder="Free text for this slide…"
                  className={cn(inputClassName(), "resize-y")}
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-violet-300" />
          <h3 className="text-sm font-semibold text-white">Saved board packs</h3>
        </div>
        <p className="mt-1 text-xs text-white/45">
          Stored under Internal Files → Financials → Board Pack [date] — sales, commercial,
          financial, and other categories.
        </p>

        {savedPacks.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">No saved packs yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
            {savedPacks.map((pack) => (
              <li
                key={pack.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{pack.packName}</p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {categoryLabel(pack.category)} · {pack.pageCount} pages · {pack.filename}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/35">{pack.folderPath}</p>
                </div>
                <span className="text-xs text-white/40">
                  {new Date(pack.savedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {packPdfUrl ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-[#020617]">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#07111f]/95 px-4 py-3 backdrop-blur-md sm:px-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                Custom pack
              </p>
              <h3 className="text-sm font-semibold text-white">{packName}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPackPdf}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200"
              >
                <FileDown className="h-3.5 w-3.5" />
                Download
              </button>
              <button
                type="button"
                onClick={closePackPdfViewer}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white/70"
                aria-label="Close PDF viewer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>
          <iframe src={packPdfUrl} title="Custom board pack PDF" className="min-h-0 flex-1 w-full border-0 bg-white" />
        </div>
      ) : null}

      {reviewPdfUrl ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-[#020617]">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#07111f]/95 px-4 py-3 backdrop-blur-md sm:px-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                Board review
              </p>
              <h3 className="text-sm font-semibold text-white">{SITE_NAME} quarterly board review PDF</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadReviewPdf}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25"
              >
                <FileDown className="h-3.5 w-3.5" />
                Download
              </button>
              <button
                type="button"
                onClick={closeReviewPdfViewer}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.08]"
                aria-label="Close board review PDF"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>
          <iframe
            src={reviewPdfUrl}
            title={`${SITE_NAME} board review PDF`}
            className="min-h-0 flex-1 w-full border-0 bg-white"
          />
        </div>
      ) : null}
    </div>
  );
}

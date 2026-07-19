"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Download, Loader2, Minus, Plus, RefreshCw, RotateCcw, X } from "lucide-react";

type DiagramResponse = {
  version?: string | null;
  generatedAt?: string | null;
  sourceDocument?: string | null;
  svgFileName?: string | null;
  pngFileName?: string | null;
  svgDownloadUrl?: string | null;
  pngDownloadUrl?: string | null;
  svg?: string;
  regenerated?: boolean;
  error?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function WorkspaceArchitectureDiagramModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagram, setDiagram] = useState<DiagramResponse | null>(null);
  const [scale, setScale] = useState(0.75);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const resetView = useCallback(() => {
    setScale(0.75);
    setOffset({ x: 0, y: 0 });
  }, []);

  const loadDiagram = useCallback(async (regenerate = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        regenerate
          ? "/api/unit311-details/architecture-diagram"
          : "/api/unit311-details/architecture-diagram",
        {
          method: regenerate ? "POST" : "GET",
          cache: "no-store",
        },
      );
      const data = (await response.json()) as DiagramResponse;
      if (!response.ok || !data.svg) {
        throw new Error(data.error ?? "Failed to load architecture diagram");
      }
      setDiagram(data);
      resetView();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load diagram");
      setDiagram(null);
    } finally {
      setLoading(false);
    }
  }, [resetView]);

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      void loadDiagram(false);
    });
  }, [open, loadDiagram]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const downloadSvg = useCallback(() => {
    if (!diagram?.svg) return;
    const blob = new Blob([diagram.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = diagram.svgFileName ?? "workspace-architecture.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [diagram]);

  const downloadPng = useCallback(() => {
    if (diagram?.pngDownloadUrl) {
      const anchor = document.createElement("a");
      anchor.href = diagram.pngDownloadUrl;
      anchor.download = diagram.pngFileName ?? "workspace-architecture.png";
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.click();
      return;
    }
    downloadSvg();
  }, [diagram, downloadSvg]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    setOffset({
      x: dragRef.current.originX + (event.clientX - dragRef.current.startX),
      y: dragRef.current.originY + (event.clientY - dragRef.current.startY),
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.08 : 0.08;
    setScale((current) => Math.min(2.5, Math.max(0.35, current + direction)));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[min(92dvh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#07111F] shadow-[0_32px_100px_rgba(0,0,0,0.65)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white">
              Workspace Architecture Diagram
            </h3>
            <p className="mt-0.5 truncate text-xs text-white/50">
              Source: {diagram?.sourceDocument ?? "docs/WORKSPACE_ARCHITECTURE.md"}
              {diagram?.version ? ` · v${diagram.version}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setScale((current) => Math.max(0.35, current - 0.1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]"
              title="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setScale((current) => Math.min(2.5, current + 0.1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]"
              title="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-xs font-medium text-white hover:bg-white/[0.1]"
              title="Reset view"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              disabled={!diagram?.svg}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/15 px-3 text-xs font-medium text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
              title="Download SVG"
            >
              <Download className="h-3.5 w-3.5" />
              SVG
            </button>
            <button
              type="button"
              onClick={downloadPng}
              disabled={!diagram?.pngDownloadUrl && !diagram?.svg}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
              title="Download PNG"
            >
              <Download className="h-3.5 w-3.5" />
              PNG
            </button>
            <button
              type="button"
              onClick={() => void loadDiagram(true)}
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-xs font-medium text-white hover:bg-white/[0.1] disabled:opacity-50"
              title="Regenerate from markdown"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Regenerate
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="relative min-h-0 flex-1 cursor-grab overflow-hidden bg-[#040a14] active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {loading && !diagram ? (
            <div className="flex h-full items-center justify-center text-sm text-white/60">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading architecture diagram…
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-red-200">{error}</p>
              <button
                type="button"
                onClick={() => void loadDiagram(true)}
                className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white hover:bg-white/[0.1]"
              >
                Regenerate from docs/WORKSPACE_ARCHITECTURE.md
              </button>
            </div>
          ) : diagram?.svg ? (
            <div
              className="absolute left-1/2 top-1/2 origin-center will-change-transform"
              style={{
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
              }}
              // SVG is generated server-side from the architecture markdown.
              dangerouslySetInnerHTML={{ __html: diagram.svg }}
            />
          ) : null}

          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] text-white/70">
            Scroll to zoom · Drag to pan · {Math.round(scale * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}

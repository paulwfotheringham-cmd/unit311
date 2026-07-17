"use client";

import { useEffect, useMemo, useState } from "react";

import {
  loadViewTileLayout,
  resolveViewTiles,
  saveViewTileLayout,
  type DashboardTileDefinition,
} from "@/lib/dashboard-view-tiles";
import { cn } from "@/lib/utils";
import { LayoutGrid, Plus, RotateCcw, X } from "lucide-react";

type DashboardTopTilesBarProps = {
  storageKey: string;
  catalog: DashboardTileDefinition[];
  defaultLayout: string[];
  title?: string;
  tiles?: DashboardTileDefinition[];
  showCustomizeHint?: boolean;
};

export default function DashboardTopTilesBar({
  storageKey,
  catalog,
  defaultLayout,
  title = "Key details",
  tiles,
  showCustomizeHint = true,
}: DashboardTopTilesBarProps) {
  const [hydrated, setHydrated] = useState(false);
  const [layout, setLayout] = useState<string[]>(defaultLayout);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    setLayout(loadViewTileLayout(storageKey, defaultLayout));
    setHydrated(true);
  }, [storageKey, defaultLayout]);

  useEffect(() => {
    if (!hydrated) return;
    saveViewTileLayout(storageKey, layout);
  }, [hydrated, layout, storageKey]);

  const visibleTiles = useMemo(() => {
    if (tiles?.length) return tiles;
    return resolveViewTiles(catalog, layout);
  }, [catalog, layout, tiles]);

  const hiddenTileIds = catalog.filter((tile) => !layout.includes(tile.id));

  function addTile(id: string) {
    setLayout((current) => (current.includes(id) ? current : [...current, id]));
  }

  function removeTile(id: string) {
    setLayout((current) => current.filter((tileId) => tileId !== id));
  }

  function resetLayout() {
    setLayout([...defaultLayout]);
  }

  if (!hydrated) {
    return <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a1422]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
            {title}
          </p>
          {showCustomizeHint ? (
            <p className="mt-1 text-xs text-white/45">Customize which KPI tiles appear in the top row.</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setCustomizeOpen((open) => !open)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
            customizeOpen
              ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
              : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Customize tiles
        </button>
      </div>

      {customizeOpen ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {hiddenTileIds.length === 0 ? (
              <span className="text-xs text-white/45">All catalog tiles are visible.</span>
            ) : (
              hiddenTileIds.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => addTile(tile.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200"
                >
                  <Plus className="h-3 w-3" />
                  {tile.label}
                </button>
              ))
            )}
            <button
              type="button"
              onClick={resetLayout}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/55 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visibleTiles.map((tile) => (
          <article
            key={tile.id}
            className="relative rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            {customizeOpen ? (
              <button
                type="button"
                aria-label={`Remove ${tile.label}`}
                onClick={() => removeTile(tile.id)}
                className="absolute right-2 top-2 rounded-md border border-white/10 p-1 text-white/45 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
              {tile.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{tile.value}</p>
            {tile.hint ? <p className="mt-2 text-[11px] text-white/35">{tile.hint}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

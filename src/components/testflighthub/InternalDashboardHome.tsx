"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  LayoutGrid,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";

import {
  CommandCentreDataProvider,
  useCommandCentreData,
} from "@/components/testflighthub/CommandCentreDataProvider";
import { CommandCentreTileBody } from "@/components/testflighthub/command-centre/CommandCentreTileBody";
import {
  COMMAND_CENTRE_TILE_CATALOG,
  createTileInstance,
  defaultCommandCentrePreferences,
  getCommandCentreTileDefinition,
  loadCommandCentrePreferences,
  nextTileSize,
  saveCommandCentrePreferences,
  tileSizeClass,
  type CommandCentrePreferences,
  type CommandCentreTileInstance,
  type CommandCentreTileType,
} from "@/lib/command-centre-layout";
import { cn } from "@/lib/utils";

function CardShell({
  title,
  subtitle,
  accent,
  action,
  children,
  className,
  bodyClassName,
  collapsed,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  collapsed?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent shadow-[0_20px_56px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl max-md:backdrop-blur-none",
        accent,
        className,
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-white">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[11px] text-white/45">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {!collapsed ? (
        <div className={cn("min-h-0 flex-1 px-3 py-2.5 sm:px-4", bodyClassName)}>{children}</div>
      ) : null}
    </section>
  );
}

function CommandCentreHome({ showCustomize = true }: { showCustomize?: boolean }) {
  const {
    username,
    displayName,
    whoamiReady,
    anyRefreshing,
    refreshAll,
  } = useCommandCentreData();

  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefs, setPrefs] = useState<CommandCentrePreferences>(() =>
    defaultCommandCentrePreferences(),
  );

  const userKey = username || "anonymous";

  useEffect(() => {
    if (!whoamiReady) return;
    setPrefs(loadCommandCentrePreferences(userKey));
    setPrefsLoaded(true);
  }, [whoamiReady, userKey]);

  useEffect(() => {
    if (!prefsLoaded || !whoamiReady) return;
    saveCommandCentrePreferences(userKey, prefs);
  }, [prefs, prefsLoaded, whoamiReady, userKey]);

  const greetingName = displayName || username || "team";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const visibleTiles = prefs.tiles;

  const availableToAdd = useMemo(() => {
    const present = new Set(prefs.tiles.map((t) => t.type));
    return COMMAND_CENTRE_TILE_CATALOG.filter((def) => !present.has(def.type));
  }, [prefs.tiles]);

  function updateTiles(updater: (tiles: CommandCentreTileInstance[]) => CommandCentreTileInstance[]) {
    setPrefs((prev) => ({ ...prev, tiles: updater(prev.tiles) }));
  }

  function moveTile(instanceId: string, direction: -1 | 1) {
    updateTiles((tiles) => {
      const index = tiles.findIndex((t) => t.instanceId === instanceId);
      if (index < 0) return tiles;
      const next = index + direction;
      if (next < 0 || next >= tiles.length) return tiles;
      const copy = [...tiles];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  function resizeTile(instanceId: string) {
    updateTiles((tiles) =>
      tiles.map((tile) =>
        tile.instanceId === instanceId ? { ...tile, size: nextTileSize(tile.size) } : tile,
      ),
    );
  }

  function hideTile(instanceId: string) {
    setPrefs((prev) => {
      const tile = prev.tiles.find((t) => t.instanceId === instanceId);
      if (!tile) return prev;
      return {
        ...prev,
        tiles: prev.tiles.filter((t) => t.instanceId !== instanceId),
        hiddenTypes: prev.hiddenTypes.includes(tile.type)
          ? prev.hiddenTypes
          : [...prev.hiddenTypes, tile.type],
      };
    });
  }

  function toggleCollapse(instanceId: string) {
    updateTiles((tiles) =>
      tiles.map((tile) =>
        tile.instanceId === instanceId ? { ...tile, collapsed: !tile.collapsed } : tile,
      ),
    );
  }

  function addTile(type: CommandCentreTileType) {
    setPrefs((prev) => ({
      ...prev,
      tiles: [...prev.tiles, createTileInstance(type)],
      hiddenTypes: prev.hiddenTypes.filter((t) => t !== type),
    }));
    setPickerOpen(false);
  }

  function resetLayout() {
    setPrefs(defaultCommandCentrePreferences());
  }

  return (
    <div id="home-tile-action-required" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-sky-300/80">
            Command centre
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
            {greeting}, {greetingName}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            Configurable executive workspace — live data, honest empty states.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editMode ? (
            <>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-50 transition-colors hover:bg-cyan-500/20"
              >
                <Plus className="h-3.5 w-3.5" />
                Add tile
              </button>
              <button
                type="button"
                onClick={resetLayout}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/75 transition-colors hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to default
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setPickerOpen(false);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-50 transition-colors hover:bg-emerald-500/25"
              >
                <Check className="h-3.5 w-3.5" />
                Done Editing
              </button>
            </>
          ) : (
            <>
              {showCustomize ? (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/75 transition-colors hover:bg-white/[0.08]"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Customize Dashboard
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => refreshAll()}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/75 transition-colors hover:bg-white/[0.08]"
              >
                {anyRefreshing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleTiles.map((tile, index) => {
          const def = getCommandCentreTileDefinition(tile.type);
          return (
            <div key={tile.instanceId} className={cn(tileSizeClass(tile.size), "min-w-0")}>
              <CardShell
                title={def?.title ?? tile.type}
                subtitle={editMode ? `Size ${tile.size.toUpperCase()}` : def?.description}
                accent={def?.accent ?? "border-white/10"}
                collapsed={tile.collapsed}
                action={
                  editMode ? (
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Move up"
                        disabled={index === 0}
                        onClick={() => moveTile(tile.instanceId, -1)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:bg-white/[0.08] disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        disabled={index === visibleTiles.length - 1}
                        onClick={() => moveTile(tile.instanceId, 1)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:bg-white/[0.08] disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Resize"
                        onClick={() => resizeTile(tile.instanceId)}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/60 hover:bg-white/[0.08]"
                      >
                        <Maximize2 className="h-3 w-3" />
                        {tile.size}
                      </button>
                      <button
                        type="button"
                        title={tile.collapsed ? "Expand" : "Collapse"}
                        onClick={() => toggleCollapse(tile.instanceId)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:bg-white/[0.08]"
                      >
                        {tile.collapsed ? (
                          <LayoutGrid className="h-3.5 w-3.5" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Hide"
                        onClick={() => hideTile(tile.instanceId)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-400/25 text-rose-200/80 hover:bg-rose-500/15"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : undefined
                }
              >
                <CommandCentreTileBody type={tile.type} />
              </CardShell>
            </div>
          );
        })}
      </div>

      {editMode && pickerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <aside className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0a1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300/80">
                  Tile picker
                </p>
                <h2 className="text-base font-semibold text-white">Add dashboard tiles</h2>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:bg-white/[0.08]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {availableToAdd.length === 0 ? (
                <p className="text-sm text-white/45">All catalog tiles are already on the dashboard.</p>
              ) : (
                availableToAdd.map((def) => (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => addTile(def.type)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border bg-white/[0.03] px-3 py-3 text-left transition-colors hover:bg-white/[0.06]",
                      def.accent,
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0b1524]">
                      <Plus className="h-3.5 w-3.5 text-sky-200" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">{def.title}</span>
                      <span className="mt-0.5 block text-[11px] text-white/45">{def.description}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default function InternalDashboardHome(props?: { showCustomize?: boolean }) {
  return (
    <CommandCentreDataProvider>
      <CommandCentreHome showCustomize={props?.showCustomize ?? true} />
    </CommandCentreDataProvider>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Activity, X } from "lucide-react";

import {
  fetchCachedJson,
  PLATFORM_CACHE_KEYS,
} from "@/lib/platform-fetch-cache";
import {
  getPerformanceSnapshot,
  installPerformanceFetchPatch,
  isPerformanceModeEnabled,
  setPerformanceModeEnabled,
  subscribePerformance,
  type PerformanceSnapshot,
} from "@/lib/platform-performance";
import { cn } from "@/lib/utils";

type WhoamiPayload = {
  username?: string;
  role?: string | null;
  userType?: string;
};

function isAdminUser(whoami: WhoamiPayload | null): boolean {
  if (!whoami) return false;
  const role = (whoami.role ?? "").toLowerCase();
  if (role === "admin" || role === "administrator" || role === "c-suite") return true;
  if (whoami.userType === "internal" && whoami.username === "scott.parazynski") return true;
  return false;
}

export default function AdminPerformanceMode({ activeView }: { activeView?: string }) {
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [snap, setSnap] = useState<PerformanceSnapshot>(() => getPerformanceSnapshot());

  useEffect(() => {
    installPerformanceFetchPatch();
    let cancelled = false;
    void fetchCachedJson<WhoamiPayload>(PLATFORM_CACHE_KEYS.whoami, "/api/auth/whoami", {
      ttlMs: 120_000,
    })
      .then((data) => {
        if (cancelled) return;
        setAllowed(isAdminUser(data));
        setEnabled(isPerformanceModeEnabled());
        setOpen(isPerformanceModeEnabled());
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    return subscribePerformance(() => setSnap(getPerformanceSnapshot()));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setSnap(getPerformanceSnapshot()), 1500);
    return () => window.clearInterval(id);
  }, [enabled, activeView]);

  if (!allowed) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[80] flex flex-col items-end gap-2">
      <button
        type="button"
        className={cn(
          "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-lg backdrop-blur-md transition-colors",
          enabled
            ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
            : "border-white/15 bg-[#0b1524]/90 text-white/70 hover:text-white",
        )}
        onClick={() => {
          const next = !enabled;
          setPerformanceModeEnabled(next);
          setEnabled(next);
          setOpen(next);
          setSnap(getPerformanceSnapshot());
        }}
        title="Admin Performance Mode"
      >
        <Activity className="h-3.5 w-3.5" />
        Perf {enabled ? "On" : "Off"}
      </button>

      {enabled && open ? (
        <div className="pointer-events-auto w-[min(100vw-1.5rem,22rem)] rounded-2xl border border-white/15 bg-[#07111f]/95 p-3 text-[11px] text-white/80 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-semibold tracking-wide text-white">Performance Mode</p>
            <button
              type="button"
              className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Collapse performance panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5">
            <dt className="text-white/45">Page load</dt>
            <dd className="font-mono text-right">{fmtMs(snap.pageLoadMs)}</dd>
            <dt className="text-white/45">Time to interactive</dt>
            <dd className="font-mono text-right">{fmtMs(snap.timeToInteractiveMs)}</dd>
            <dt className="text-white/45">Last navigation</dt>
            <dd className="font-mono text-right">{fmtMs(snap.navigationMs)}</dd>
            <dt className="text-white/45">API calls</dt>
            <dd className="font-mono text-right">{snap.apiCallCount}</dd>
            <dt className="text-white/45">Slowest API</dt>
            <dd className="max-w-[9rem] truncate text-right font-mono" title={snap.slowestApi?.url}>
              {snap.slowestApi
                ? `${snap.slowestApi.durationMs}ms`
                : "—"}
            </dd>
            <dt className="text-white/45">Total API duration</dt>
            <dd className="font-mono text-right">{fmtMs(snap.totalApiDurationMs)}</dd>
            <dt className="text-white/45">Cache hit %</dt>
            <dd className="font-mono text-right">{snap.cacheHitPct}%</dd>
            <dt className="text-white/45">JS downloaded</dt>
            <dd className="font-mono text-right">{snap.jsDownloadedKb} KB</dd>
            <dt className="text-white/45">Largest component</dt>
            <dd className="max-w-[9rem] truncate text-right font-mono" title={snap.largestComponent ?? undefined}>
              {snap.largestComponent ?? "—"}
            </dd>
            <dt className="text-white/45">Active view</dt>
            <dd className="max-w-[9rem] truncate text-right font-mono">
              {activeView ?? snap.activeView ?? "—"}
            </dd>
          </dl>
          {snap.slowestApi ? (
            <p className="mt-2 truncate border-t border-white/10 pt-2 text-[10px] text-white/40" title={snap.slowestApi.url}>
              Slowest: {snap.slowestApi.url}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function fmtMs(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value)}ms`;
}

/**
 * Client-side performance instrumentation for Admin Performance Mode.
 * Tracks navigation, API timings, and cache hit rates without affecting UX.
 */

export type ApiCallRecord = {
  url: string;
  method: string;
  durationMs: number;
  ok: boolean;
  cached: boolean;
  at: number;
};

export type PerformanceSnapshot = {
  pageLoadMs: number | null;
  timeToInteractiveMs: number | null;
  navigationMs: number | null;
  apiCallCount: number;
  slowestApi: { url: string; durationMs: number } | null;
  totalApiDurationMs: number;
  cacheHitPct: number;
  jsDownloadedKb: number;
  largestComponent: string | null;
  activeView: string | null;
};

const PERF_MODE_KEY = "unit311-perf-mode";
const MAX_API_RECORDS = 80;

let enabled = false;
let activeView: string | null = null;
let viewStartedAt = 0;
let navigationMs: number | null = null;
let largestComponent: string | null = null;
let apiRecords: ApiCallRecord[] = [];
let cacheHits = 0;
let cacheMisses = 0;
let listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function isPerformanceModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (enabled) return true;
  try {
    return window.localStorage.getItem(PERF_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPerformanceModeEnabled(next: boolean) {
  enabled = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PERF_MODE_KEY, next ? "1" : "0");
    } catch {
      // ignore quota / private mode
    }
  }
  notify();
}

export function subscribePerformance(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function markWorkspaceView(view: string) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (viewStartedAt > 0) {
    navigationMs = Math.round(now - viewStartedAt);
  }
  viewStartedAt = now;
  activeView = view;
  largestComponent = view;
  notify();
}

export function markLargestComponent(name: string) {
  largestComponent = name;
  notify();
}

export function recordCacheHit() {
  cacheHits += 1;
  notify();
}

export function recordCacheMiss() {
  cacheMisses += 1;
  notify();
}

export function recordApiCall(record: Omit<ApiCallRecord, "at">) {
  apiRecords = [
    { ...record, at: Date.now() },
    ...apiRecords,
  ].slice(0, MAX_API_RECORDS);
  notify();
}

function jsDownloadedKb(): number {
  if (typeof performance === "undefined") return 0;
  try {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    let bytes = 0;
    for (const entry of entries) {
      const name = entry.name;
      if (!/\.(js|mjs|css)(\?|$)/i.test(name) && !name.includes("/_next/static/chunks/")) {
        continue;
      }
      bytes += entry.transferSize || entry.encodedBodySize || 0;
    }
    return Math.round(bytes / 1024);
  } catch {
    return 0;
  }
}

function pageLoadMs(): number | null {
  if (typeof performance === "undefined") return null;
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav) return Math.round(nav.domContentLoadedEventEnd);
    const timing = performance.timing;
    if (timing?.navigationStart) {
      return Math.round(timing.domContentLoadedEventStart - timing.navigationStart);
    }
  } catch {
    // ignore
  }
  return null;
}

function timeToInteractiveMs(): number | null {
  if (typeof performance === "undefined") return null;
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav?.domInteractive) return Math.round(nav.domInteractive);
  } catch {
    // ignore
  }
  return null;
}

export function getPerformanceSnapshot(): PerformanceSnapshot {
  const totalApiDurationMs = apiRecords.reduce((sum, row) => sum + row.durationMs, 0);
  const slowest = apiRecords.reduce<ApiCallRecord | null>((best, row) => {
    if (!best || row.durationMs > best.durationMs) return row;
    return best;
  }, null);
  const cacheTotal = cacheHits + cacheMisses;
  return {
    pageLoadMs: pageLoadMs(),
    timeToInteractiveMs: timeToInteractiveMs(),
    navigationMs,
    apiCallCount: apiRecords.length,
    slowestApi: slowest
      ? { url: slowest.url, durationMs: Math.round(slowest.durationMs) }
      : null,
    totalApiDurationMs: Math.round(totalApiDurationMs),
    cacheHitPct: cacheTotal === 0 ? 0 : Math.round((cacheHits / cacheTotal) * 100),
    jsDownloadedKb: jsDownloadedKb(),
    largestComponent,
    activeView,
  };
}

let fetchPatched = false;

/** Instrument global fetch once for Admin Performance Mode. */
export function installPerformanceFetchPatch() {
  if (typeof window === "undefined" || fetchPatched) return;
  fetchPatched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = (
      init?.method ??
      (typeof input !== "string" && !(input instanceof URL) ? input.method : undefined) ??
      "GET"
    ).toUpperCase();
    const isApi = url.includes("/api/");
    const started = performance.now();
    try {
      const response = await original(input, init);
      if (isApi && isPerformanceModeEnabled()) {
        recordApiCall({
          url: url.replace(/^https?:\/\/[^/]+/, "").slice(0, 120),
          method,
          durationMs: performance.now() - started,
          ok: response.ok,
          cached: false,
        });
      }
      return response;
    } catch (error) {
      if (isApi && isPerformanceModeEnabled()) {
        recordApiCall({
          url: url.replace(/^https?:\/\/[^/]+/, "").slice(0, 120),
          method,
          durationMs: performance.now() - started,
          ok: false,
          cached: false,
        });
      }
      throw error;
    }
  };
}

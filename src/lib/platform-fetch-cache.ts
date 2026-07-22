/**
 * Shared in-browser fetch cache for platform shell data.
 * Dedupes concurrent requests and keeps short-lived responses warm across views.
 */

import {
  recordApiCall,
  recordCacheHit,
  recordCacheMiss,
  isPerformanceModeEnabled,
} from "@/lib/platform-performance";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type InflightEntry<T> = {
  promise: Promise<T>;
};

const memory = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, InflightEntry<unknown>>();

const DEFAULT_TTL_MS = 60_000;

export function peekCachedJson<T>(key: string): T | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memory.delete(key);
    return null;
  }
  return hit.value as T;
}

export function setCachedJson<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  memory.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateCachedJson(key: string | RegExp): void {
  if (typeof key === "string") {
    memory.delete(key);
    inflight.delete(key);
    return;
  }
  for (const existing of memory.keys()) {
    if (key.test(existing)) memory.delete(existing);
  }
  for (const existing of inflight.keys()) {
    if (key.test(existing)) inflight.delete(existing);
  }
}

export async function fetchCachedJson<T>(
  key: string,
  input: RequestInfo | URL,
  init?: RequestInit & { ttlMs?: number; force?: boolean },
): Promise<T> {
  const ttlMs = init?.ttlMs ?? DEFAULT_TTL_MS;
  const force = init?.force ?? false;
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (!force) {
    const cached = peekCachedJson<T>(key);
    if (cached !== null) {
      recordCacheHit();
      if (isPerformanceModeEnabled()) {
        recordApiCall({
          url: url.replace(/^https?:\/\/[^/]+/, "").slice(0, 120),
          method: (init?.method ?? "GET").toUpperCase(),
          durationMs: 0,
          ok: true,
          cached: true,
        });
      }
      return cached;
    }

    const pending = inflight.get(key) as InflightEntry<T> | undefined;
    if (pending) {
      recordCacheHit();
      return pending.promise;
    }
  }

  recordCacheMiss();
  const { ttlMs: _ttl, force: _force, ...fetchInit } = init ?? {};
  const promise = (async () => {
    const response = await fetch(input, {
      ...fetchInit,
      cache: fetchInit.cache ?? "no-store",
    });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${key}`);
    }
    const data = (await response.json()) as T;
    setCachedJson(key, data, ttlMs);
    return data;
  })();

  inflight.set(key, { promise });
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

export const PLATFORM_CACHE_KEYS = {
  session: "platform:session",
  whoami: "platform:whoami",
  users: "platform:users",
  clients: "platform:clients",
  projects: "platform:projects",
  settings: "platform:settings",
  permissions: "platform:permissions",
} as const;

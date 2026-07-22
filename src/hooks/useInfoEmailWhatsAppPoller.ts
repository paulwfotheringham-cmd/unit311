"use client";

import { useEffect } from "react";

const POLL_INTERVAL_MS = 90_000;
const INITIAL_DELAY_MS = 12_000;

/** Poll info@ for new emails and trigger WhatsApp alerts while the internal dashboard is open. */
export function useInfoEmailWhatsAppPoller(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let intervalId: number | null = null;

    async function check() {
      try {
        await fetch("/api/email/notifications/check", { cache: "no-store" });
      } catch {
        // background polling — ignore transient network errors
      }
    }

    const start = () => {
      if (cancelled) return;
      void check();
      intervalId = window.setInterval(() => {
        if (!cancelled) void check();
      }, POLL_INTERVAL_MS);
    };

    const ric = window.requestIdleCallback?.(start, { timeout: INITIAL_DELAY_MS });
    const timer = ric == null ? window.setTimeout(start, INITIAL_DELAY_MS) : null;

    return () => {
      cancelled = true;
      if (ric != null) window.cancelIdleCallback?.(ric);
      if (timer != null) window.clearTimeout(timer);
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [enabled]);
}

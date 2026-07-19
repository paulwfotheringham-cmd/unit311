"use client";

import { useCallback, useEffect, useRef, useState, startTransition } from "react";

import { useTreasuryContext } from "@/components/treasury/treasury-context";
import {
  formatTreasuryDateTime,
  readTreasuryApiJson,
} from "@/components/treasury/treasury-ui";
import type { TreasuryNotification } from "@/lib/treasury/treasury-types";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";

export default function TreasuryNotificationCenter() {
  const { notifications, setNotifications } = useTreasuryContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((entry) => !entry.read).length;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/financials/treasury/notifications", {
        cache: "no-store",
      });
      const data = await readTreasuryApiJson<{ notifications?: TreasuryNotification[] }>(
        response,
      );
      if (response.ok) {
        setNotifications(data.notifications ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [setNotifications]);

  useEffect(() => {
    startTransition(() => {
      void loadNotifications();
    });
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const markRead = async (id: string) => {
    await fetch(`/api/financials/treasury/notifications/${id}/read`, {
      method: "POST",
    });
    setNotifications(
      notifications.map((entry) => (entry.id === id ? { ...entry, read: true } : entry)),
    );
  };

  const markAllRead = async () => {
    const unread = notifications.filter((entry) => !entry.read);
    await Promise.all(
      unread.map((entry) =>
        fetch(`/api/financials/treasury/notifications/${entry.id}/read`, { method: "POST" }),
      ),
    );
    setNotifications(notifications.map((entry) => ({ ...entry, read: true })));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Treasury notifications"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void loadNotifications();
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white/80 transition-colors hover:border-white/25 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#0a1422]/95 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 hover:text-sky-200"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-white/55">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-white/55">No notifications yet.</p>
            ) : (
              <ul>
                {notifications.map((entry) => (
                  <li key={entry.id} className="border-b border-white/[0.06] last:border-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!entry.read) void markRead(entry.id);
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.03]",
                        !entry.read && "bg-sky-500/[0.06]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{entry.title}</p>
                        {!entry.read ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-400" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-white/50">{entry.message}</p>
                      <p className="mt-1.5 text-[10px] text-white/35">
                        {formatTreasuryDateTime(entry.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

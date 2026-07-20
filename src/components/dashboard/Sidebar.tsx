"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import Logo from "@/components/layout/Logo";
import { internalAppPath, internalAppUrl } from "@/lib/app-domains";
import { NAV_ITEMS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ArrowLeft, FlaskConical, MessageSquare, X } from "lucide-react";
import { DashboardIcon } from "./icons";
import { useDashboardData } from "./dashboard-data-context";

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
  basePath?: string;
  homeHref?: string;
  brand?: "logo" | "westport" | "venturi";
  backLabel?: string;
};

export default function Sidebar({
  mobileOpen = false,
  onClose,
  basePath = "/test1",
  homeHref = "/test1",
  brand = "logo",
  backLabel,
}: SidebarProps) {
  const pathname = usePathname();
  const { project } = useDashboardData();
  const isDashboardHome = pathname === basePath;
  const isVenturi = brand === "venturi";
  const messagesHref = isVenturi ? "/client/venturi/messages" : `${basePath}/messages`;
  const viewerKey = isVenturi ? "client:venturi" : null;
  const [unreadTotal, setUnreadTotal] = useState(0);

  const loadUnread = useCallback(async () => {
    if (!viewerKey) return;
    try {
      const response = await fetch(
        `/api/messaging/unread?viewerKey=${encodeURIComponent(viewerKey)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as { unreadTotal?: number };
      if (response.ok) setUnreadTotal(data.unreadTotal ?? 0);
    } catch {
      // ignore polling errors
    }
  }, [viewerKey]);

  useEffect(() => {
    if (!viewerKey) return;
    startTransition(() => {
      void loadUnread();
    });
    const timer = window.setInterval(() => void loadUnread(), 15000);
    return () => window.clearInterval(timer);
  }, [loadUnread, pathname, viewerKey]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(280px,88vw)] flex-col overflow-hidden border-r border-white/[0.08] bg-[#07111F] transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-[240px] lg:shrink-0 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] px-3 lg:h-14 lg:px-4">
        <div className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-1.5">
          {brand === "westport" ? (
            <Link
              href={basePath}
              className="inline-flex shrink-0 items-center"
              aria-label="Westport"
            >
              <span
                className="font-semibold tracking-[-0.03em] text-[#0b2d63]"
                style={{ fontSize: 16 }}
              >
                West<span className="text-[#2563eb]">port</span>
              </span>
            </Link>
          ) : (
            <Logo height={30} href={brand === "venturi" ? basePath : homeHref} className="block w-full max-w-none" />
          )}
        </div>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-white/60 lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 border-b border-white/[0.08] px-4 py-4 lg:px-6 lg:py-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
          Client
        </p>
        <p className="mt-1.5 text-sm font-medium leading-snug text-white/85">
          {project.client}
        </p>
        <div className="mt-4 space-y-1 lg:mt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
            Project
          </p>
          <p className="text-sm leading-snug text-white/70">{project.name}</p>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2 py-3 lg:px-3 lg:py-4">
        <nav className="space-y-1">
          {isVenturi && (
            <Link
              href={messagesHref}
              onClick={onClose}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[13px] transition-colors",
                pathname.startsWith(messagesHref)
                  ? "bg-[#0D1B2A] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-white/45 hover:bg-[#0D1B2A]/60 hover:text-white/75",
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="flex-1">Messages</span>
              {unreadTotal > 0 && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-[#07111F]">
                  {unreadTotal}
                </span>
              )}
            </Link>
          )}

          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={basePath}
              onClick={onClose}
              aria-current={
                "active" in item && item.active && isDashboardHome ? "page" : undefined
              }
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[13px] transition-colors",
                "active" in item && item.active && isDashboardHome
                  ? "bg-[#0D1B2A] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-white/45 hover:bg-[#0D1B2A]/60 hover:text-white/75",
              )}
            >
              <DashboardIcon name={item.icon} className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}
        </nav>
      </ScrollArea>

      <div className="shrink-0 space-y-1 border-t border-white/[0.08] px-2 py-3 lg:px-3 lg:py-4">
        {backLabel ? (
          <Link
            href={homeHref}
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[13px] text-white/45 transition-colors hover:bg-[#0D1B2A]/60 hover:text-white/75"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="flex-1">{backLabel}</span>
          </Link>
        ) : null}
        <Link
          href={internalAppUrl(internalAppPath("testing"))}
          onClick={onClose}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[13px] text-white/45 transition-colors hover:bg-[#0D1B2A]/60 hover:text-white/75"
        >
          <FlaskConical className="h-4 w-4 shrink-0" />
          <span className="flex-1">Test Lab</span>
        </Link>
      </div>
    </aside>
  );
}

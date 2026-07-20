"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Radio,
  Search,
  ShieldCheck,
  TestTube2,
  X,
} from "lucide-react";

import Logo from "@/components/layout/Logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { internalAppPath, internalAppUrl } from "@/lib/app-domains";
import {
  VENTURI_CLIENT,
  VENTURI_NAV_ITEMS,
  type VenturiProjectView,
} from "@/lib/venturi-platform-data";
import { cn } from "@/lib/utils";

const iconMap = {
  LayoutDashboard,
  Search,
  FlaskConical,
  ShieldCheck,
  Radio,
  BadgeCheck,
  TestTube2,
} as const;

type VenturiClientShellProps = {
  activeView: VenturiProjectView;
  onViewChange: (view: VenturiProjectView) => void;
  children: React.ReactNode;
};

export default function VenturiClientShell({
  activeView,
  onViewChange,
  children,
}: VenturiClientShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const onProjectsPage = pathname.startsWith("/client/venturi/projects");
  const onMessagesPage = pathname.startsWith("/client/venturi/messages");

  return (
    <div className="flex h-full min-h-0 w-full">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#07111F]/80 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(280px,88vw)] flex-col overflow-hidden border-r border-white/[0.08] bg-[#07111F] transition-transform duration-300 lg:static lg:z-auto lg:w-[250px] lg:shrink-0 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] px-3 lg:h-14 lg:px-4">
          <div className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-1.5">
            <Logo height={28} href={internalAppUrl()} className="block w-full max-w-none" />
          </div>
          <button
            type="button"
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] text-white/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 border-b border-white/[0.08] px-4 py-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">Client</p>
          <p className="mt-1 text-sm font-medium text-white/90">{VENTURI_CLIENT.name}</p>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
            Programme
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/55">{VENTURI_CLIENT.tagline}</p>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-2 py-3">
          <nav className="space-y-1">
            {VENTURI_NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              const active = !onProjectsPage && !onMessagesPage && activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onViewChange(item.id);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[13px] transition-colors",
                    active
                      ? "bg-[#0D1B2A] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "text-white/45 hover:bg-[#0D1B2A]/60 hover:text-white/75",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <Link
              href="/client/venturi/projects"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[13px] transition-colors",
                onProjectsPage
                  ? "bg-[#0D1B2A] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-white/45 hover:bg-[#0D1B2A]/60 hover:text-white/75",
              )}
            >
              <FolderKanban className="h-4 w-4 shrink-0" />
              <span>Projects</span>
            </Link>
            <Link
              href="/client/venturi/messages"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[13px] transition-colors",
                onMessagesPage
                  ? "bg-[#0D1B2A] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-white/45 hover:bg-[#0D1B2A]/60 hover:text-white/75",
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>Messaging</span>
            </Link>
          </nav>
        </ScrollArea>

        <div className="shrink-0 border-t border-white/[0.08] p-3">
          <Link
            href={internalAppUrl(internalAppPath("clients"))}
            className="block rounded-xl border border-white/[0.08] px-3 py-2 text-center text-xs text-white/45 hover:bg-white/[0.04] hover:text-white/70"
          >
            Back to internal workspace
          </Link>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#07111F]">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] px-4 lg:h-14 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-white/60 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                Intelligence Platform
              </p>
              <p className="text-sm font-medium text-white/90">
                {VENTURI_NAV_ITEMS.find((item) => item.id === activeView)?.label}
              </p>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

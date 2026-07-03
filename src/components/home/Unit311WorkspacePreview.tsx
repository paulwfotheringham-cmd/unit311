"use client";

import { useState } from "react";

import WorkspaceDemoPanel from "@/components/home/WorkspaceDemoPanel";
import {
  internalSurveyNavSections,
  type InternalNavChildItem,
  type InternalNavItem,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import { cn } from "@/lib/utils";
import {
  Binoculars,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  Compass,
  ContactRound,
  FolderKanban,
  FolderOpen,
  GraduationCap,
  Handshake,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  PenLine,
  Pickaxe,
  Settings,
  Share2,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  ContactRound,
  Handshake,
  MapPin,
  FolderKanban,
  History,
  Wallet,
  Briefcase,
  Package,
  FolderOpen,
  CalendarDays,
  Truck,
  Mail,
  MessageSquare,
  Share2,
  LifeBuoy,
  Compass,
  Binoculars,
  PenLine,
  Landmark,
  Pickaxe,
  GraduationCap,
  Users,
  Settings,
};

const PREVIEW_SECTIONS = internalSurveyNavSections.filter(
  (section) =>
    section.label === null ||
    section.label === "Business Central" ||
    section.label === "Inventory Management" ||
    section.label === "Business Productivity" ||
    section.label === "Strategy" ||
    section.label === "Training" ||
    section.label === "Tools" ||
    section.label === "Settings",
);

function NavIcon({ name }: { name: string }) {
  const Icon = iconMap[name] ?? LayoutDashboard;
  return <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />;
}

function SidebarButton({
  label,
  icon,
  active,
  indented = false,
  onClick,
}: {
  label: string;
  icon?: string;
  active: boolean;
  indented?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors",
        indented ? "pl-6" : "",
        active
          ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/20"
          : "text-white/55 hover:bg-white/[0.04] hover:text-white/80",
      )}
    >
      {icon ? (
        <NavIcon name={icon} />
      ) : (
        <ChevronRight className="h-3 w-3 shrink-0 opacity-40" aria-hidden />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

function resolveDemoView(
  item: InternalNavItem | InternalNavChildItem,
  fallback: InternalOperationsView,
): InternalOperationsView {
  if ("view" in item && item.view) return item.view;
  return fallback;
}

export default function Unit311WorkspacePreview({ className }: { className?: string }) {
  const [activeView, setActiveView] = useState<InternalOperationsView>("home");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#0a1628] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <p className="ml-2 text-[11px] text-white/45">unit311central.com/internaldashboard</p>
      </div>

      <div className="flex min-h-[640px] flex-col lg:min-h-[720px] lg:flex-row">
        <aside className="w-full shrink-0 border-b border-white/10 bg-[#0a0f18]/95 lg:w-[220px] lg:border-b-0 lg:border-r">
          <div className="border-b border-white/10 px-3 py-3">
            <div className="rounded-lg bg-white px-2.5 py-1.5">
              <span className="text-[13px] font-bold tracking-[-0.02em] text-[#1a2b4a]">
                Unit<span className="text-[#2563eb]">311</span>
              </span>
            </div>
          </div>

          <nav
            className="max-h-[280px] overflow-y-auto px-2 py-3 lg:max-h-none lg:py-4"
            aria-label="Workspace demo navigation"
          >
            {PREVIEW_SECTIONS.map((section) => (
              <div key={section.label ?? "home"} className="mb-3 last:mb-0">
                {section.label ? (
                  <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-sky-400/80">
                    {section.label}
                  </p>
                ) : null}
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <div key={item.label}>
                      {item.view ? (
                        <SidebarButton
                          label={item.label}
                          icon={item.icon}
                          active={activeView === item.view}
                          onClick={() => setActiveView(item.view!)}
                        />
                      ) : (
                        <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-white/45">
                          <NavIcon name={item.icon} />
                          <span className="truncate">{item.label}</span>
                        </div>
                      )}
                      {item.children?.map((child) => {
                        const childView = resolveDemoView(child, "support");
                        return (
                          <SidebarButton
                            key={child.label}
                            label={child.label}
                            active={activeView === childView}
                            indented
                            onClick={() => setActiveView(childView)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 bg-[#020617]/80">
          <WorkspaceDemoPanel view={activeView} />
        </div>
      </div>
    </div>
  );
}

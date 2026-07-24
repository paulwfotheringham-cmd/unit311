"use client";

import { startTransition, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ContactRound,
  Cpu,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  Globe,
  GraduationCap,
  Handshake,
  HardDrive,
  KeyRound,
  Landmark,
  Laptop,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Radio,
  Receipt,
  ScrollText,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  Target,
  Truck,
  Users,
  Video,
  Wallet,
  Wrench,
  X,
} from "lucide-react";

import Unit311CentralWordmark from "@/components/layout/Unit311CentralWordmark";
import {
  internalSurveyNavSections,
  isInternalNavChildActive,
  isInternalNavItemActive,
  type InternalNavChildItem,
  type InternalNavItem,
  type InternalNavSection,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import { isInternalDomainHost } from "@/lib/app-domains";
import {
  getSidebarTheme,
  readSidebarExpandedState,
  readSidebarThemeId,
  writeSidebarExpandedState,
  type SidebarThemeTokens,
} from "@/lib/sidebar-chrome";
import type { SurveyOperationsBasePath } from "@/lib/survey-operations-mock-data";
import { cn } from "@/lib/utils";

const iconMap = {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ContactRound,
  Cpu,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  Globe,
  GraduationCap,
  Handshake,
  HardDrive,
  KeyRound,
  Landmark,
  Laptop,
  Layers,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Radio,
  Receipt,
  ScrollText,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  Target,
  Truck,
  Users,
  Video,
  Wallet,
  Wrench,
} as const;

const SUBMENU_ICON = "text-[#8B9BB0]";
const NESTED_TEXT = "text-[#D7DEE8]";

/** Near-instant expand — never delay the user. */
const EXPAND_MS = 110;

const WORKSPACE_HEADER_H = 36;
const CARD_PAD_X = 8;
const CARD_GAP = 10;

type EnterprisePlatformSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
  activeView?: InternalOperationsView;
  onViewChange?: (view: InternalOperationsView) => void;
  basePath?: SurveyOperationsBasePath;
  onPrefetchView?: (view: InternalOperationsView) => void;
};

function resolveIcon(name?: string) {
  if (!name) return LayoutDashboard;
  return iconMap[name as keyof typeof iconMap] ?? LayoutDashboard;
}

function cardShellStyle(theme: SidebarThemeTokens): CSSProperties {
  return {
    background: theme.card,
    borderColor: theme.cardBorder,
  };
}

/** Height-only transition — no opacity fade (avoids accordion/material feel). */
function expandPanelClass(isOpen: boolean) {
  return cn(
    "grid transition-[grid-template-rows] ease-out",
    isOpen ? "grid-rows-[1fr]" : "pointer-events-none grid-rows-[0fr]",
  );
}

export default function EnterprisePlatformSidebar({
  mobileOpen = false,
  onClose,
  activeView = "home",
  onViewChange,
  basePath = "/internaldashboard",
  onPrefetchView,
}: EnterprisePlatformSidebarProps) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [theme, setTheme] = useState<SidebarThemeTokens>(() => getSidebarTheme(readSidebarThemeId()));
  const [hydrated, setHydrated] = useState(false);

  const [isInternalOpsHost] = useState(() => {
    if (basePath === "/dashboard") return false;
    if (typeof window !== "undefined" && isInternalDomainHost(window.location.hostname)) {
      return true;
    }
    return basePath === "/" || basePath === "/internaldashboard" || basePath === "/internaldashboard_grants";
  });

  useEffect(() => {
    const saved = readSidebarExpandedState();
    startTransition(() => {
      setExpanded(saved);
      setTheme(getSidebarTheme(readSidebarThemeId()));
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    const onTheme = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setTheme(getSidebarTheme(detail));
    };
    window.addEventListener("unit311-sidebar-theme", onTheme);
    window.addEventListener("unit311-platform-theme", onTheme);
    return () => {
      window.removeEventListener("unit311-sidebar-theme", onTheme);
      window.removeEventListener("unit311-platform-theme", onTheme);
    };
  }, []);

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleExpanded(key: string) {
    setExpanded((current) => {
      const next = { ...current, [key]: !current[key] };
      writeSidebarExpandedState(next);
      return next;
    });
  }

  function navigate(view: InternalOperationsView) {
    onViewChange?.(view);
    onClose?.();
  }

  function childLabel(child: InternalNavChildItem) {
    if (child.view === "billing" && isInternalOpsHost) return "Billing";
    return child.label;
  }

  /** Destinations only — active pill lives here, never on category parents. */
  function renderLeaf(
    key: string,
    label: string,
    active: boolean,
    opts: {
      view?: InternalOperationsView;
      href?: string;
      icon?: string;
      depth: number;
    },
  ) {
    const nested = opts.depth > 0;
    const Icon = resolveIcon(opts.icon);
    const className = cn(
      "flex w-full items-center text-left transition-colors duration-75",
      nested
        ? cn(
            "h-6 gap-0 rounded-md py-0 pl-6 pr-1 text-[11px] font-normal leading-[1.2]",
            NESTED_TEXT,
          )
        : "h-[26px] gap-1.5 rounded-md py-0 pl-1 pr-1 text-[12px] font-medium leading-[1.2] text-white/88",
      active
        ? "text-white"
        : nested
          ? "hover:bg-white/[0.04] hover:text-white"
          : "hover:bg-white/[0.04] hover:text-white",
    );
    const style = active ? { background: "#1F4FBF", color: "#FFFFFF" } : undefined;

    const content = (
      <>
        {!nested && opts.icon ? (
          <Icon className={cn("h-3.5 w-3.5 shrink-0", SUBMENU_ICON)} strokeWidth={1.5} />
        ) : null}
        <span className="min-w-0 flex-1 whitespace-normal break-words">{label}</span>
      </>
    );

    if (opts.href) {
      return (
        <Link
          key={key}
          href={opts.href}
          aria-current={active ? "page" : undefined}
          onClick={onClose}
          className={className}
          style={style}
        >
          {content}
        </Link>
      );
    }

    if (opts.view) {
      return (
        <button
          key={key}
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => navigate(opts.view!)}
          onPointerEnter={() => onPrefetchView?.(opts.view!)}
          onFocus={() => onPrefetchView?.(opts.view!)}
          className={className}
          style={style}
        >
          {content}
        </button>
      );
    }

    return null;
  }

  /**
   * Parent groups (Clients, Projects, …) render as quiet category labels —
   * not accordion rows or nested cards. Children sit flush underneath via indent.
   */
  function renderGroup(
    item: InternalNavItem | InternalNavChildItem,
    parentKey: string,
    depth: number,
  ) {
    const key = `${parentKey}::${item.label}`;
    const hasChildren = (item.children?.length ?? 0) > 0;
    const itemIcon = "icon" in item ? item.icon : undefined;

    if (!hasChildren) {
      return renderLeaf(key, childLabel(item as InternalNavChildItem), isInternalNavChildActive(
        item as InternalNavChildItem,
        activeView,
        pathname,
        basePath,
        searchParams,
      ), {
        view: item.view,
        href: item.href,
        icon: itemIcon,
        depth,
      });
    }

    const isOpen = hydrated ? Boolean(expanded[key]) : false;
    const Chevron = isOpen ? ChevronDown : ChevronRight;
    const Icon = resolveIcon(itemIcon);

    return (
      <div key={key} className={depth === 0 ? "pt-0.5 first:pt-0" : undefined}>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => toggleExpanded(key)}
          className={cn(
            "group flex w-full items-center gap-1.5 text-left transition-colors duration-75",
            depth > 0 ? "h-6 pl-6 pr-0.5" : "h-6 pl-1 pr-0.5",
          )}
        >
          {depth === 0 && itemIcon ? (
            <Icon
              className={cn("h-3.5 w-3.5 shrink-0 opacity-70", SUBMENU_ICON)}
              strokeWidth={1.5}
            />
          ) : null}
          <span
            className={cn(
              "min-w-0 flex-1 whitespace-normal break-words text-left leading-[1.2]",
              depth > 0
                ? "text-[11px] font-normal text-white/65 group-hover:text-white/85"
                : "text-[12px] font-medium text-white/72 group-hover:text-white/90",
            )}
          >
            {item.label}
          </span>
          <Chevron
            className="h-2.5 w-2.5 shrink-0 text-white/35 group-hover:text-white/55"
            strokeWidth={1.75}
          />
        </button>
        <div
          className={expandPanelClass(isOpen)}
          style={{ transitionDuration: `${EXPAND_MS}ms` }}
          aria-hidden={!isOpen}
        >
          <div className="min-h-0 overflow-hidden">
            {/* Continuous surface — no nested chrome; hierarchy = indent only */}
            <div>
              {item.children?.map((child) => renderGroup(child, key, depth + 1))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPinItem(item: InternalNavItem) {
    const active = isInternalNavItemActive(pathname, item, activeView, basePath, searchParams);
    const Icon = resolveIcon(item.icon);

    if (!item.view) return null;

    return (
      <div
        key={item.label}
        className="rounded-[10px] border"
        style={{
          ...(active
            ? { background: "#1F4FBF", borderColor: "#1F4FBF" }
            : cardShellStyle(theme)),
          height: WORKSPACE_HEADER_H,
          paddingLeft: CARD_PAD_X,
          paddingRight: 6,
        }}
      >
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => navigate(item.view!)}
          onPointerEnter={() => onPrefetchView?.(item.view!)}
          onFocus={() => onPrefetchView?.(item.view!)}
          className={cn(
            "group flex h-full w-full items-center gap-1.5 text-left text-[12px] font-medium leading-none tracking-normal transition-colors duration-75",
            active ? "text-white" : "text-white/88 hover:text-white",
          )}
        >
          <Icon
            className={cn("h-3.5 w-3.5 shrink-0", active ? "text-white" : SUBMENU_ICON)}
            strokeWidth={1.5}
          />
          <span className="min-w-0 flex-1 whitespace-nowrap">{item.label}</span>
        </button>
      </div>
    );
  }

  function renderWorkspace(section: InternalNavSection) {
    const workspaceKey = `workspace::${section.label ?? "workspace"}`;
    const isOpen = hydrated ? Boolean(expanded[workspaceKey]) : false;
    const Icon = resolveIcon(section.icon);
    const color = section.color ?? theme.accent;
    const Chevron = isOpen ? ChevronDown : ChevronRight;

    return (
      <div
        key={workspaceKey}
        className="relative rounded-[10px] border"
        style={{
          ...cardShellStyle(theme),
          paddingLeft: CARD_PAD_X,
          paddingRight: 6,
          paddingBottom: isOpen ? 4 : 0,
        }}
      >
        {/* Subtle left accent — workspace identity without coloured title text */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 rounded-[2px]"
          style={{
            width: 2,
            height: "70%",
            background: color,
            opacity: 0.85,
          }}
        />
        {/* Compact section header — not a large control */}
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => {
            const willOpen = !(hydrated && expanded[workspaceKey]);
            toggleExpanded(workspaceKey);
            // Business Productivity landing: open its Dashboard (never File Explorer).
            if (willOpen && section.label === "Business Productivity") {
              const dashboard = section.items.find(
                (item) => item.label === "Dashboard" && item.view,
              );
              if (dashboard?.view) navigate(dashboard.view);
            }
          }}
          className="group flex w-full items-center gap-1.5 text-left"
          style={{ height: WORKSPACE_HEADER_H }}
        >
          <Icon
            className="h-3.5 w-3.5 shrink-0"
            style={{ color, opacity: 0.82 }}
            strokeWidth={1.5}
          />
          <span className="min-w-0 flex-1 text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-white">
            {section.label}
          </span>
          <Chevron
            className="h-2.5 w-2.5 shrink-0 text-white/35 group-hover:text-white/55"
            strokeWidth={1.75}
          />
        </button>

        <div
          className={expandPanelClass(isOpen)}
          style={{ transitionDuration: `${EXPAND_MS}ms` }}
          aria-hidden={!isOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="pb-0.5">
              {section.items.map((item) => {
                if (item.children?.length) {
                  return renderGroup(item, workspaceKey, 0);
                }
                const leafActive = isInternalNavItemActive(
                  pathname,
                  item,
                  activeView,
                  basePath,
                  searchParams,
                );
                return renderLeaf(`${workspaceKey}::${item.label}`, item.label, leafActive, {
                  view: item.view,
                  href: item.href,
                  icon: item.icon,
                  depth: 0,
                });
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pinSections = internalSurveyNavSections.filter((section) => section.kind === "pin");
  const workspaceSections = internalSurveyNavSections.filter(
    (section) => section.kind === "workspace",
  );

  return (
    <aside
      data-ai-target="platform-nav"
      aria-modal={mobileOpen ? true : undefined}
      role={mobileOpen ? "dialog" : undefined}
      aria-label={mobileOpen ? "Navigation menu" : undefined}
      className={cn(
        "safe-area-px fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-[min(320px,94vw)] flex-col overflow-hidden pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out lg:static lg:z-auto lg:h-full lg:max-h-full lg:w-[320px] lg:shrink-0 lg:translate-x-0 lg:pt-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
      style={{
        background: theme.sidebar,
        borderRight: `1px solid ${theme.border}`,
      }}
    >
      <div
        className="relative flex shrink-0 items-center justify-center px-5 pt-5"
        style={{ paddingBottom: 20 }}
      >
        <Link
          href={basePath}
          aria-label="Unit311 Central home"
          className="inline-flex shrink-0 transition-opacity duration-100 hover:opacity-90"
        >
          <Unit311CentralWordmark variant="sidebar" />
        </Link>
        <button
          type="button"
          className="absolute top-1/2 right-5 flex h-8 w-8 -translate-y-1/2 shrink-0 touch-manipulation items-center justify-center rounded-[7px] border text-white/55 transition-colors duration-75 hover:text-white lg:hidden"
          style={{ borderColor: theme.cardBorder }}
          aria-label="Close menu"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      <nav className="sidebar-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col" style={{ gap: CARD_GAP }}>
          {pinSections.map((section) => section.items.map((item) => renderPinItem(item)))}
          {workspaceSections.map((section) => renderWorkspace(section))}
        </div>
      </nav>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import Logo, { LOGO_SIDEBAR_HEIGHT } from "@/components/layout/Logo";
import {
  getInternalNavHref,
  internalSurveyNavSections,
  isInternalNavChildActive,
  isInternalNavItemActive,
  type InternalNavChildItem,
  type InternalNavItem,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import { isInternalDomainHost } from "@/lib/app-domains";
import {
  getSurveyNavHref,
  isSurveyNavItemActive,
  isSurveyOperationsDashboardPath,
  surveyNavItems,
  type SurveyOperationsBasePath,
  type SurveyOperationsView,
} from "@/lib/survey-operations-mock-data";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Binoculars,
  Bot,
  Briefcase,
  Building2,
  Compass,
  ContactRound,
  Wallet,
  Film,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  Globe,
  GraduationCap,
  Handshake,
  History,
  KeyRound,
  Landmark,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  MessageCircle,
  MessageSquare,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Mail,
  Package,
  PenLine,
  Pickaxe,
  Plane,
  Radio,
  Receipt,
  ScrollText,
  Settings,
  Share2,
  ShieldCheck,
  Target,
  Truck,
  Video,
  Users,
  Wrench,
  X,
} from "lucide-react";

const iconMap = {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Binoculars,
  Bot,
  Briefcase,
  Building2,
  Compass,
  ContactRound,
  Wallet,
  Package,
  MapPin,
  Target,
  Plane,
  Radio,
  Receipt,
  ScrollText,
  Settings,
  Share2,
  ShieldCheck,
  Truck,
  Video,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  Globe,
  GraduationCap,
  Handshake,
  History,
  KeyRound,
  Landmark,
  Layers,
  LifeBuoy,
  MessageCircle,
  MessageSquare,
  CalendarDays,
  Mail,
  Users,
  Film,
  PenLine,
  Pickaxe,
  Wrench,
} as const;

const childNavItemClass = (active: boolean) =>
  cn(
    "flex w-full items-center rounded-lg py-1 pl-8 pr-2.5 text-left text-[11px] leading-tight transition-colors lg:py-[0.3rem] lg:text-[10.5px]",
    active
      ? "bg-[#0D1B2A] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      : "text-white/45 hover:bg-[#0D1B2A]/60 hover:text-white/75",
  );

const navItemClass = (active: boolean, compact = false) =>
  cn(
    "flex w-full items-center rounded-lg text-left leading-tight transition-colors",
    compact
      ? "gap-2 px-2.5 py-1 text-[11.5px] lg:py-[0.3rem] lg:text-[11px]"
      : "gap-2.5 px-3 py-2 text-[13px] leading-snug sm:px-3.5 sm:py-2 sm:text-sm",
    active
      ? "bg-[#0D1B2A] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      : "text-white/50 hover:bg-[#0D1B2A]/60 hover:text-white/80",
  );

const sectionHeaderClass =
  "mb-1 px-2.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-400/90 lg:mb-1.5 lg:text-[9.5px]";

type SurveyOperationsSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
  mode?: "survey" | "internal";
  activeView?: SurveyOperationsView | InternalOperationsView;
  onViewChange?: (view: SurveyOperationsView | InternalOperationsView) => void;
  basePath?: SurveyOperationsBasePath;
};

export default function SurveyOperationsSidebar({
  mobileOpen = false,
  onClose,
  mode = "survey",
  activeView,
  onViewChange,
  basePath = "/testflighthub",
}: SurveyOperationsSidebarProps) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const resolvedActiveView = (activeView as InternalOperationsView | undefined) ?? "home";
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const internalNavSections = internalSurveyNavSections;
  const internalBasePath = basePath;
  const [isInternalOpsHost] = useState(() => {
    if (mode !== "internal") return false;
    if (basePath === "/dashboard") return false;
    if (typeof window !== "undefined" && isInternalDomainHost(window.location.hostname)) {
      return true;
    }
    return basePath === "/" || basePath === "/internaldashboard" || basePath === "/internaldashboard_grants";
  });

  function childNavLabel(child: InternalNavChildItem) {
    if (child.view === "billing" && isInternalOpsHost) return "Platform Billing";
    return child.label;
  }

  useEffect(() => {
    const autoExpanded: Record<string, boolean> = {};
    internalNavSections.forEach((section) => {
      section.items.forEach((item) => {
        if (
          item.children?.some((child) =>
            isInternalNavChildActive(
              child,
              resolvedActiveView,
              pathname,
              internalBasePath,
              searchParams,
            ),
          )
        ) {
          autoExpanded[item.label] = true;
        }
      });
    });
    if (Object.keys(autoExpanded).length > 0) {
      setExpandedParents((current) => ({ ...current, ...autoExpanded }));
    }
  }, [internalNavSections, resolvedActiveView, pathname, searchParams, internalBasePath]);

  const inAppNavigation =
    isSurveyOperationsDashboardPath(pathname, basePath) && onViewChange != null;
  const logoHref = mode === "internal" ? basePath : basePath;

  function renderNavItem(
    item: { label: string; icon: string },
    active: boolean,
    onNavigate: () => void,
    asLink: boolean,
    href: string,
    compact = false,
  ) {
    const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;
    const content = (
      <>
        <Icon
          className={cn(
            "shrink-0",
            compact ? "h-3.5 w-3.5 lg:h-[15px] lg:w-[15px]" : "h-4 w-4 sm:h-[18px] sm:w-[18px]",
          )}
        />
        <span className="flex-1 truncate">{item.label}</span>
      </>
    );

    if (asLink) {
      return (
        <Link
          key={item.label}
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={onClose}
          className={navItemClass(active, compact)}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={item.label}
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={navItemClass(active, compact)}
      >
        {content}
      </button>
    );
  }

  function renderInternalChildItem(child: InternalNavChildItem) {
    const active = isInternalNavChildActive(
      child,
      resolvedActiveView,
      pathname,
      internalBasePath,
      searchParams,
    );
    const navHref =
      child.href ?? getInternalNavHref(child.view ?? "home", internalBasePath, child.query);

    if (child.href) {
      return (
        <Link
          key={child.label}
          href={child.href}
          aria-current={active ? "page" : undefined}
          onClick={onClose}
          className={childNavItemClass(active)}
        >
          <span className="truncate">{childNavLabel(child)}</span>
        </Link>
      );
    }

    if (inAppNavigation && child.view && !child.query) {
      return (
        <button
          key={child.label}
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => {
            (onViewChange as (view: InternalOperationsView) => void)(child.view!);
            onClose?.();
          }}
          className={childNavItemClass(active)}
        >
          <span className="truncate">{childNavLabel(child)}</span>
        </button>
      );
    }

    return (
      <Link
        key={child.label}
        href={navHref}
        aria-current={active ? "page" : undefined}
        onClick={onClose}
        className={childNavItemClass(active)}
      >
        <span className="truncate">{childNavLabel(child)}</span>
      </Link>
    );
  }

  function renderInternalNavItemBlock(item: InternalNavItem) {
    const active = isInternalNavItemActive(
      pathname,
      item,
      resolvedActiveView,
      internalBasePath,
      searchParams,
    );
    const hasChildren = (item.children?.length ?? 0) > 0;
    const expanded = expandedParents[item.label] ?? active;

    if (item.indented && (item.view || item.href)) {
      const navHref = item.href ?? getInternalNavHref(item.view as InternalOperationsView, internalBasePath);
      const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;
      const linkActive = item.href
        ? pathname === item.href || pathname.startsWith(`${item.href}/`)
        : active;

      if (inAppNavigation && item.view && !item.href) {
        return (
          <button
            key={item.label}
            type="button"
            aria-current={linkActive ? "page" : undefined}
            onClick={() => {
              (onViewChange as (view: InternalOperationsView) => void)(item.view as InternalOperationsView);
              onClose?.();
            }}
            className={childNavItemClass(linkActive)}
          >
            <Icon className="mr-1.5 h-3 w-3 shrink-0 opacity-70" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      }

      return (
        <Link
          key={item.label}
          href={navHref}
          aria-current={linkActive ? "page" : undefined}
          onClick={onClose}
          className={childNavItemClass(linkActive)}
        >
          <Icon className="mr-1.5 h-3 w-3 shrink-0 opacity-70" />
          <span className="truncate">{item.label}</span>
        </Link>
      );
    }

    if (hasChildren) {
      const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;
      const Chevron = expanded ? ChevronDown : ChevronRight;

      return (
        <div key={item.label}>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() =>
              setExpandedParents((current) => ({
                ...current,
                [item.label]: !expanded,
              }))
            }
            className={navItemClass(active, true)}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 lg:h-[15px] lg:w-[15px]" />
            <span className="flex-1 truncate text-left">{item.label}</span>
            <Chevron className="h-3.5 w-3.5 shrink-0 text-white/35" />
          </button>
          {expanded ? (
            <div className="mt-0.5 space-y-0.5">
              {item.children?.map((child) => renderInternalChildItem(child))}
            </div>
          ) : null}
        </div>
      );
    }

    if (item.href && !item.view) {
      return renderNavItem(item, active, () => undefined, true, item.href, true);
    }

    const navHref = getInternalNavHref(item.view as InternalOperationsView, internalBasePath);

    if (inAppNavigation) {
      return renderNavItem(
        item,
        active,
        () => {
          (onViewChange as (view: InternalOperationsView) => void)(item.view as InternalOperationsView);
          onClose?.();
        },
        false,
        navHref,
        true,
      );
    }

    return renderNavItem(item, active, () => undefined, true, navHref, true);
  }

  function renderInternalSection(section: (typeof internalNavSections)[number]) {
    return (
      <div key={section.label ?? "home"}>
        {section.label ? <p className={sectionHeaderClass}>{section.label}</p> : null}
        <div className="space-y-0.5">
          {section.items.map((item) => renderInternalNavItemBlock(item))}
        </div>
      </div>
    );
  }

  const isInternalCompact = mode === "internal";

  useEffect(() => {
    onClose?.();
    // Close drawer on route change only — not when onClose identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <aside
      aria-modal={mobileOpen ? true : undefined}
      role={mobileOpen ? "dialog" : undefined}
      aria-label={mobileOpen ? "Navigation menu" : undefined}
      className={cn(
        "safe-area-px fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(300px,92vw)] flex-col overflow-hidden border-r border-white/[0.08] bg-[#07111F] pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out md:static md:z-auto md:w-[220px] md:shrink-0 md:translate-x-0 md:pt-0 lg:w-[240px] xl:w-[252px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b border-white/[0.08]",
          isInternalCompact ? "px-2.5 pb-2 pt-2 lg:px-3" : "px-3 pb-4 pt-2.5 lg:px-3.5 lg:pb-5 lg:pt-3",
        )}
      >
        {mode === "internal" ? (
          <div className="min-w-0 flex-1 overflow-visible">
            <Logo
              variant="hero"
              height={LOGO_SIDEBAR_HEIGHT}
              href={logoHref}
              className="drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-1.5">
            <Logo height={30} href={logoHref} className="block w-full max-w-none" />
          </div>
        )}
        <button
          type="button"
          className="ml-2 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/[0.08] text-white/60 md:hidden"
          aria-label="Close menu"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-[max(1rem,env(safe-area-inset-bottom))] lg:px-2.5",
          isInternalCompact ? "pt-2.5 lg:pt-3" : "pt-4 lg:px-3 lg:pt-5",
        )}
      >
        {mode === "internal" ? (
          <div className="space-y-3 lg:space-y-2.5">
            {internalNavSections.map((section) => renderInternalSection(section))}
          </div>
        ) : (
          <div className="space-y-1">
            {surveyNavItems.map((item) => {
              const active = isSurveyNavItemActive(
                pathname,
                item as (typeof surveyNavItems)[number],
                activeView as SurveyOperationsView | null | undefined,
                basePath,
              );
              const externalHref = "href" in item ? item.href : undefined;
              const navHref = getSurveyNavHref(
                item.view as SurveyOperationsView | null,
                externalHref,
                basePath,
              );

              if (inAppNavigation && item.view) {
                return renderNavItem(
                  item,
                  active,
                  () => {
                    (onViewChange as (view: SurveyOperationsView) => void)(
                      item.view as SurveyOperationsView,
                    );
                    onClose?.();
                  },
                  false,
                  navHref,
                );
              }

              return renderNavItem(item, active, () => undefined, true, navHref);
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}

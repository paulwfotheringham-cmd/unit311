"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import ExecutiveAssistantPanel, {
  ExecutiveAssistantTriggerButton,
} from "@/components/executive-assistant/ExecutiveAssistantPanel";
import {
  getInternalNavBreadcrumb,
  internalViewTitles,
  isInternalOperationsView,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import { isDemoDomainHost, isInternalDomainHost } from "@/lib/app-domains";
import { EXECUTIVE_ASSISTANT_VISIBLE } from "@/lib/product-surface-flags";
import {
  surveyViewTitles,
  type SurveyOperationsBasePath,
  type SurveyOperationsView,
} from "@/lib/survey-operations-mock-data";

import SurveyOperationsSidebar from "./SurveyOperationsSidebar";
import { WorkspaceBreadcrumb } from "./workspace-chrome";

type SurveyOperationsShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  mode?: "survey" | "internal";
  activeView?: SurveyOperationsView | InternalOperationsView;
  onViewChange?: (view: SurveyOperationsView | InternalOperationsView) => void;
  basePath?: SurveyOperationsBasePath;
};

export default function SurveyOperationsShell({
  children,
  title = "Operations Dashboard",
  subtitle = "Survey Operations",
  mode = "survey",
  activeView,
  onViewChange,
  basePath = "/testflighthub",
}: SurveyOperationsShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const [isInternalHost] = useState(() => {
    if (typeof window === "undefined") return true;
    const host = window.location.hostname;
    if (isInternalDomainHost(host) || isDemoDomainHost(host)) return true;
    if (host === "localhost" || host === "127.0.0.1") {
      return !host.includes(".") || host === "localhost";
    }
    return false;
  });
  const [isDemoHost] = useState(() => {
    if (typeof window === "undefined") return false;
    return isDemoDomainHost(window.location.hostname);
  });

  useEffect(() => {
    startTransition(() => {
      setMobileNavOpen(false);
      setAssistantOpen(false);
    });
  }, [pathname, activeView]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  const resolvedTitle =
    activeView != null
      ? mode === "internal" && isInternalOperationsView(activeView)
        ? activeView === "billing" && !isInternalHost
          ? "Billing"
          : internalViewTitles[activeView].title
        : surveyViewTitles[activeView as SurveyOperationsView].title
      : title;
  const resolvedSubtitle =
    activeView != null
      ? mode === "internal" && isInternalOperationsView(activeView)
        ? activeView === "billing" && !isInternalHost
          ? "Your subscription"
          : internalViewTitles[activeView].subtitle
        : surveyViewTitles[activeView as SurveyOperationsView].subtitle
      : subtitle;

  // Executive Assistant is hidden until production-ready (demo journey).
  const showAssistantTrigger =
    EXECUTIVE_ASSISTANT_VISIBLE &&
    !(mode === "internal" && isInternalHost && activeView === "home");

  const breadcrumbCrumbs =
    mode === "internal" &&
    activeView != null &&
    isInternalOperationsView(activeView)
      ? getInternalNavBreadcrumb(activeView)
      : null;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 touch-manipulation bg-[#07111F]/80 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <SurveyOperationsSidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        mode={mode}
        activeView={activeView}
        onViewChange={onViewChange}
        basePath={basePath}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#020617]">
        {mode === "internal" && (
          <>
            <div
              className="pointer-events-none absolute inset-0 z-0 bg-[#020617] md:hidden"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-0 hidden bg-cover bg-center bg-no-repeat md:block"
              aria-hidden
              style={{
                backgroundImage:
                  "linear-gradient(rgba(7, 17, 31, 0.86), rgba(2, 6, 23, 0.93)), url(/images/BCN.jpg)",
              }}
            />
          </>
        )}

        <header className="safe-area-px relative z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#07111F]/80 px-2 backdrop-blur-md max-md:backdrop-blur-none sm:px-4 md:px-5 lg:h-16 lg:px-8 lg:backdrop-blur-xl">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/[0.08] text-white/60 lg:hidden"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              {breadcrumbCrumbs && breadcrumbCrumbs.length > 1 ? (
                <WorkspaceBreadcrumb crumbs={breadcrumbCrumbs} />
              ) : (
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                  {resolvedSubtitle}
                </p>
              )}
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-white sm:text-base md:text-lg">
                  {resolvedTitle}
                </h1>
                {isDemoHost ? (
                  <span
                    className="shrink-0 rounded border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200"
                    title="Demo surface — same build as Internal; curated workspace content"
                  >
                    Demo
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {showAssistantTrigger ? (
            <ExecutiveAssistantTriggerButton onClick={() => setAssistantOpen(true)} />
          ) : null}
        </header>

        <div className="safe-area-pb safe-area-px relative z-10 min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 py-2 sm:px-3 sm:py-3 md:px-4 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>

      <ExecutiveAssistantPanel
        variant="drawer"
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        activeView={activeView ?? "home"}
        mode={mode}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import type { DailyExecutiveBrief, ProactiveNotification } from "@/lib/ai-operating-assistant/executive-types";
import {
  BRIEF_READY_EVENT,
  dispatchBriefReady,
  dismissNotification,
  handleExecutiveActionHref,
  hasSeenDailyBrief,
  markDailyBriefSeen,
  readDismissedNotificationIds,
  startWorkflowGuide,
  WORKFLOW_GUIDE_EVENT,
  type WorkflowGuideEventDetail,
} from "@/lib/ai-operating-assistant/proactive-client";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type ProactiveBundle = {
  brief?: DailyExecutiveBrief | null;
  notifications?: ProactiveNotification[];
};

/**
 * Non-blocking proactive signals only.
 * Daily Brief never auto-opens — header indicator opens it on demand.
 * Release Intelligence removed from the product surface.
 */
export default function ExecutiveProactiveLayer({
  activeView,
  roleView,
  onOpenAssistant,
}: {
  activeView?: string | null;
  roleView?: string | null;
  onOpenAssistant?: () => void;
}) {
  const [notifications, setNotifications] = useState<ProactiveNotification[]>([]);
  const [workflowGuide, setWorkflowGuide] = useState<WorkflowGuideEventDetail | null>(null);

  useEffect(() => {
    const onWorkflow = (event: Event) => {
      const detail = (event as CustomEvent<WorkflowGuideEventDetail>).detail;
      if (detail) setWorkflowGuide(detail);
    };
    window.addEventListener(WORKFLOW_GUIDE_EVENT, onWorkflow as EventListener);
    return () => window.removeEventListener(WORKFLOW_GUIDE_EVENT, onWorkflow as EventListener);
  }, []);

  const load = useCallback(async () => {
    // Command Centre owns brief/health on home — skip duplicate proactive fetch.
    if (activeView === "home") {
      dispatchBriefReady({ available: false });
      setNotifications([]);
      return;
    }

    try {
      const response = await fetch("/api/executive-assistant/proactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeView: activeView ?? "home",
          roleView,
          include: "brief,notifications",
        }),
        cache: "no-store",
      });
      if (!response.ok) {
        dispatchBriefReady({ available: false });
        return;
      }
      const data = (await response.json()) as ProactiveBundle;
      const dismissed = new Set(readDismissedNotificationIds());
      setNotifications(
        (data.notifications ?? [])
          .filter((entry) => !dismissed.has(entry.id))
          .slice(0, 1),
      );

      const brief = data.brief ?? null;
      const pending = Boolean(brief && !hasSeenDailyBrief());
      if (pending && brief) {
        dispatchBriefReady({
          available: true,
          greeting: brief.greeting,
          headline: brief.headline,
          priorities: brief.priorities.slice(0, 4),
        });
      } else {
        dispatchBriefReady({ available: false });
      }
    } catch {
      dispatchBriefReady({ available: false });
    }
  }, [activeView, roleView]);

  useEffect(() => {
    void load();
  }, [load]);

  // Clear header brief indicator when leaving a page that had it.
  useEffect(() => {
    return () => {
      dispatchBriefReady({ available: false });
    };
  }, []);

  return (
    <>
      {workflowGuide ? (
        <div className="pointer-events-none fixed top-[4.75rem] left-1/2 z-[59] w-[min(380px,calc(100vw-1.5rem))] -translate-x-1/2 sm:top-[5.25rem]">
          <div className="pointer-events-auto rounded-xl border border-white/12 bg-[#0b1524]/98 px-3 py-2.5 text-white shadow-lg">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Step {workflowGuide.stepIndex + 1} of {workflowGuide.totalSteps} · {workflowGuide.name}
            </p>
            <p className="mt-0.5 text-sm font-medium">{workflowGuide.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">{workflowGuide.instruction}</p>
            <div className="mt-2 flex gap-2">
              {workflowGuide.stepIndex < workflowGuide.totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    startWorkflowGuide(workflowGuide.workflowId, workflowGuide.stepIndex + 1)
                  }
                  className="rounded-md border border-sky-400/35 bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-100"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setWorkflowGuide(null)}
                  className="rounded-md border border-sky-400/35 bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-100"
                >
                  Done
                </button>
              )}
              <button
                type="button"
                onClick={() => setWorkflowGuide(null)}
                className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notifications[0] ? (
        <div className="pointer-events-none fixed top-[4.75rem] left-[max(1rem,env(safe-area-inset-left))] z-[56] w-[min(300px,calc(100vw-1.5rem))] sm:top-[5.25rem] lg:left-[calc(16rem+1rem)]">
          <div
            className={cn(
              "pointer-events-auto rounded-xl border bg-[#0b1524]/98 p-3 text-white shadow-lg",
              notifications[0].severity === "critical"
                ? "border-rose-400/30"
                : "border-white/12",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold">{notifications[0].title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                  {notifications[0].body}
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => {
                  dismissNotification(notifications[0]!.id);
                  setNotifications([]);
                }}
                className="rounded-md p-1 text-white/40 hover:bg-white/[0.06] hover:text-white/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex gap-1.5">
              {notifications[0].href ? (
                <button
                  type="button"
                  onClick={() => handleExecutiveActionHref(notifications[0]!.href!)}
                  className="rounded-md border border-white/12 px-2 py-1 text-[10px] text-white/75"
                >
                  Open
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onOpenAssistant?.();
                  markDailyBriefSeen();
                }}
                className="rounded-md border border-sky-400/30 px-2 py-1 text-[10px] text-sky-100"
              >
                Ask Assistant
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export { BRIEF_READY_EVENT, markDailyBriefSeen, hasSeenDailyBrief };

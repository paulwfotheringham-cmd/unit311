/**
 * Client-side proactive helpers — storage + navigation/workflow events.
 * Does not modify guided learning; reuses its dispatch for highlights/tours.
 */

import {
  applyGuidedToolResult,
  buildHighlightAction,
  buildStartTourAction,
  dispatchGuidedLearning,
  handleGuidedHref,
} from "./guided-learning";
import { briefDateKey } from "./date-keys";
import { buildWorkflowGuideSession } from "./intent-service";
import {
  markPlatformVisit,
  markReleaseSeen,
  readLastSeenRelease,
} from "./release-intelligence";

export const EXECUTIVE_NAVIGATE_EVENT = "unit311:executive-navigate";
export const WORKFLOW_GUIDE_EVENT = "unit311:workflow-guide";
export const BRIEF_READY_EVENT = "unit311:brief-ready";
export const BRIEF_STORAGE_PREFIX = "unit311-daily-brief-seen";
export const NOTIFICATION_DISMISS_KEY = "unit311-proactive-dismissed";

export type BriefReadyDetail = {
  available: boolean;
  greeting?: string;
  headline?: string;
  priorities?: string[];
};

export function briefStorageKey(userId?: string | null) {
  return `${BRIEF_STORAGE_PREFIX}:${userId ?? "anon"}:${briefDateKey()}`;
}

export function hasSeenDailyBrief(userId?: string | null) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(briefStorageKey(userId)) === "1";
  } catch {
    return true;
  }
}

export function markDailyBriefSeen(userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(briefStorageKey(userId), "1");
    window.dispatchEvent(
      new CustomEvent(BRIEF_READY_EVENT, {
        detail: { available: false } satisfies BriefReadyDetail,
      }),
    );
  } catch {
    // ignore
  }
}

export function dispatchBriefReady(detail: BriefReadyDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BRIEF_READY_EVENT, { detail }));
}

export function readDismissedNotificationIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_DISMISS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export function dismissNotification(id: string) {
  if (typeof window === "undefined") return;
  try {
    const current = new Set(readDismissedNotificationIds());
    current.add(id);
    window.localStorage.setItem(NOTIFICATION_DISMISS_KEY, JSON.stringify([...current]));
  } catch {
    // ignore
  }
}

export function dispatchExecutiveNavigate(viewId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EXECUTIVE_NAVIGATE_EVENT, { detail: { viewId } }),
  );
  const url = new URL(window.location.href);
  if (url.pathname.includes("internaldashboard")) {
    url.searchParams.set("view", viewId);
    window.history.pushState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
  }
}

export type WorkflowGuideEventDetail = {
  workflowId: string;
  stepIndex: number;
  name: string;
  title: string;
  instruction: string;
  viewId?: string;
  targetId?: string;
  totalSteps: number;
};

export function dispatchWorkflowGuide(detail: WorkflowGuideEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKFLOW_GUIDE_EVENT, { detail }));
}

export function startWorkflowGuide(workflowId: string, stepIndex = 0) {
  const session = buildWorkflowGuideSession(workflowId, stepIndex);
  if (!session) return false;
  const step = session.steps[session.stepIndex];
  if (!step) return false;

  if (step.viewId) {
    dispatchExecutiveNavigate(step.viewId);
  }

  window.setTimeout(() => {
    if (step.targetId && step.viewId) {
      const action = buildHighlightAction(step.viewId, step.targetId);
      if (action) {
        action.explanation = step.instruction;
        dispatchGuidedLearning(action);
      }
    } else if (step.viewId) {
      dispatchGuidedLearning({
        type: "highlight",
        viewId: step.viewId,
        targetId: "page-main",
        label: step.title,
        explanation: step.instruction,
      });
    }

    dispatchWorkflowGuide({
      workflowId: session.workflowId,
      stepIndex: session.stepIndex,
      name: session.name,
      title: step.title,
      instruction: step.instruction,
      viewId: step.viewId,
      targetId: step.targetId,
      totalSteps: session.steps.length,
    });
  }, 280);

  return true;
}

export function handleWorkflowHref(href: string) {
  try {
    const url = new URL(href);
    if (url.protocol !== "workflow:") return false;
    const host = url.hostname || url.pathname.replace(/^\/*/, "");
    const id = url.searchParams.get("id");
    if (!id) return false;
    if (host === "start") {
      return startWorkflowGuide(id, 0);
    }
    if (host === "next") {
      const step = Number(url.searchParams.get("step") ?? "0");
      return startWorkflowGuide(id, Number.isFinite(step) ? step : 0);
    }
  } catch {
    return false;
  }
  return false;
}

export function handleExecutiveActionHref(href: string, fallbackViewId?: string) {
  if (handleGuidedHref(href, fallbackViewId)) return true;
  if (handleWorkflowHref(href)) return true;
  if (href.startsWith("/internaldashboard")) {
    try {
      const url = new URL(href, typeof window !== "undefined" ? window.location.origin : "http://local");
      const view = url.searchParams.get("view");
      if (view) {
        dispatchExecutiveNavigate(view);
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

export function applyProactiveToolResult(name: string, result: unknown) {
  applyGuidedToolResult(result);
  if (!result || typeof result !== "object") return;

  const summary = (result as { summary?: Record<string, unknown> }).summary;
  if (!summary) return;

  const clientAction = summary.clientAction as
    | { type?: string; viewId?: string; targetId?: string; explanation?: string; href?: string }
    | undefined;
  const guided = summary.guidedClientAction;
  if (guided) applyGuidedToolResult({ summary: { clientAction: guided }, items: [guided] });

  if (clientAction?.type === "navigate" && (clientAction.viewId || clientAction.href)) {
    if (clientAction.viewId) dispatchExecutiveNavigate(clientAction.viewId);
    else if (clientAction.href) handleExecutiveActionHref(clientAction.href);
  }

  if (clientAction?.type === "highlight" && clientAction.viewId && clientAction.targetId) {
    const action = buildHighlightAction(clientAction.viewId, clientAction.targetId);
    if (action) {
      if (clientAction.explanation) action.explanation = clientAction.explanation;
      dispatchGuidedLearning(action);
    }
  }

  if (name === "guideWorkflow" || name === "detectWorkflowIntent") {
    const workflowId =
      (summary.workflowId as string | undefined) ||
      ((result as { items?: Array<{ workflow?: { id?: string } }> }).items?.[0]?.workflow?.id);
    const stepIndex = typeof summary.stepIndex === "number" ? summary.stepIndex : 0;
    if (workflowId) startWorkflowGuide(workflowId, stepIndex);
  }
}

export function bootstrapReleaseVisit() {
  const lastSeen = readLastSeenRelease();
  markPlatformVisit();
  return lastSeen;
}

export function acceptReleaseTour(tourViewId: string) {
  markReleaseSeen();
  dispatchGuidedLearning(buildStartTourAction(tourViewId));
}

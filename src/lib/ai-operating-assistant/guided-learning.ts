import { buildTourSteps, findPageTarget, getPageGuide } from "./page-registry";

export const GUIDED_LEARNING_EVENT = "unit311:guided-learning";
export const GUIDED_LEARNING_STORAGE_PREFIX = "unit311-guided-tour-seen";
export const GUIDED_LEARNING_NEVER_KEY = "unit311-guided-never-show";

export type GuidedLearningClientAction =
  | {
      type: "start_tour";
      viewId: string;
      steps: ReturnType<typeof buildTourSteps>;
      pageName: string;
    }
  | {
      type: "highlight";
      viewId: string;
      targetId: string;
      label: string;
      explanation: string;
    }
  | {
      type: "stop_tour";
    }
  | {
      type: "offer_tour";
      viewId: string;
      pageName: string;
    };

export function tourStorageKey(viewId: string, userId?: string | null) {
  return `${GUIDED_LEARNING_STORAGE_PREFIX}:${userId ?? "anon"}:${viewId}`;
}

export function neverShowToursKey(userId?: string | null) {
  return `${GUIDED_LEARNING_NEVER_KEY}:${userId ?? "anon"}`;
}

export function hasNeverShowTours(userId?: string | null) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(neverShowToursKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markNeverShowTours(userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(neverShowToursKey(userId), "1");
  } catch {
    // ignore
  }
}

export function hasSeenPageTour(viewId: string, userId?: string | null) {
  if (typeof window === "undefined") return true;
  try {
    if (hasNeverShowTours(userId)) return true;
    return window.localStorage.getItem(tourStorageKey(viewId, userId)) === "1";
  } catch {
    return true;
  }
}

export function markPageTourSeen(viewId: string, userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(tourStorageKey(viewId, userId), "1");
  } catch {
    // ignore quota / private mode
  }
}

export function dispatchGuidedLearning(action: GuidedLearningClientAction) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GUIDED_LEARNING_EVENT, { detail: action }));
}

export function buildStartTourAction(
  viewId: string,
): Extract<GuidedLearningClientAction, { type: "start_tour" }> {
  const page = getPageGuide(viewId);
  return {
    type: "start_tour",
    viewId,
    pageName: page.pageName,
    steps: buildTourSteps(viewId),
  };
}

export function buildHighlightAction(
  viewId: string,
  targetId: string,
): Extract<GuidedLearningClientAction, { type: "highlight" }> | null {
  const target = findPageTarget(viewId, targetId);
  if (!target) return null;
  return {
    type: "highlight",
    viewId,
    targetId: target.id,
    label: target.label,
    explanation: target.explanation,
  };
}

export function resolveTargetElement(targetId: string, selector?: string) {
  if (typeof document === "undefined") return null;
  const byAttr = document.querySelector(`[data-ai-target="${targetId}"]`);
  if (byAttr instanceof HTMLElement) return byAttr;
  if (selector) {
    const bySelector = document.querySelector(selector);
    if (bySelector instanceof HTMLElement) return bySelector;
  }
  return null;
}

export function extractGuidedClientAction(result: unknown): GuidedLearningClientAction | null {
  if (!result || typeof result !== "object") return null;
  const record = result as {
    summary?: { clientAction?: GuidedLearningClientAction };
    items?: unknown[];
  };
  const fromSummary = record.summary?.clientAction;
  if (fromSummary && typeof fromSummary === "object" && "type" in fromSummary) {
    return fromSummary;
  }
  const first = record.items?.[0];
  if (first && typeof first === "object" && first !== null && "type" in first) {
    return first as GuidedLearningClientAction;
  }
  return null;
}

export function applyGuidedToolResult(result: unknown) {
  const action = extractGuidedClientAction(result);
  if (action) dispatchGuidedLearning(action);
}

export function handleGuidedHref(href: string, fallbackViewId?: string) {
  try {
    const url = new URL(href);
    if (url.protocol !== "guided:") return false;
    const host = url.hostname || url.pathname.replace(/^\/*/, "");
    if (host === "start_tour") {
      const viewId = url.searchParams.get("view") || fallbackViewId || "home";
      dispatchGuidedLearning(buildStartTourAction(viewId));
      return true;
    }
    if (host === "highlight") {
      const viewId = url.searchParams.get("view") || fallbackViewId || "home";
      const targetId = url.searchParams.get("target");
      if (!targetId) return false;
      const action = buildHighlightAction(viewId, targetId);
      if (action) dispatchGuidedLearning(action);
      return Boolean(action);
    }
    if (host === "stop") {
      dispatchGuidedLearning({ type: "stop_tour" });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

"use client";

/**
 * Former proactive floating-notification + Daily Brief layer.
 * Intentionally inert: automatic popups and Daily Brief are removed from the product surface.
 * The Executive Assistant can still answer brief-style questions on demand via tools.
 */
export default function ExecutiveProactiveLayer(_props: {
  activeView?: string | null;
  roleView?: string | null;
  onOpenAssistant?: () => void;
}) {
  return null;
}

export {
  BRIEF_READY_EVENT,
  markDailyBriefSeen,
  hasSeenDailyBrief,
} from "@/lib/ai-operating-assistant/proactive-client";

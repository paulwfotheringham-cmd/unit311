"use client";

import ExecutiveAssistantPanel from "@/components/executive-assistant/ExecutiveAssistantPanel";
import { PLATFORM_AI_ASSISTANT_VISIBLE } from "@/lib/product-surface-flags";
import type { InternalOperationsView } from "@/lib/internal-operations-data";
import type { SurveyOperationsView } from "@/lib/survey-operations-mock-data";

type PlatformFloatingAiAssistantProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeView?: SurveyOperationsView | InternalOperationsView;
  mode?: "survey" | "internal";
};

/**
 * Platform-shell floating AI Assistant — mounted once in SurveyOperationsShell.
 * Distinct from the Executive Assistant workspace module (`?view=executive-assistant`).
 */
export default function PlatformFloatingAiAssistant({
  open,
  onOpenChange,
  activeView,
  mode = "internal",
}: PlatformFloatingAiAssistantProps) {
  if (!PLATFORM_AI_ASSISTANT_VISIBLE || mode !== "internal") {
    return null;
  }

  return (
    <ExecutiveAssistantPanel
      variant="drawer"
      open={open}
      onClose={() => onOpenChange(false)}
      activeView={activeView ?? "home"}
      mode={mode}
    />
  );
}

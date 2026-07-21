"use client";

import { Sparkles } from "lucide-react";

import ExecutiveAssistantPanel from "@/components/executive-assistant/ExecutiveAssistantPanel";
import { PLATFORM_AI_ASSISTANT_VISIBLE } from "@/lib/product-surface-flags";
import type { InternalOperationsView } from "@/lib/internal-operations-data";
import type { SurveyOperationsView } from "@/lib/survey-operations-mock-data";
import { cn } from "@/lib/utils";

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
    <>
      <button
        type="button"
        data-ai-target="ai-assistant"
        aria-label="Open AI Assistant"
        onClick={() => onOpenChange(true)}
        className={cn(
          "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40",
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          "border border-sky-400/40 bg-sky-500/20 text-sky-100 shadow-[0_12px_40px_rgba(14,165,233,0.35)]",
          "backdrop-blur-md transition-colors hover:border-sky-300/50 hover:bg-sky-500/30",
          "touch-manipulation lg:h-14 lg:w-14",
          open && "pointer-events-none opacity-0",
        )}
      >
        <Sparkles className="h-5 w-5 lg:h-6 lg:w-6" />
      </button>

      <ExecutiveAssistantPanel
        variant="drawer"
        open={open}
        onClose={() => onOpenChange(false)}
        activeView={activeView ?? "home"}
        mode={mode}
      />
    </>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { PLATFORM_AI_ASSISTANT_VISIBLE } from "@/lib/product-surface-flags";
import type { InternalOperationsView } from "@/lib/internal-operations-data";
import type { SurveyOperationsView } from "@/lib/survey-operations-mock-data";

const ExecutiveAssistantPanel = dynamic(
  () => import("@/components/executive-assistant/ExecutiveAssistantPanel"),
  { ssr: false },
);

type PlatformFloatingAiAssistantProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeView?: SurveyOperationsView | InternalOperationsView;
  mode?: "survey" | "internal";
};

/**
 * Platform-shell floating AI Assistant — mounted once in SurveyOperationsShell.
 * Distinct from the Executive Assistant workspace module (`?view=executive-assistant`).
 * Panel JS + conversations load only after the first open.
 */
export default function PlatformFloatingAiAssistant({
  open,
  onOpenChange,
  activeView,
  mode = "internal",
}: PlatformFloatingAiAssistantProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!PLATFORM_AI_ASSISTANT_VISIBLE || mode !== "internal") {
    return null;
  }

  if (!mounted) return null;

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

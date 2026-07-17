"use client";

import ExecutiveAssistantPanel from "@/components/executive-assistant/ExecutiveAssistantPanel";

/**
 * Home-embedded Executive Assistant shell.
 * Reuses the global ExecutiveAssistantPanel (UI foundation only — no AI yet).
 */
export default function HomeExecutiveAssistantPanel() {
  return (
    <ExecutiveAssistantPanel
      variant="home"
      activeView="home"
      mode="internal"
      className="h-full min-h-[36rem]"
    />
  );
}

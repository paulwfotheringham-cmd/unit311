"use client";

import ExecutiveAssistantPanel from "@/components/executive-assistant/ExecutiveAssistantPanel";

/**
 * Full-page Executive Assistant view — same reusable UI shell as Home / drawer.
 * No AI wiring in this foundation pass.
 */
export default function ExecutiveAssistantWorkspace() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-3xl flex-col">
      <ExecutiveAssistantPanel
        variant="home"
        activeView="executive-assistant"
        mode="internal"
        className="min-h-[32rem] flex-1"
      />
    </div>
  );
}

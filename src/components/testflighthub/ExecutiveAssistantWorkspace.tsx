"use client";

import ExecutiveAssistantPanel from "@/components/executive-assistant/ExecutiveAssistantPanel";

/**
 * Full-page Executive Assistant workspace — chat, history, prompts, workspace context.
 */
export default function ExecutiveAssistantWorkspace() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <ExecutiveAssistantPanel
        variant="page"
        activeView="executive-assistant"
        mode="internal"
        className="min-h-[calc(100dvh-10rem)]"
      />
    </div>
  );
}

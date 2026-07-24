"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Loader2, Pin } from "lucide-react";

import ExecutiveAssistantPanel from "@/components/executive-assistant/ExecutiveAssistantPanel";
import { cn } from "@/lib/utils";

type ProactiveBundle = {
  brief?: {
    greeting?: string;
    narrative?: string;
  } | null;
};

const QUICK_PROMPTS = [
  "Review today's priorities",
  "Summarise the business",
  "What changed overnight?",
  "Review cashflow",
  "Show project risks",
  "Prepare for my next meeting",
  "Generate board report",
] as const;

const PINNED_CONVERSATIONS = [
  { id: "board", title: "Board pack draft", prompt: "Continue our board pack draft — what decisions are still open?" },
  { id: "cash", title: "Cash & AR review", prompt: "Continue our cash and AR review — what needs a decision today?" },
] as const;

function cardClass(className?: string) {
  return cn(
    "rounded-[12px] border p-3.5",
    "border-[color:var(--platform-card-border,#243347)] bg-[color:var(--platform-card,#121C2D)]",
    className,
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
      {children}
    </p>
  );
}

function resolveGreeting(raw?: string | null) {
  const trimmed = raw?.trim();
  if (trimmed && /good\s+(morning|afternoon|evening)/i.test(trimmed)) {
    return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
  }
  return "Good morning.";
}

/**
 * Conversation-first Executive Assistant — calm workspace for decisions, not a second dashboard.
 */
export default function ExecutiveOperatingCentre() {
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null);
  const [proactive, setProactive] = useState<ProactiveBundle | null>(null);
  const [proactiveLoading, setProactiveLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setProactiveLoading(true);
      try {
        const response = await fetch(
          "/api/executive-assistant/proactive?include=brief&view=executive-assistant",
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("proactive failed");
        const data = (await response.json()) as ProactiveBundle;
        if (!cancelled) setProactive(data);
      } catch {
        if (!cancelled) setProactive(null);
      } finally {
        if (!cancelled) setProactiveLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendPrompt = useCallback((text: string) => {
    setSeedPrompt(text);
  }, []);

  const greeting = resolveGreeting(proactive?.brief?.greeting);
  const narrative =
    proactive?.brief?.narrative ||
    "A short brief of what matters today is ready when you need it.";

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[36rem] w-full min-w-0 gap-3 xl:gap-4">
      {/* LEFT RAIL — conversation starters only */}
      <aside className="hidden w-[15.5rem] shrink-0 flex-col gap-3 overflow-y-auto lg:flex xl:w-[16.5rem]">
        <section className={cardClass()}>
          <SectionLabel>Today&apos;s Brief</SectionLabel>
          <p className="text-[12px] leading-relaxed text-white/70">
            {proactiveLoading ? "Refreshing briefing…" : narrative}
          </p>
          <button
            type="button"
            onClick={() => sendPrompt("Summarise today's business and tell me what to do next.")}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--platform-accent,#60a5fa)] hover:underline"
          >
            Discuss this brief
            <ChevronRight className="h-3 w-3" />
          </button>
        </section>

        <section className={cardClass()}>
          <SectionLabel>Pinned Conversations</SectionLabel>
          <ul className="space-y-1.5">
            {PINNED_CONVERSATIONS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => sendPrompt(item.prompt)}
                  className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-[12px] text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <Pin className="h-3.5 w-3.5 shrink-0 text-white/35" />
                  <span className="truncate">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass("flex min-h-0 flex-1 flex-col")}>
          <SectionLabel>Quick Prompts</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendPrompt(prompt)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug transition-colors",
                  "border-white/12 bg-white/[0.04] text-white/75",
                  "hover:border-[color:var(--platform-accent,#2F80ED)]/45 hover:bg-[color:var(--platform-accent,#2F80ED)]/12 hover:text-white",
                  "active:scale-[0.98]",
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>
      </aside>

      {/* CENTRE — greeting + conversation (tight, no empty gap) */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="mb-1.5 shrink-0 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              {greeting}
            </h2>
            {proactiveLoading ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-white/35" />
            ) : null}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[color:var(--platform-card-border,#243347)]">
          <ExecutiveAssistantPanel
            variant="page"
            activeView="executive-assistant"
            mode="internal"
            hideSidebar
            embedded
            seedPrompt={seedPrompt}
            onSeedConsumed={() => setSeedPrompt(null)}
            className="h-full min-h-0 rounded-none border-0"
          />
        </div>
      </div>
    </div>
  );
}

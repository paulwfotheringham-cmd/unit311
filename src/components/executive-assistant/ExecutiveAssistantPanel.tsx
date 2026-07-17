"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Search, Send, Sparkles, X } from "lucide-react";

import {
  FUTURE_ACTIONS,
  GENERATE_ACTIONS,
  HOME_BRIEFING_PRIORITIES,
  HOME_SUGGESTED_ACTIONS,
  greetingForNow,
  resolveExecutiveAssistantContext,
  type ExecutiveAssistantVariant,
} from "@/lib/executive-assistant-ui";
import { cn } from "@/lib/utils";

export type ExecutiveAssistantPanelProps = {
  variant: ExecutiveAssistantVariant;
  /** Active operations view id — drives context label + suggested prompts. */
  activeView?: string | null;
  mode?: "survey" | "internal";
  /** Drawer only */
  open?: boolean;
  onClose?: () => void;
  className?: string;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
      {children}
    </p>
  );
}

function ChipButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-left text-[11px] font-medium text-white/70 transition-colors hover:border-sky-400/35 hover:bg-sky-500/10 hover:text-sky-100"
    >
      {label}
    </button>
  );
}

export default function ExecutiveAssistantPanel({
  variant,
  activeView = "home",
  mode = "internal",
  open = false,
  onClose,
  className,
}: ExecutiveAssistantPanelProps) {
  const [userName, setUserName] = useState("there");
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const context = useMemo(
    () => resolveExecutiveAssistantContext(activeView, mode),
    [activeView, mode],
  );

  const greeting = useMemo(() => greetingForNow(userName), [userName]);
  const isHome = variant === "home";
  const suggested = isHome ? HOME_SUGGESTED_ACTIONS : context.suggestedPrompts;

  useEffect(() => {
    void fetch("/api/auth/whoami", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as {
          displayName?: string;
          workspaceName?: string | null;
          workspaceId?: string | null;
        };
        const first = data.displayName?.trim().split(/\s+/)[0];
        if (first) setUserName(first);
        if (data.workspaceName?.trim()) setWorkspaceName(data.workspaceName.trim());
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (variant !== "drawer" || !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [variant, open, onClose]);

  useEffect(() => {
    if (variant !== "drawer" || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [variant, open]);

  function showPlaceholderNotice(label: string) {
    setNotice(`${label} — coming soon`);
    window.setTimeout(() => setNotice(null), 2200);
  }

  function handleSend(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage("");
    showPlaceholderNotice("Assistant reply");
  }

  const panelBody = (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        isHome
          ? "rounded-2xl border border-white/12 bg-gradient-to-b from-[#0c1628] via-[#0a1322] to-[#070f1a] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "bg-[#07111f]",
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">
            Executive Assistant
          </h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-300/90">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Online
          </p>
        </div>
        {variant === "drawer" ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Close Executive Assistant"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {isHome ? (
          <section>
            <SectionLabel>Context Briefing</SectionLabel>
            <p className="mt-2 text-sm font-medium text-white">{greeting}</p>
            {workspaceName ? (
              <p className="mt-1 text-xs text-white/45">Workspace · {workspaceName}</p>
            ) : null}
            <p className="mt-3 text-xs font-semibold text-white/70">Today&apos;s priorities</p>
            <ul className="mt-2 space-y-1.5 text-xs text-white/55">
              {HOME_BRIEFING_PRIORITIES.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-sky-300/80">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section>
            <SectionLabel>Current Context</SectionLabel>
            <p className="mt-2 text-sm text-white/70">You are viewing:</p>
            <p className="mt-1 text-base font-semibold text-white">{context.label}</p>
            {workspaceName ? (
              <p className="mt-1 text-xs text-white/45">Workspace · {workspaceName}</p>
            ) : null}
          </section>
        )}

        <section>
          <SectionLabel>{isHome ? "Suggested Actions" : "Suggested"}</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggested.map((action) => (
              <ChipButton
                key={action}
                label={action}
                onClick={() => showPlaceholderNotice(action)}
              />
            ))}
          </div>
        </section>

        {!isHome ? (
          <>
            <section>
              <SectionLabel>Search</SectionLabel>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                <input
                  value={workspaceQuery}
                  onChange={(event) => setWorkspaceQuery(event.target.value)}
                  placeholder="Search the entire workspace..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b1524] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-sky-400/40"
                />
              </div>
            </section>

            <section>
              <SectionLabel>Generate</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {GENERATE_ACTIONS.map((action) => (
                  <ChipButton
                    key={action}
                    label={action}
                    onClick={() => showPlaceholderNotice(action)}
                  />
                ))}
              </div>
            </section>

            <section>
              <SectionLabel>Future Actions</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FUTURE_ACTIONS.map((action) => (
                  <ChipButton
                    key={action}
                    label={action}
                    onClick={() => showPlaceholderNotice(action)}
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}

        <section>
          <SectionLabel>Conversation</SectionLabel>
          <div className="mt-2 rounded-xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-8 text-center">
            <FileText className="mx-auto h-5 w-5 text-white/25" />
            <p className="mt-3 text-sm text-white/45">Ask anything about your business...</p>
            <p className="mt-1 text-[11px] text-white/30">
              Placeholder only — responses will use this workspace when AI is enabled.
            </p>
          </div>
          {notice ? (
            <p className="mt-2 rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
              {notice}
            </p>
          ) : null}
        </section>
      </div>

      <form
        className="shrink-0 border-t border-white/10 p-4"
        onSubmit={handleSend}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={2}
            placeholder="Ask anything about your business..."
            className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-sky-400/40"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-100 transition-colors hover:bg-sky-500/25 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );

  if (variant === "home") {
    return (
      <aside className="flex h-full min-h-[36rem] flex-col xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)]">
        {panelBody}
      </aside>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex justify-end",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        className={cn(
          "absolute inset-0 bg-[#020617]/70 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        aria-label="Dismiss Executive Assistant"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative flex h-full w-full max-w-[420px] border-l border-white/10 shadow-[-24px_0_64px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Executive Assistant"
      >
        {panelBody}
      </aside>
    </div>
  );
}

export function ExecutiveAssistantTriggerButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 text-xs font-semibold text-sky-100 transition-colors hover:border-sky-400/45 hover:bg-sky-500/20 sm:h-10 sm:px-3.5 sm:text-sm",
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      <span className="hidden sm:inline">Assistant</span>
      <span className="sm:hidden">AI</span>
    </button>
  );
}

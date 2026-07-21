"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  AssistantChatMessage,
  AssistantConversationRecord,
  AssistantPageSelection,
  AssistantStreamEvent,
} from "@/lib/ai-operating-assistant/types";
import {
  applyGuidedToolResult,
  handleGuidedHref,
} from "@/lib/ai-operating-assistant/guided-learning";
import {
  applyProactiveToolResult,
  handleExecutiveActionHref,
  startWorkflowGuide,
} from "@/lib/ai-operating-assistant/proactive-client";
import type { AiExplanation } from "@/lib/ai-operating-assistant/explainability";
import {
  executeConfirmedAction,
  proposeAction,
  type AssistantPendingActionKind,
} from "@/lib/ai-operating-assistant/action-service";
import { requestShowMeAround } from "@/components/executive-assistant/GuidedLearningProvider";
import AssistantFeedbackButtons from "@/components/executive-assistant/AssistantFeedbackButtons";
import ExplanationPanel from "@/components/executive-assistant/ExplanationPanel";
import {
  GENERATE_ACTIONS,
  HOME_SUGGESTED_ACTIONS,
  greetingForNow,
  resolveExecutiveAssistantContext,
  type ExecutiveAssistantVariant,
} from "@/lib/executive-assistant-ui";
import { cn } from "@/lib/utils";
import {
  Eraser,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Send,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

export type ExecutiveAssistantPanelProps = {
  variant: ExecutiveAssistantVariant;
  activeView?: string | null;
  mode?: "survey" | "internal";
  selection?: AssistantPageSelection;
  roleView?: string | null;
  open?: boolean;
  onClose?: () => void;
  className?: string;
};

const WELCOME: AssistantChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "I'm your Unit311 Executive Operating Assistant. I watch live platform activity, surface risks and recommendations, and can guide you through workflows — not just answer questions. Ask for today's brief, business health, or say “I need to onboard a client.”",
  createdAt: new Date().toISOString(),
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
      {children}
    </p>
  );
}

function ChipButton({ label, onClick }: { label: string; onClick?: () => void }) {
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

async function readSseStream(
  response: Response,
  onEvent: (event: AssistantStreamEvent) => void,
) {
  if (!response.body) throw new Error("No response stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        onEvent(JSON.parse(payload) as AssistantStreamEvent);
      } catch {
        // ignore malformed frames
      }
    }
  }
}

export default function ExecutiveAssistantPanel({
  variant,
  activeView = "home",
  mode = "internal",
  selection,
  roleView = null,
  open = false,
  onClose,
  className,
}: ExecutiveAssistantPanelProps) {
  const [userName, setUserName] = useState("there");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [conversations, setConversations] = useState<AssistantConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([WELCOME]);
  const [renameValue, setRenameValue] = useState("");
  const [lastExplanation, setLastExplanation] = useState<AiExplanation | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: AssistantPendingActionKind;
    label: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const context = useMemo(
    () => resolveExecutiveAssistantContext(activeView, mode),
    [activeView, mode],
  );
  const greeting = useMemo(() => greetingForNow(userName), [userName]);
  const isPage = variant === "page" || variant === "home";
  const suggested = isPage ? HOME_SUGGESTED_ACTIONS : context.suggestedPrompts;
  const selectionLabel = [
    selection?.clientName ? `Client · ${selection.clientName}` : null,
    selection?.projectName ? `Project · ${selection.projectName}` : null,
    selection?.employeeName ? `Employee · ${selection.employeeName}` : null,
    selection?.contractName ? `Contract · ${selection.contractName}` : null,
    selection?.fileName ? `File · ${selection.fileName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const refreshConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/executive-assistant/conversations", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        conversations?: AssistantConversationRecord[];
      };
      setConversations(data.conversations ?? []);
    } catch {
      // persistence optional until migration applied
    }
  }, []);

  useEffect(() => {
    void fetch("/api/auth/whoami", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { displayName?: string };
        const first = data.displayName?.trim().split(/\s+/)[0];
        if (first) setUserName(first);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

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

  function showNotice(label: string) {
    setNotice(label);
    window.setTimeout(() => setNotice(null), 2400);
  }

  function startNewConversation() {
    abortRef.current?.abort();
    setActiveConversationId(null);
    setMessages([WELCOME]);
    setMessage("");
    setRenameValue("");
    showNotice("Started a new conversation");
  }

  function clearConversation() {
    setMessages([WELCOME]);
    setMessage("");
    showNotice("Conversation cleared");
  }

  async function openConversation(conversation: AssistantConversationRecord) {
    try {
      const response = await fetch(
        `/api/executive-assistant/conversations/${conversation.id}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        setActiveConversationId(conversation.id);
        setMessages(conversation.messages.length > 0 ? conversation.messages : [WELCOME]);
        return;
      }
      const data = (await response.json()) as { conversation?: AssistantConversationRecord };
      const loaded = data.conversation ?? conversation;
      setActiveConversationId(loaded.id);
      setMessages(loaded.messages.length > 0 ? loaded.messages : [WELCOME]);
      setRenameValue(loaded.title);
    } catch {
      setActiveConversationId(conversation.id);
      setMessages(conversation.messages.length > 0 ? conversation.messages : [WELCOME]);
    }
  }

  async function renameActiveConversation() {
    if (!activeConversationId || !renameValue.trim()) return;
    const response = await fetch(
      `/api/executive-assistant/conversations/${activeConversationId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() }),
      },
    );
    if (response.ok) {
      showNotice("Conversation renamed");
      await refreshConversations();
    } else {
      showNotice("Could not rename conversation");
    }
  }

  async function deleteActiveConversation() {
    if (!activeConversationId) {
      clearConversation();
      return;
    }
    const response = await fetch(
      `/api/executive-assistant/conversations/${activeConversationId}`,
      { method: "DELETE" },
    );
    if (response.ok) {
      startNewConversation();
      await refreshConversations();
      showNotice("Conversation deleted");
    } else {
      showNotice("Could not delete conversation");
    }
  }

  async function handleSend(event?: React.FormEvent, overrideText?: string) {
    event?.preventDefault();
    const trimmed = (overrideText ?? message).trim();
    if (!trimmed || sending) return;

    const userMessage: AssistantChatMessage = {
      id: `local_${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [
      ...messages.filter((entry) => entry.id !== "welcome" || entry.content.trim().length > 0),
      userMessage,
    ];
    setMessages(nextMessages);
    setMessage("");
    setSending(true);

    const assistantId = `assistant_${Date.now()}`;
    setMessages((current) => [
      ...current,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/executive-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          conversationId: activeConversationId,
          activeView,
          selection,
          roleView,
          stream: true,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Assistant failed (${response.status})`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        await readSseStream(response, (event) => {
          if (event.type === "meta" && event.conversationId !== "pending") {
            setActiveConversationId(event.conversationId);
          }
          if (event.type === "tool_result") {
            applyGuidedToolResult(event.result);
            applyProactiveToolResult(event.name, event.result);
            if (
              event.result &&
              typeof event.result === "object" &&
              "explanation" in event.result &&
              (event.result as { explanation?: AiExplanation }).explanation
            ) {
              setLastExplanation(
                (event.result as { explanation: AiExplanation }).explanation,
              );
            }
          }
          if (event.type === "delta") {
            setMessages((current) =>
              current.map((entry) =>
                entry.id === assistantId
                  ? { ...entry, content: `${entry.content}${event.text}` }
                  : entry,
              ),
            );
          }
          if (event.type === "done") {
            setActiveConversationId(event.conversationId);
            setMessages((current) =>
              current.map((entry) =>
                entry.id === assistantId ? { ...event.message, id: assistantId } : entry,
              ),
            );
          }
          if (event.type === "error") {
            throw new Error(event.error);
          }
        });
      } else {
        const data = (await response.json()) as {
          reply?: string;
          conversationId?: string;
          error?: string;
        };
        if (data.error) throw new Error(data.error);
        if (data.conversationId) setActiveConversationId(data.conversationId);
        setMessages((current) =>
          current.map((entry) =>
            entry.id === assistantId
              ? {
                  ...entry,
                  content: data.reply?.trim() || "I could not generate a reply just now.",
                }
              : entry,
          ),
        );
      }

      await refreshConversations();
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      const detail = error instanceof Error ? error.message : "Assistant unavailable";
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantId
            ? {
                ...entry,
                content: `I could not complete that request (${detail}). No business data was invented.`,
              }
            : entry,
        ),
      );
      showNotice(detail);
    } finally {
      setSending(false);
    }
  }

  const panelBody = (
    <div
      data-ai-target="ai-assistant"
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        isPage
          ? "rounded-2xl border border-white/12 bg-[#0c1628]"
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
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            AI Operating Assistant · Online
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
            aria-label="Assistant settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={clearConversation}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
            aria-label="Clear conversation"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={startNewConversation}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[0.08]"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          {variant === "drawer" ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
              aria-label="Close Executive Assistant"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {showSettings ? (
          <section className="rounded-xl border border-white/10 bg-[#0b1524]/60 p-3">
            <SectionLabel>Settings</SectionLabel>
            <p className="mt-2 text-xs text-white/55">
              Conversations stay with you across modules. Rename or clear a thread anytime.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  placeholder="Rename conversation"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#07111f] px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-400/40"
                />
                <button
                  type="button"
                  onClick={() => void renameActiveConversation()}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2 text-[11px] text-white/70 hover:bg-white/[0.06]"
                >
                  <Pencil className="h-3 w-3" />
                  Save
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ChipButton label="New conversation" onClick={startNewConversation} />
                <ChipButton label="Clear chat" onClick={clearConversation} />
                <ChipButton
                  label="Delete conversation"
                  onClick={() => void deleteActiveConversation()}
                />
              </div>
            </div>
          </section>
        ) : null}

        <section>
          <SectionLabel>Current context</SectionLabel>
          <p className="mt-2 text-sm text-white/70">{greeting}</p>
          <p className="mt-1 text-base font-semibold text-white">Viewing · {context.label}</p>
          {selectionLabel ? (
            <p className="mt-1 text-xs text-sky-200/80">{selectionLabel}</p>
          ) : null}
        </section>

        <section data-ai-target="ea-conversation">
          <SectionLabel>Conversation</SectionLabel>
          <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-[#0b1524]/60 p-3">
            {messages.length === 0 ? (
              <div className="px-2 py-6 text-center">
                <FileText className="mx-auto h-5 w-5 text-white/25" />
                <p className="mt-3 text-sm text-white/45">Ask anything about your business…</p>
              </div>
            ) : (
              messages.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm leading-relaxed",
                    entry.role === "assistant"
                      ? "border border-white/10 bg-white/[0.03] text-white/80"
                      : "border border-sky-400/20 bg-sky-500/10 text-sky-50",
                  )}
                >
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/35">
                    {entry.role === "assistant" ? "Assistant" : "You"}
                  </p>
                  <p className="whitespace-pre-wrap">
                    {entry.content || (sending ? "…" : "")}
                  </p>
                  {entry.role === "assistant" &&
                  entry.id !== "welcome" &&
                  entry.content.trim() &&
                  !sending ? (
                    <div className="mt-2 space-y-2">
                      {lastExplanation && entry.id === messages[messages.length - 1]?.id ? (
                        <ExplanationPanel
                          compact
                          explanation={lastExplanation}
                          feedbackTargetId={entry.id}
                          feedbackTargetType="message"
                          contextView={activeView}
                        />
                      ) : (
                        <AssistantFeedbackButtons
                          targetId={entry.id}
                          targetType="message"
                          contextView={activeView}
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              ))
            )}
            {sending ? (
              <p className="inline-flex items-center gap-2 text-[11px] text-white/45">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </p>
            ) : null}
          </div>
          {notice ? (
            <p className="mt-2 rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
              {notice}
            </p>
          ) : null}
          {pendingConfirm ? (
            <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">
                Confirm action
              </p>
              <p className="mt-1 text-xs text-white/75">
                Recommended: <span className="font-semibold">{pendingConfirm.label}</span>. Nothing
                runs until you confirm.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const action = proposeAction(pendingConfirm.kind);
                      const result = await executeConfirmedAction(action);
                      showNotice(result.message);
                      setPendingConfirm(null);
                    })();
                  }}
                  className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-amber-50"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setPendingConfirm(null)}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <SectionLabel>Actions</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              data-ai-target="ea-tour"
              onClick={() => {
                requestShowMeAround(activeView || "home");
                showNotice("Starting walkthrough");
              }}
              className="rounded-lg border border-sky-400/35 bg-sky-500/15 px-2.5 py-1.5 text-left text-[11px] font-semibold text-sky-100 transition-colors hover:border-sky-400/50 hover:bg-sky-500/25"
            >
              30-second tour
            </button>
            <ChipButton
              label="Daily brief"
              onClick={() => void handleSend(undefined, "Give me today's Daily Executive Brief.")}
            />
            <ChipButton
              label="Business health"
              onClick={() => void handleSend(undefined, "What is our Business Health Score?")}
            />
            <ChipButton
              label="Top risks"
              onClick={() => void handleSend(undefined, "What needs my attention today?")}
            />
            <ChipButton
              label={showMoreActions ? "Less" : "More"}
              onClick={() => setShowMoreActions((value) => !value)}
            />
          </div>
          {showMoreActions ? (
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/8 pt-2">
              {suggested.slice(0, 4).map((action) => (
                <ChipButton
                  key={action}
                  label={action}
                  onClick={() => {
                    if (handleExecutiveActionHref(action, activeView || "home")) return;
                    if (handleGuidedHref(action, activeView || "home")) return;
                    void handleSend(undefined, action);
                  }}
                />
              ))}
              <ChipButton
                label="Onboard a client"
                onClick={() => {
                  startWorkflowGuide("onboard_client", 0);
                  void handleSend(
                    undefined,
                    "I need to onboard a client. Guide me through the workflow.",
                  );
                }}
              />
              <ChipButton
                label="Create a project"
                onClick={() => {
                  startWorkflowGuide("create_project", 0);
                  void handleSend(
                    undefined,
                    "I need to create a project. Guide me through the workflow.",
                  );
                }}
              />
              {!isPage
                ? GENERATE_ACTIONS.slice(0, 3).map((action) => (
                    <ChipButton
                      key={action}
                      label={action}
                      onClick={() => void handleSend(undefined, action)}
                    />
                  ))
                : null}
            </div>
          ) : null}
        </section>

        {conversations.length > 0 ? (
          <section>
            <SectionLabel>Recent</SectionLabel>
            <ul className="mt-2 space-y-1">
              {conversations.slice(0, 5).map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => void openConversation(conversation)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-colors",
                      activeConversationId === conversation.id
                        ? "border-sky-400/35 bg-sky-500/10 text-sky-50"
                        : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/[0.05]",
                    )}
                  >
                    <span className="min-w-0 truncate font-medium">{conversation.title}</span>
                    <span className="shrink-0 text-white/35">
                      {new Date(conversation.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <form
        data-ai-target="ea-chat"
        className="shrink-0 border-t border-white/10 p-4"
        onSubmit={(event) => void handleSend(event)}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={2}
            placeholder="Ask the Operating Assistant…"
            className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-sky-400/40"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-100 transition-colors hover:bg-sky-500/25 disabled:opacity-40"
            aria-label="Send message"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );

  if (variant === "page") {
    return <div className="flex min-h-[calc(100dvh-8rem)] flex-col">{panelBody}</div>;
  }

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
          "relative flex h-full w-full max-w-[420px] border-l border-white/10 transition-transform duration-300 ease-out",
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

export function ExecutiveAssistantFloatingButton({
  onClick,
  hidden = false,
}: {
  onClick: () => void;
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <button
      type="button"
      data-ai-target="ai-assistant"
      onClick={onClick}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-[55] inline-flex h-14 w-14 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500 text-white transition hover:bg-sky-400"
      aria-label="Open AI Assistant"
      title="AI Assistant"
    >
      <Sparkles className="h-6 w-6" />
    </button>
  );
}

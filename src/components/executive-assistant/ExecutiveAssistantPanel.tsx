"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  AssistantChatMessage,
  AssistantConversationRecord,
  AssistantMessageArtifact,
  AssistantPageSelection,
  AssistantStreamEvent,
} from "@/lib/ai-operating-assistant/types";
import type { AssistantFollowUpAction } from "@/lib/ai-operating-assistant/tool-result";
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
import { PlanViewer } from "@/components/executive-assistant/PlanViewer";
import { ExecutionCardsList } from "@/components/executive-assistant/execution-cards";
import type { EaCardAction, EaExecutionCard } from "@/lib/ai-operating-assistant/execution-cards";
import { actionConfirmationToPlanViewer } from "@/lib/ai-operating-assistant/actions/planning/summaries";
import type { PlanViewerModel } from "@/lib/ai-operating-assistant/actions/planning/types";
import type { ActionConfirmationView } from "@/components/executive-assistant/ActionConfirmationCard";
import { requestShowMeAround } from "@/components/executive-assistant/GuidedLearningProvider";
import {
  HOME_SUGGESTED_ACTIONS,
  resolveExecutiveAssistantContext,
  type ExecutiveAssistantVariant,
} from "@/lib/executive-assistant-ui";
import { cn } from "@/lib/utils";
import {
  fetchCachedJson,
  invalidateCachedJson,
  PLATFORM_CACHE_KEYS,
} from "@/lib/platform-fetch-cache";
import {
  Download,
  Loader2,
  Mail,
  Mic,
  Pencil,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { VoiceIntroModal } from "@/components/executive-assistant/voice/VoiceIntroModal";
import { VoiceSettingsPopover } from "@/components/executive-assistant/voice/VoiceSettingsPopover";
import { VoiceWaveform } from "@/components/executive-assistant/voice/VoiceWaveform";
import { useExecutiveVoice } from "@/components/executive-assistant/voice/useExecutiveVoice";
import { voiceStatusLabel } from "@/lib/executive-assistant-voice";

export type ExecutiveAssistantPanelProps = {
  variant: ExecutiveAssistantVariant;
  activeView?: string | null;
  mode?: "survey" | "internal";
  selection?: AssistantPageSelection;
  roleView?: string | null;
  open?: boolean;
  onClose?: () => void;
  className?: string;
  /** Hide the conversations sidebar (used by Operating Centre left rail). */
  hideSidebar?: boolean;
  /** Quieter chrome for embedding under an executive briefing. */
  embedded?: boolean;
  /** External prompt to send once (quick prompts / suggested actions). */
  seedPrompt?: string | null;
  onSeedConsumed?: () => void;
};

const WELCOME: AssistantChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Ready when you are. Ask me to brief you, generate a report, or take an action.",
  createdAt: new Date().toISOString(),
};

const SAVED_CONVERSATION_IDS_KEY = "unit311.ea.savedConversationIds";

function readSavedConversationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SAVED_CONVERSATION_IDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function writeSavedConversationIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_CONVERSATION_IDS_KEY, JSON.stringify([...ids]));
}

function markConversationSavedLocally(conversationId: string) {
  const ids = readSavedConversationIds();
  ids.add(conversationId);
  writeSavedConversationIds(ids);
}

function unmarkConversationSavedLocally(conversationId: string) {
  const ids = readSavedConversationIds();
  ids.delete(conversationId);
  writeSavedConversationIds(ids);
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

function formatConversationDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ActionButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold text-sky-50 transition-colors hover:border-sky-400/50 hover:bg-sky-500/25"
    >
      {icon}
      {label}
    </button>
  );
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
  hideSidebar = false,
  embedded = false,
  seedPrompt = null,
  onSeedConsumed,
}: ExecutiveAssistantPanelProps) {
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<AssistantConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() =>
    embedded ? [] : [WELCOME],
  );
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [planViewer, setPlanViewer] = useState<PlanViewerModel | null>(null);
  /** Keep raw confirmation (with step inputs) for approve-time plan rehydration. */
  const [actionConfirmation, setActionConfirmation] = useState<ActionConfirmationView | null>(
    null,
  );
  const [actionConfirmBusy, setActionConfirmBusy] = useState(false);
  const [eaCorrelationId, setEaCorrelationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const handleSendRef = useRef<
    (
      event?: React.FormEvent,
      overrideText?: string,
      opts?: { skipSpeak?: boolean },
    ) => Promise<string | null>
  >(async () => null);

  const voice = useExecutiveVoice({
    enabled: true,
    userId,
    onSubmitTranscript: async (text) => {
      return handleSendRef.current(undefined, text, { skipSpeak: true });
    },
  });

  const context = useMemo(
    () => resolveExecutiveAssistantContext(activeView, mode),
    [activeView, mode],
  );
  const isPage = variant === "page" || variant === "home";
  const suggested = isPage ? HOME_SUGGESTED_ACTIONS : context.suggestedPrompts;

  const refreshConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/executive-assistant/conversations", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        conversations?: AssistantConversationRecord[];
      };
      const localSavedIds = readSavedConversationIds();
      const listed = (data.conversations ?? []).filter(
        (conversation) => conversation.isSaved || localSavedIds.has(conversation.id),
      );
      setConversations(listed);
    } catch {
      // persistence optional until migration applied
    }
  }, []);

  const assistantActive = variant !== "drawer" || open;
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!assistantActive || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void refreshConversations();
    void (async () => {
      try {
        const data = await fetchCachedJson<{ userId?: string; username?: string }>(
          PLATFORM_CACHE_KEYS.whoami,
          "/api/auth/whoami",
          { ttlMs: 120_000 },
        );
        setUserId(data.userId || data.username || null);
      } catch {
        // voice prefs fall back to anon
      }
    })();
  }, [assistantActive, refreshConversations]);

  useEffect(() => {
    if (variant !== "drawer" || !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (voice.status === "listening") {
        event.preventDefault();
        voice.cancelListening();
        return;
      }
      onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [variant, open, onClose, voice.status, voice.cancelListening]);

  useEffect(() => {
    if (variant !== "drawer" || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [variant, open]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function showNotice(label: string) {
    setNotice(label);
    window.setTimeout(() => setNotice(null), 2400);
  }

  function startNewConversation() {
    abortRef.current?.abort();
    setActiveConversationId(null);
    setMessages(embedded ? [] : [WELCOME]);
    setMessage("");
    setRenameId(null);
    showNotice("New chat ready");
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
    } catch {
      setActiveConversationId(conversation.id);
      setMessages(conversation.messages.length > 0 ? conversation.messages : [WELCOME]);
    }
  }

  async function saveChat() {
    const persistable = messages.filter(
      (entry) => entry.id !== "welcome" && entry.content.trim().length > 0,
    );
    if (persistable.length === 0) {
      showNotice("Send a message before saving");
      return;
    }

    const persistedId =
      activeConversationId &&
      !activeConversationId.startsWith("local_") &&
      activeConversationId !== "pending"
        ? activeConversationId
        : null;

    try {
      if (persistedId) {
        const response = await fetch(
          `/api/executive-assistant/conversations/${persistedId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: persistable,
              title: persistable.find((entry) => entry.role === "user")?.content.slice(0, 72),
            }),
          },
        );
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          conversation?: AssistantConversationRecord;
        } | null;
        if (!response.ok) {
          throw new Error(data?.error ?? `Save failed (${response.status})`);
        }
        if (persistedId) markConversationSavedLocally(persistedId);
      } else {
        const response = await fetch("/api/executive-assistant/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: persistable.find((entry) => entry.role === "user")?.content.slice(0, 72),
            messages: persistable,
          }),
        });
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          conversation?: AssistantConversationRecord;
        } | null;
        if (!response.ok) {
          throw new Error(data?.error ?? `Save failed (${response.status})`);
        }
        if (data?.conversation?.id) {
          setActiveConversationId(data.conversation.id);
          markConversationSavedLocally(data.conversation.id);
        }
      }
      await refreshConversations();
      showNotice("Chat saved");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not save chat");
    }
  }

  async function renameConversation(conversationId: string) {
    if (!renameValue.trim()) return;
    const response = await fetch(`/api/executive-assistant/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameValue.trim() }),
    });
    if (response.ok) {
      setRenameId(null);
      await refreshConversations();
      showNotice("Conversation renamed");
    } else {
      showNotice("Could not rename");
    }
  }

  async function deleteConversation(conversationId: string) {
    const confirmed = window.confirm("Delete this saved conversation? This cannot be undone.");
    if (!confirmed) return;
    const response = await fetch(`/api/executive-assistant/conversations/${conversationId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      unmarkConversationSavedLocally(conversationId);
      if (activeConversationId === conversationId) startNewConversation();
      await refreshConversations();
      showNotice("Conversation deleted");
    } else {
      showNotice("Could not delete");
    }
  }

  function openArtifactBlob(artifact: AssistantMessageArtifact, disposition: "inline" | "attachment") {
    if (artifact.contentBase64) {
      const binary = atob(artifact.contentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (disposition === "attachment") {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = artifact.filename;
        anchor.click();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    window.open(
      disposition === "attachment" ? artifact.downloadUrl : artifact.openUrl,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function runFollowUp(action: AssistantFollowUpAction) {
    if (action.kind === "download" || action.kind === "open") {
      const artifact = messages
        .flatMap((entry) => entry.artifacts ?? [])
        .find((entry) => entry.id === action.artifactId);
      if (artifact) {
        openArtifactBlob(artifact, action.kind === "download" ? "attachment" : "inline");
        return;
      }
      if (action.href) {
        window.open(action.href, "_blank", "noopener,noreferrer");
      }
      return;
    }

    if (action.href && action.kind === "navigate") {
      if (handleExecutiveActionHref(action.href, activeView || "home")) return;
      if (handleGuidedHref(action.href, activeView || "home")) return;
      window.location.href = action.href;
      return;
    }

    if (action.kind === "email_artifact") {
      const artifactId = action.artifactId;
      const prompt = artifactId
        ? `Email artifact ${artifactId} to the Board.`
        : "Email it to the Board.";
      void handleSend(undefined, prompt);
      return;
    }

    if (
      action.kind === "generate" ||
      /^generate\s*pdf$/i.test(action.label) ||
      action.actionId === "generateEmployeeListPdf" ||
      action.actionId === "generateReportPdf" ||
      action.actionId === "generateFinancialReportPdf"
    ) {
      void handleSend(undefined, action.label || "Generate PDF");
      return;
    }

    if (action.kind === "confirm_action" && action.actionId) {
      // Single path only: load Action Framework plan into Plan Viewer.
      // Never open a second Confirm UI; never call executeConfirmedAction.
      if (!action.actionId.startsWith("plan_")) {
        showNotice("Open the Plan Viewer and Approve to execute this action.");
        return;
      }
      void (async () => {
        try {
          const response = await fetch(
            `/api/executive-assistant/actions/plans/${action.actionId}`,
            { cache: "no-store" },
          );
          if (!response.ok) throw new Error("Could not load action plan");
          const data = (await response.json()) as {
            confirmation?: ActionConfirmationView;
          };
          if (data.confirmation) {
            setActionConfirmation(data.confirmation);
            setPlanViewer(actionConfirmationToPlanViewer(data.confirmation));
          }
        } catch (error) {
          showNotice(error instanceof Error ? error.message : "Could not load plan");
        }
      })();
      return;
    }

    void handleSend(undefined, action.label);
  }

  async function handleSend(
    event?: React.FormEvent,
    overrideText?: string,
    opts?: { skipSpeak?: boolean },
  ): Promise<string | null> {
    event?.preventDefault();
    const trimmed = (overrideText ?? message).trim();
    if (!trimmed || sending) return null;

    // Interrupt TTS if user sends while assistant is speaking
    if (voice.status === "speaking") {
      voice.stopSpeaking();
    }

    const priorMessages = messages.filter(
      (entry) =>
        entry.id !== "welcome" &&
        (entry.role === "user" || entry.role === "assistant") &&
        entry.content.trim().length > 0,
    );

    const userMessage: AssistantChatMessage = {
      id: `local_${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages([...priorMessages, userMessage]);
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

    let finalReply: string | null = null;
    const correlationId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `ea_${crypto.randomUUID()}`
        : `ea_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    setEaCorrelationId(correlationId);
    console.info("[EA] Chat request received");
    console.info(`- correlationId: ${correlationId}`);
    console.info(`- conversationId: ${activeConversationId}`);
    console.info(`- user message: ${trimmed}`);

    try {
      const response = await fetch("/api/executive-assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ea-correlation-id": correlationId,
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          conversationId: activeConversationId,
          messages: priorMessages,
          activeView,
          selection,
          roleView,
          stream: true,
          correlationId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Assistant failed (${response.status})`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        await readSseStream(response, (event) => {
          if (event.type === "meta") {
            if (event.conversationId !== "pending") {
              setActiveConversationId(event.conversationId);
            }
            if (typeof event.correlationId === "string" && event.correlationId) {
              setEaCorrelationId(event.correlationId);
            }
          }
          if (event.type === "tool_result") {
            applyGuidedToolResult(event.result);
            applyProactiveToolResult(event.name, event.result);
            if (event.name === "proposeBusinessActionPlan" && event.result) {
              const result = event.result as {
                items?: Array<{ confirmation?: ActionConfirmationView; blocked?: boolean }>;
                summary?: { requiresConfirmation?: boolean; blocked?: boolean };
              };
              const confirmation = result.items?.[0]?.confirmation;
              if (confirmation) {
                if (confirmation.correlationId) setEaCorrelationId(confirmation.correlationId);
                setActionConfirmation(confirmation);
                setPlanViewer(actionConfirmationToPlanViewer(confirmation));
              }
            }
            if (event.name === "planBusinessGoal" && event.result) {
              const result = event.result as {
                items?: Array<{ confirmation?: ActionConfirmationView }>;
              };
              const confirmation = result.items?.[0]?.confirmation;
              if (confirmation) {
                if (confirmation.correlationId) setEaCorrelationId(confirmation.correlationId);
                setActionConfirmation(confirmation);
                setPlanViewer(actionConfirmationToPlanViewer(confirmation));
              }
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
            if (typeof event.correlationId === "string" && event.correlationId) {
              setEaCorrelationId(event.correlationId);
            }
            setActiveConversationId(event.conversationId);
            finalReply = event.message.content?.trim() || null;
            setMessages((current) =>
              current.map((entry) =>
                entry.id === assistantId
                  ? {
                      ...event.message,
                      id: assistantId,
                      followUpActions: event.message.followUpActions,
                      artifacts: event.message.artifacts,
                      executionCards: event.message.executionCards,
                    }
                  : entry,
              ),
            );
          }
          if (event.type === "error") {
            console.error("[EA] Chat stream error");
            console.error(`- correlationId: ${correlationId}`);
            console.error(`- error: ${event.error}`);
            console.error(`- stack: ${"stack" in event ? event.stack : "(none)"}`);
            throw new Error(
              "stack" in event && event.stack
                ? `${event.error}\n${event.stack}`
                : event.error,
            );
          }
        });
      } else {
        const data = (await response.json()) as {
          reply?: string;
          conversationId?: string;
          error?: string;
          stack?: string | null;
          correlationId?: string;
        };
        if (data.correlationId) setEaCorrelationId(data.correlationId);
        if (data.error) {
          throw new Error(data.stack ? `${data.error}\n${data.stack}` : data.error);
        }
        if (data.conversationId) setActiveConversationId(data.conversationId);
        finalReply = data.reply?.trim() || "I could not complete that just now.";
        setMessages((current) =>
          current.map((entry) =>
            entry.id === assistantId
              ? {
                  ...entry,
                  content: finalReply || "I could not complete that just now.",
                }
              : entry,
          ),
        );
      }

      if (finalReply && voice.prefs.voiceEnabled && !opts?.skipSpeak) {
        void voice.speakText(finalReply);
      }

      return finalReply;
    } catch (error) {
      if ((error as Error).name === "AbortError") return null;
      const detail = error instanceof Error ? error.message : "Assistant unavailable";
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantId
            ? {
                ...entry,
                content: `I could not complete that request. ${detail}`,
              }
            : entry,
        ),
      );
      showNotice(detail);
      return null;
    } finally {
      setSending(false);
    }
  }

  handleSendRef.current = handleSend;

  function handleExecutionCardAction(
    card: EaExecutionCard,
    action: EaCardAction,
    values?: Record<string, unknown>,
  ) {
    if (action.intent === "submit_form") {
      const actionName = card.title;
      const lines = Object.entries(values ?? {})
        .filter(([, value]) => value != null && String(value).trim())
        .map(([key, value]) => {
          const label = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (c) => c.toUpperCase())
            .trim();
          return `${label}: ${String(value).trim()}`;
        });
      const prompt =
        lines.length > 0
          ? `${actionName}\n${lines.join("\n")}`
          : actionName;
      void handleSend(undefined, prompt);
      return;
    }

    if (
      action.intent === "approve_plan" ||
      action.intent === "confirm_high_risk" ||
      action.intent === "reject_plan"
    ) {
      showNotice(
        action.intent === "reject_plan"
          ? "Use Reject on the Plan Viewer to cancel."
          : "Use Approve on the Plan Viewer to execute.",
      );
      return;
    }

    if (action.intent === "generate" && action.actionId) {
      void handleSend(undefined, action.label);
    }
  }

  useEffect(() => {
    if (!seedPrompt?.trim()) return;
    const text = seedPrompt.trim();
    onSeedConsumed?.();
    void handleSendRef.current(undefined, text);
  }, [seedPrompt, onSeedConsumed]);

  function renderArtifacts(artifacts: AssistantMessageArtifact[] | undefined) {
    if (!artifacts?.length) return null;
    return (
      <div className="mt-2 space-y-2">
        {artifacts.map((artifact) => (
          <div
            key={artifact.id}
            className="rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2.5"
          >
            <p className="text-xs font-semibold text-sky-50">{artifact.filename}</p>
            <p className="mt-0.5 text-[10px] text-sky-100/60">Generated successfully.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <ActionButton
                label="Open"
                onClick={() => openArtifactBlob(artifact, "inline")}
              />
              <ActionButton
                label="Download"
                icon={<Download className="h-3 w-3" />}
                onClick={() => openArtifactBlob(artifact, "attachment")}
              />
              <ActionButton
                label="Email"
                icon={<Mail className="h-3 w-3" />}
                onClick={() =>
                  void handleSend(
                    undefined,
                    `Email artifact ${artifact.id} to the Board.`,
                  )
                }
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const sidebar = (
    <aside className="flex w-[13.5rem] shrink-0 flex-col border-r border-white/10 bg-[#060e1a]">
      <div className="border-b border-white/10 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Conversations
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-[11px] leading-relaxed text-white/35">
            Saved chats appear here. Press Save Chat to keep a conversation.
          </p>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group relative rounded-xl border px-2.5 py-2 transition-colors",
                activeConversationId === conversation.id
                  ? "border-sky-400/35 bg-sky-500/10"
                  : "border-transparent hover:border-white/10 hover:bg-white/[0.04]",
              )}
            >
              {renameId === conversation.id ? (
                <form
                  className="space-y-1.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void renameConversation(conversation.id);
                  }}
                >
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    className="w-full rounded-md border border-white/15 bg-[#0b1524] px-2 py-1 text-[11px] text-white outline-none"
                  />
                  <div className="flex gap-1">
                    <button
                      type="submit"
                      className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-100"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenameId(null)}
                      className="rounded-md px-2 py-0.5 text-[10px] text-white/50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void openConversation(conversation)}
                    className="w-full pr-14 text-left"
                  >
                    <p className="truncate text-[12px] font-medium text-white/90">
                      {conversation.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/35">
                      {formatConversationDate(conversation.createdAt)}
                      {" · "}
                      Updated {formatConversationDate(conversation.updatedAt)}
                    </p>
                  </button>
                  <div className="absolute right-1 top-1.5 flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Rename conversation"
                      title="Rename"
                      onClick={() => {
                        setRenameId(conversation.id);
                        setRenameValue(conversation.title);
                      }}
                      className="rounded-md p-1 text-white/35 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete conversation"
                      title="Delete"
                      onClick={() => void deleteConversation(conversation.id)}
                      className="rounded-md p-1 text-rose-300/80 transition-colors hover:bg-rose-500/15 hover:text-rose-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );

  const panelBody = (
    <div
      data-ai-target="ai-assistant"
      className={cn(
        "flex h-full min-h-0 overflow-hidden",
        isPage && !embedded
          ? "rounded-2xl border border-white/12 bg-[#0c1628]"
          : embedded
            ? "rounded-xl border border-white/10 bg-[#0a1422]"
            : "bg-[#07111f]",
        className,
      )}
    >
      {hideSidebar ? null : sidebar}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "flex shrink-0 items-start justify-between gap-3 border-b border-white/10",
            embedded ? "px-3 py-2.5 sm:px-4" : "px-4 py-3.5 sm:px-5",
          )}
        >
          <div>
            <h2
              className={cn(
                "font-semibold tracking-tight text-white",
                embedded ? "text-sm" : "text-base",
              )}
            >
              {embedded ? "Conversation" : "AI Executive Assistant"}
            </h2>
            {!embedded ? (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-300/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-white/45">
                Context-aware · decisions and follow-ups
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startNewConversation}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-semibold text-white/75 hover:bg-white/[0.08] hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              New Chat
            </button>
            <button
              type="button"
              onClick={() => void saveChat()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/10 px-2.5 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/20"
            >
              <Save className="h-3.5 w-3.5" />
              Save Chat
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

        <div ref={threadRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {messages.length === 0 && embedded && !sending ? (
            <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3.5 py-3 text-[12px] leading-relaxed text-white/40">
              Start with a quick prompt, or type below — I already have live business context.
            </p>
          ) : null}
          {messages.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                entry.role === "assistant"
                  ? "border border-white/10 bg-white/[0.03] text-white/85"
                  : "ml-8 border border-sky-400/20 bg-sky-500/10 text-sky-50",
              )}
            >
              {entry.artifacts?.length || entry.executionCards?.length ? null : (
                <p className="whitespace-pre-wrap">
                  {entry.content || (sending ? "…" : "")}
                </p>
              )}
              {entry.role === "assistant" && entry.executionCards?.length ? (
                <div className="space-y-2.5">
                  {entry.content?.trim() ? (
                    <p className="text-[12px] text-white/70">{entry.content}</p>
                  ) : null}
                  <ExecutionCardsList
                    cards={entry.executionCards}
                    busy={sending || actionConfirmBusy}
                    handlers={{
                      onCardAction: handleExecutionCardAction,
                      onFollowUp: (followUp) => void runFollowUp(followUp),
                    }}
                  />
                </div>
              ) : null}
              {entry.role === "assistant" ? renderArtifacts(entry.artifacts) : null}
              {entry.role === "assistant" &&
              entry.followUpActions &&
              entry.followUpActions.length > 0 &&
              !entry.artifacts?.length &&
              !entry.executionCards?.some((card) => (card.nextActions?.length ?? 0) > 0) ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {entry.followUpActions
                    .filter(
                      (action) =>
                        !/excel|email summary|generate report|generate pdf/i.test(
                          action.label,
                        ),
                    )
                    .map((action) => (
                      <ActionButton
                        key={action.id}
                        label={action.label}
                        onClick={() => void runFollowUp(action)}
                      />
                    ))}
                </div>
              ) : null}
            </div>
          ))}
          {sending ? (
            <p className="inline-flex items-center gap-2 text-[11px] text-white/45">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Working…
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
              {notice}
            </p>
          ) : null}
          {planViewer ? (
            <PlanViewer
              plan={planViewer}
              busy={actionConfirmBusy}
              onApprove={() => {
                void (async () => {
                  setActionConfirmBusy(true);
                  const correlationId =
                    eaCorrelationId ||
                    actionConfirmation?.correlationId ||
                    planViewer.correlationId ||
                    `ea_approve_${planViewer.planId}`;
                  setEaCorrelationId(correlationId);
                  const requestBody = {
                    confirmed: true,
                    correlationId,
                    activeView,
                    roleView,
                    selection,
                    title: planViewer.title,
                    summary: planViewer.businessImpact,
                    aiRequest: planViewer.goal,
                    steps:
                      actionConfirmation?.actions.map((action) => ({
                        stepId: action.stepId,
                        actionId: action.actionId,
                        name: action.name,
                        module: action.module,
                        input: action.input ?? {},
                        status: action.status,
                      })) ??
                      planViewer.steps.map((step) => ({
                        stepId: step.stepId,
                        actionId: step.actionId,
                        name: step.name,
                        module: step.module,
                        input: step.input ?? {},
                        status: step.status,
                      })),
                  };
                  console.info("[EA] Browser Approve received");
                  console.info(`- correlationId: ${correlationId}`);
                  console.info(`- planId: ${planViewer.planId}`);
                  console.info(`- request body: ${JSON.stringify(requestBody)}`);
                  try {
                    const url = `/api/executive-assistant/actions/plans/${planViewer.planId}`;
                    const response = await fetch(url, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "x-ea-correlation-id": correlationId,
                      },
                      body: JSON.stringify(requestBody),
                    });
                    const data = (await response.json().catch(() => null)) as {
                      error?: string;
                      stack?: string | null;
                      correlationId?: string;
                      summary?: string;
                      outcomeText?: string;
                      followUpActions?: NonNullable<
                        import("@/lib/ai-operating-assistant").AssistantChatMessage["followUpActions"]
                      >;
                      executionCards?: EaExecutionCard[];
                      viewer?: PlanViewerModel;
                      confirmation?: ActionConfirmationView;
                      plan?: {
                        status?: string;
                        steps?: Array<{
                          actionId?: string;
                          status?: string;
                          input?: Record<string, unknown>;
                          result?: {
                            recordId?: string | null;
                            recordLabel?: string | null;
                            message?: string;
                          };
                        }>;
                      };
                    } | null;
                    if (data?.correlationId) setEaCorrelationId(data.correlationId);
                    if (!response.ok) {
                      const detail = data?.stack
                        ? `${data.error ?? `Execute failed (${response.status})`}\n${data.stack}`
                        : data?.error ?? `Execute failed (${response.status})`;
                      console.error("[EA] Browser Approve failed");
                      console.error(`- correlationId: ${correlationId}`);
                      console.error(`- status: ${response.status}`);
                      console.error(`- error: ${data?.error}`);
                      console.error(`- stack: ${data?.stack ?? "(none)"}`);
                      throw new Error(detail);
                    }
                    if (data?.confirmation) {
                      setActionConfirmation(data.confirmation);
                      setPlanViewer(actionConfirmationToPlanViewer(data.confirmation));
                    } else if (data?.viewer) {
                      setPlanViewer(data.viewer);
                    } else {
                      setPlanViewer(null);
                      setActionConfirmation(null);
                    }
                    showNotice(data?.summary?.split("\n")[0] ?? "Plan completed");
                    const outcomeText = data?.outcomeText?.trim() || data?.summary || null;
                    if (outcomeText || data?.executionCards?.length) {
                      setMessages((current) => [
                        ...current,
                        {
                          id: `action_summary_${Date.now()}`,
                          role: "assistant",
                          content: outcomeText || "Action complete.",
                          createdAt: new Date().toISOString(),
                          followUpActions: data?.followUpActions,
                          executionCards: data?.executionCards,
                        },
                      ]);
                    }
                    console.info("[EA] Client cache invalidated");
                    console.info(`- correlationId: ${correlationId}`);
                    console.info(`- cacheKey: ${PLATFORM_CACHE_KEYS.clients}`);
                    invalidateCachedJson(PLATFORM_CACHE_KEYS.clients);
                    console.info("[EA] Directory refresh requested");
                    console.info(`- correlationId: ${correlationId}`);
                    console.info(`- planId: ${planViewer.planId}`);
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("unit311:clients-changed", {
                          detail: {
                            planId: planViewer.planId,
                            correlationId,
                          },
                        }),
                      );
                      window.dispatchEvent(
                        new CustomEvent("unit311:projects-changed", {
                          detail: {
                            planId: planViewer.planId,
                            correlationId,
                          },
                        }),
                      );
                    }
                  } catch (error) {
                    console.error("[EA] EXCEPTION — Browser Approve");
                    console.error(`- correlationId: ${correlationId}`);
                    console.error(
                      `- message: ${error instanceof Error ? error.message : String(error)}`,
                    );
                    console.error(
                      `- stack: ${error instanceof Error ? error.stack ?? "(no stack)" : "(no stack)"}`,
                    );
                    if (error instanceof Error && error.stack) console.error(error.stack);
                    showNotice(error instanceof Error ? error.message : String(error));
                  } finally {
                    setActionConfirmBusy(false);
                  }
                })();
              }}
              onCancel={() => {
                void (async () => {
                  setActionConfirmBusy(true);
                  try {
                    const correlationId =
                      eaCorrelationId ||
                      actionConfirmation?.correlationId ||
                      planViewer.correlationId ||
                      `ea_cancel_${planViewer.planId}`;
                    const url = `/api/executive-assistant/actions/plans/${planViewer.planId}`;
                    await fetch(url, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "x-ea-correlation-id": correlationId,
                      },
                      body: JSON.stringify({
                        confirmed: false,
                        correlationId,
                        activeView,
                        roleView,
                        selection,
                        steps:
                          actionConfirmation?.actions.map((action) => ({
                            stepId: action.stepId,
                            actionId: action.actionId,
                            name: action.name,
                            module: action.module,
                            input: action.input ?? {},
                            status: action.status,
                          })) ??
                          planViewer.steps.map((step) => ({
                            stepId: step.stepId,
                            actionId: step.actionId,
                            name: step.name,
                            module: step.module,
                            input: step.input ?? {},
                            status: step.status,
                          })),
                      }),
                    });
                  } catch (error) {
                    console.error("[EA] EXCEPTION — Browser Cancel");
                    console.error(error instanceof Error ? error.stack : error);
                  } finally {
                    setPlanViewer(null);
                    setActionConfirmation(null);
                    setActionConfirmBusy(false);
                    showNotice("Plan cancelled");
                  }
                })();
              }}
            />
          ) : null}

          {!sending && messages.length <= 1 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <ActionButton
                label="Employee PDF"
                onClick={() => void handleSend(undefined, "Create a PDF of all employees.")}
              />
              <ActionButton
                label="30-second tour"
                onClick={() => {
                  requestShowMeAround(activeView || "home");
                  showNotice("Starting walkthrough");
                }}
              />
              {suggested.slice(0, 2).map((action) => (
                <ActionButton
                  key={action}
                  label={action}
                  onClick={() => {
                    if (handleExecutiveActionHref(action, activeView || "home")) return;
                    if (handleGuidedHref(action, activeView || "home")) return;
                    void handleSend(undefined, action);
                  }}
                />
              ))}
              <ActionButton
                label="Onboard a client"
                onClick={() => {
                  startWorkflowGuide("onboard_client", 0);
                  void handleSend(
                    undefined,
                    "I need to onboard a client. Guide me through the workflow.",
                  );
                }}
              />
            </div>
          ) : null}
        </div>

        <form
          data-ai-target="ea-chat"
          className="shrink-0 border-t border-white/10 p-4"
          onSubmit={(event) => void handleSend(event)}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  voice.status === "listening"
                    ? "bg-sky-400 animate-pulse"
                    : voice.status === "processing" || voice.status === "thinking"
                      ? "bg-emerald-400"
                      : voice.status === "speaking"
                        ? "bg-sky-300"
                        : "bg-white/30",
                )}
              />
              <span className="text-[10px] font-medium text-white/55">
                {sending && voice.status === "idle"
                  ? "Thinking..."
                  : voiceStatusLabel(voice.status)}
              </span>
              {voice.status === "listening" ? <VoiceWaveform active /> : null}
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70 hover:bg-white/[0.05]">
                <input
                  type="checkbox"
                  checked={voice.prefs.voiceEnabled}
                  onChange={(event) =>
                    voice.setPrefs({
                      ...voice.prefs,
                      voiceEnabled: event.target.checked,
                    })
                  }
                  className="h-3.5 w-3.5 rounded border-white/25 bg-transparent accent-sky-400"
                />
                Voice {voice.prefs.voiceEnabled ? "On" : "Off"}
              </label>
              <VoiceSettingsPopover
                open={voice.settingsOpen}
                onOpenChange={voice.setSettingsOpen}
                prefs={voice.prefs}
                onChange={voice.setPrefs}
              />
            </div>
          </div>

          {voice.micError ? (
            <div className="mb-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2">
              <p className="text-[11px] text-amber-50/90">{voice.micError}</p>
              <button
                type="button"
                onClick={() => {
                  voice.setMicError(null);
                  voice.requestStartListening();
                }}
                className="mt-1.5 rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-50"
              >
                Retry
              </button>
            </div>
          ) : null}

          {voice.liveTranscript ? (
            <p className="mb-2 text-[11px] text-sky-100/70">
              <span className="text-white/35">Heard: </span>
              {voice.liveTranscript}
            </p>
          ) : null}

          <div className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={2}
              placeholder="Ask your Executive Assistant…"
              className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-sky-400/40"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            <button
              type="button"
              onClick={() => voice.requestStartListening()}
              disabled={!voice.supported && voice.micVisual === "off"}
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                voice.micVisual === "listening"
                  ? "border-sky-400/50 bg-sky-500/25 text-sky-50 shadow-[0_0_0_3px_rgba(56,189,248,0.15)] animate-pulse"
                  : voice.micVisual === "processing"
                    ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                    : voice.micVisual === "speaking"
                      ? "border-sky-400/40 bg-sky-500/20 text-sky-100"
                      : "border-white/15 bg-white/[0.04] text-white/45 hover:bg-white/[0.08] hover:text-white/80",
              )}
              aria-label={
                voice.micVisual === "listening" ? "Stop listening" : "Start voice conversation"
              }
              title="Voice (CTRL+Q)"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-100 transition-colors hover:bg-sky-500/25 disabled:opacity-40"
              aria-label="Send message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-white/30">
            Voice shortcut: CTRL + Q · Esc ends voice mode
          </p>
        </form>

        <VoiceIntroModal
          open={voice.introOpen}
          onGotIt={(dontShowAgain) => voice.completeIntro(dontShowAgain, true)}
          onDismiss={(dontShowAgain) => voice.completeIntro(dontShowAgain, false)}
        />
      </div>
    </div>
  );

  if (variant === "page") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">{panelBody}</div>
    );
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
          "relative flex h-full w-full max-w-[720px] border-l border-white/10 transition-transform duration-300 ease-out",
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

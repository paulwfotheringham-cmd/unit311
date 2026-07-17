"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { Loader2, RefreshCw, RotateCcw, Trash2 } from "lucide-react";

import {
  formatSupportDate,
  priorityBadgeClass,
  SUPPORT_PRIORITY_LABELS,
  type SupportTicket,
} from "@/lib/support-data";
import { CLIENT_OPEN_TICKET_PHRASE, inputPlaceholderForStep } from "@/lib/support-intake-prompts";
import {
  formatMessageTime,
  SUPPORT_MESSAGING_ROOM,
  type ChatMessage,
} from "@/lib/internal-messaging-data";
import { createInitialUsers } from "@/lib/user-management-data";
import SupportTicketClientActions from "@/components/testflighthub/SupportTicketClientActions";
import { cn } from "@/lib/utils";

type ChatLine = {
  id: string;
  role: "you" | "them" | "error" | "notify";
  text: string;
};

type IntakeStep =
  | "idle"
  | "awaiting_name"
  | "awaiting_organisation"
  | "awaiting_priority"
  | "awaiting_description"
  | "submitted";

const STORAGE_PREFIX = "bcn-support-flow-v1";
const CHAT_STORAGE_KEY = `${STORAGE_PREFIX}-chat`;
const NOTIFY_STORAGE_KEY = `${STORAGE_PREFIX}-notify`;
const PENDING_TICKET_KEY = `${STORAGE_PREFIX}-ticket`;
const INTAKE_STEP_KEY = `${STORAGE_PREFIX}-step`;
const COLUMN_COUNT_KEY = `${STORAGE_PREFIX}-columns`;
const ASSIGNED_KEY = `${STORAGE_PREFIX}-assigned`;

const COL3_DELAY_MS = 3000;
const COL4_DELAY_MS = 2000;

const operators = createInitialUsers();
const defaultOperator = operators[0];

function loadStoredLines(key: string): ChatLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadIntakeStep(): IntakeStep {
  if (typeof window === "undefined") return "idle";
  const raw = window.localStorage.getItem(INTAKE_STEP_KEY);
  if (
    raw === "awaiting_name" ||
    raw === "awaiting_organisation" ||
    raw === "awaiting_priority" ||
    raw === "awaiting_description" ||
    raw === "submitted"
  ) {
    return raw;
  }
  return "idle";
}

function loadColumnCount() {
  if (typeof window === "undefined") return 1;
  const raw = Number(window.localStorage.getItem(COLUMN_COUNT_KEY));
  return raw >= 1 && raw <= 4 ? raw : 1;
}

function parseIntakeStep(value: unknown): IntakeStep {
  if (
    value === "awaiting_name" ||
    value === "awaiting_organisation" ||
    value === "awaiting_priority" ||
    value === "awaiting_description" ||
    value === "submitted"
  ) {
    return value;
  }
  return "idle";
}

function filterMessagesForTicket(messages: ChatMessage[], ticketId: string) {
  return messages.filter((message) => message.content.includes(ticketId));
}

function WhatsAppBubble({ line }: { line: ChatLine }) {
  if (line.role === "you") {
    return (
      <div className="ml-6 rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 text-sm shadow-sm">
        {line.text}
      </div>
    );
  }
  if (line.role === "error") {
    return (
      <div className="mr-6 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {line.text}
      </div>
    );
  }
  if (line.role === "notify") {
    return (
      <div className="mr-6 rounded-lg rounded-tl-none border border-sky-400/20 bg-[#1a2a33] px-3 py-2 text-sm text-sky-100 shadow-sm">
        {line.text}
      </div>
    );
  }
  return (
    <div className="mr-6 rounded-lg rounded-tl-none bg-[#1f2c34] px-3 py-2 text-sm text-white/90 shadow-sm">
      {line.text}
    </div>
  );
}

function PanelHeaderActions({
  onClear,
  onRefresh,
  refreshing = false,
  clearLabel = "Clear panel",
  refreshLabel = "Refresh panel",
  showRefresh = true,
}: {
  onClear?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  clearLabel?: string;
  refreshLabel?: string;
  showRefresh?: boolean;
}) {
  if (!onClear && !onRefresh) return null;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-red-200"
          aria-label={clearLabel}
          title={clearLabel}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      {showRefresh && onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-sky-200 disabled:opacity-40"
          aria-label={refreshLabel}
          title={refreshLabel}
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

function PanelShell({
  title,
  subtitle,
  badge,
  badgeClassName,
  footer,
  children,
  className,
  onClear,
  onRefresh,
  refreshing,
  clearLabel,
  refreshLabel,
  showRefresh = true,
}: {
  title: string;
  subtitle: string;
  badge: string;
  badgeClassName: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClear?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  clearLabel?: string;
  refreshLabel?: string;
  showRefresh?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-[260px] flex-1 flex-col border-white/10 bg-[#0b141a] text-[#e9edef]",
        className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-white/10 bg-[#1f2c34] px-3 py-2">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
            badgeClassName,
          )}
          aria-hidden
        >
          {badge}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <p className="truncate text-[10px] text-white/45">{subtitle}</p>
        </div>
        <PanelHeaderActions
          onClear={onClear}
          onRefresh={onRefresh}
          refreshing={refreshing}
          clearLabel={clearLabel}
          refreshLabel={refreshLabel}
          showRefresh={showRefresh}
        />
      </header>
      {children}
      {footer}
    </section>
  );
}

export default function WhatsAppSupportFlowPage() {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [notifyLines, setNotifyLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [messagingDraft, setMessagingDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [messagingBusy, setMessagingBusy] = useState(false);
  const [intakeStep, setIntakeStep] = useState<IntakeStep>("idle");
  const [hydrated, setHydrated] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(1);
  const [assigned, setAssigned] = useState(false);
  const [platformMessages, setPlatformMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [messagingError, setMessagingError] = useState<string | null>(null);
  const [joinedOperatorId, setJoinedOperatorId] = useState<string | null>(null);

  const revealTimersRef = useRef<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const joinedOperator = useMemo(
    () => operators.find((operator) => operator.id === joinedOperatorId),
    [joinedOperatorId],
  );

  const inputPlaceholder =
    intakeStep === "idle"
      ? `Type ${CLIENT_OPEN_TICKET_PHRASE} to start`
      : inputPlaceholderForStep(intakeStep);

  const appendLine = useCallback((role: ChatLine["role"], text: string) => {
    setLines((current) => [...current, { id: `${Date.now()}-${role}`, role, text }]);
  }, []);

  const appendNotifyLine = useCallback((text: string) => {
    setNotifyLines((current) => [
      ...current,
      { id: `${Date.now()}-notify`, role: "notify", text },
    ]);
  }, []);

  const clearRevealTimers = useCallback(() => {
    revealTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    revealTimersRef.current = [];
  }, []);

  const scheduleColumnReveal = useCallback(() => {
    clearRevealTimers();

    const timer3 = window.setTimeout(() => {
      setVisibleColumns((current) => Math.max(current, 3));
      setJoinedOperatorId(defaultOperator?.id ?? "user-1");
    }, COL3_DELAY_MS);
    revealTimersRef.current.push(timer3);

    const timer4 = window.setTimeout(() => {
      setVisibleColumns(4);
    }, COL3_DELAY_MS + COL4_DELAY_MS);
    revealTimersRef.current.push(timer4);
  }, [clearRevealTimers]);

  const loadTicket = useCallback(async (id: string) => {
    setTicketLoading(true);
    try {
      const response = await fetch(`/api/support/tickets/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { ticket?: SupportTicket };
      if (data.ticket) setTicket(data.ticket);
    } finally {
      setTicketLoading(false);
    }
  }, []);

  const loadPlatformMessages = useCallback(async (id: string) => {
    setMessagesLoading(true);
    setMessagingError(null);
    try {
      const response = await fetch(
        `/api/messaging/messages?room=${encodeURIComponent(SUPPORT_MESSAGING_ROOM)}&limit=80`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as { messages?: ChatMessage[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load messages");
      setPlatformMessages(filterMessagesForTicket(data.messages ?? [], id));
    } catch (loadError) {
      setMessagingError(
        loadError instanceof Error ? loadError.message : "Failed to load messages",
      );
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      setLines(loadStoredLines(CHAT_STORAGE_KEY));
      setNotifyLines(loadStoredLines(NOTIFY_STORAGE_KEY));
      setTicketId(window.localStorage.getItem(PENDING_TICKET_KEY));
      setIntakeStep(loadIntakeStep());
      setVisibleColumns(loadColumnCount());
      setAssigned(window.localStorage.getItem(ASSIGNED_KEY) === "1");
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(lines));
    window.localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(notifyLines));
    window.localStorage.setItem(INTAKE_STEP_KEY, intakeStep);
    window.localStorage.setItem(COLUMN_COUNT_KEY, String(visibleColumns));
    window.localStorage.setItem(ASSIGNED_KEY, assigned ? "1" : "0");
    if (ticketId) {
      window.localStorage.setItem(PENDING_TICKET_KEY, ticketId);
    } else {
      window.localStorage.removeItem(PENDING_TICKET_KEY);
    }
  }, [hydrated, lines, notifyLines, intakeStep, visibleColumns, assigned, ticketId]);

  useEffect(() => {
    if (!ticketId || visibleColumns < 3) return;
    startTransition(() => {
      void loadPlatformMessages(ticketId);
    });
    const interval = window.setInterval(() => void loadPlatformMessages(ticketId), 4000);
    return () => window.clearInterval(interval);
  }, [ticketId, visibleColumns, loadPlatformMessages]);

  useEffect(() => {
    if (!ticketId || visibleColumns < 4) return;
    startTransition(() => {
      void loadTicket(ticketId);
    });
    const interval = window.setInterval(() => void loadTicket(ticketId), 4000);
    return () => window.clearInterval(interval);
  }, [ticketId, visibleColumns, loadTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [platformMessages, visibleColumns]);

  useEffect(() => () => clearRevealTimers(), [clearRevealTimers]);

  const resetDemo = useCallback(async () => {
    clearRevealTimers();
    setLines([]);
    setNotifyLines([]);
    setDraft("");
    setMessagingDraft("");
    setIntakeStep("idle");
    setTicketId(null);
    setTicket(null);
    setVisibleColumns(1);
    setAssigned(false);
    setPlatformMessages([]);
    setJoinedOperatorId(null);
    setMessagingError(null);

    window.localStorage.removeItem(CHAT_STORAGE_KEY);
    window.localStorage.removeItem(NOTIFY_STORAGE_KEY);
    window.localStorage.removeItem(PENDING_TICKET_KEY);
    window.localStorage.removeItem(INTAKE_STEP_KEY);
    window.localStorage.removeItem(COLUMN_COUNT_KEY);
    window.localStorage.removeItem(ASSIGNED_KEY);

    try {
      await fetch("/api/whatsapp/support/reset", { method: "POST" });
    } catch {
      // local reset still works
    }
  }, [clearRevealTimers]);

  const clearClientPanel = useCallback(() => {
    setLines([]);
    setDraft("");
    setIntakeStep("idle");
  }, []);

  const clearNotifyPanel = useCallback(() => {
    setNotifyLines([]);
  }, []);

  const clearMessagingPanel = useCallback(() => {
    setPlatformMessages([]);
    setMessagingDraft("");
    setMessagingError(null);
    setAssigned(false);
  }, []);

  const clearTicketPanel = useCallback(() => {
    setTicket(null);
  }, []);

  const refreshMessagingPanel = useCallback(() => {
    if (ticketId) void loadPlatformMessages(ticketId);
  }, [ticketId, loadPlatformMessages]);

  const refreshTicketPanel = useCallback(() => {
    if (ticketId) void loadTicket(ticketId);
  }, [ticketId, loadTicket]);

  const handleSubmitted = useCallback(
    (id: string) => {
      setTicketId(id);
      setVisibleColumns(2);
      scheduleColumnReveal();
    },
    [scheduleColumnReveal],
  );

  const sendClientMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      setBusy(true);
      appendLine("you", trimmed);
      setDraft("");

      try {
        const response = await fetch("/api/whatsapp/inbound", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed, preview: true }),
        });
        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          appendLine("error", (data.error as string | undefined) ?? "Failed to process message");
          return;
        }

        if (data.skipped) {
          appendLine(
            "error",
            (data.reply as string | undefined) ?? `Start with "${CLIENT_OPEN_TICKET_PHRASE}".`,
          );
          return;
        }

        const reply = data.reply as string | undefined;
        if (reply) appendLine("them", reply);

        if (data.mode === "submitted") {
          const created = data.ticket as { id?: string } | undefined;
          if (created?.id) handleSubmitted(created.id);
          setIntakeStep("submitted");
        } else if (data.mode === "step") {
          setIntakeStep(parseIntakeStep(data.step));
        }
      } catch (submitError) {
        appendLine(
          "error",
          submitError instanceof Error ? submitError.message : "Submit failed",
        );
      } finally {
        setBusy(false);
      }
    },
    [appendLine, busy, handleSubmitted],
  );

  const assignTicket = useCallback(
    async (content: string) => {
      if (!ticketId || !joinedOperator || assigned || messagingBusy) return;

      setMessagingBusy(true);
      setMessagingError(null);

      try {
        const response = await fetch("/api/whatsapp/support-flow/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId,
            content,
            operatorId: joinedOperator.id,
            operatorName: joinedOperator.fullName,
            username: joinedOperator.username,
          }),
        });
        const data = (await response.json()) as {
          ticket?: SupportTicket;
          clientMessage?: string;
          operatorMessage?: string;
          error?: string;
        };

        if (!response.ok) throw new Error(data.error ?? "Failed to assign ticket");

        if (data.ticket) setTicket(data.ticket);
        if (data.clientMessage) appendLine("them", data.clientMessage);
        if (data.operatorMessage) appendNotifyLine(data.operatorMessage);

        setAssigned(true);
        setMessagingDraft("");
        await loadPlatformMessages(ticketId);
      } catch (assignError) {
        setMessagingError(
          assignError instanceof Error ? assignError.message : "Failed to assign ticket",
        );
      } finally {
        setMessagingBusy(false);
      }
    },
    [
      ticketId,
      joinedOperator,
      assigned,
      messagingBusy,
      appendLine,
      appendNotifyLine,
      loadPlatformMessages,
    ],
  );

  if (!hydrated) {
    return <div className="h-dvh bg-[#07111F]" />;
  }

  const columnWidth = `${100 / visibleColumns}%`;

  return (
    <main className="flex h-dvh w-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0b1524] px-3 py-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/80">
            Support flow demo
          </p>
          <p className="text-xs text-white/45">
            Panels appear step by step — {visibleColumns} of 4 visible
            {ticketId ? ` · ${ticketId}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void resetDemo()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold text-sky-100 transition-colors hover:bg-sky-500/20"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Start again
        </button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-x-auto">
        <div className="flex min-h-0 min-w-full flex-1">
          {/* Column 1 — Client WhatsApp */}
          <div
            className="flex min-h-0 shrink-0 transition-[width] duration-700 ease-out"
            style={{ width: columnWidth }}
          >
            <PanelShell
              title="Unit311 Support"
              subtitle="Customer WhatsApp"
              badge="BCN"
              badgeClassName="bg-emerald-700 text-xs"
              className="border-r"
              onClear={clearClientPanel}
              clearLabel="Clear client chat"
              showRefresh={false}
              footer={
                <div className="border-t border-white/10 bg-[#1f2c34] p-2">
                  {intakeStep === "idle" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void sendClientMessage(CLIENT_OPEN_TICKET_PHRASE)}
                      className="mb-2 w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-left text-xs text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
                    >
                      Quick start: {CLIENT_OPEN_TICKET_PHRASE}
                    </button>
                  )}
                  <form
                    className="flex items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void sendClientMessage(draft);
                    }}
                  >
                    <textarea
                      rows={1}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendClientMessage(draft);
                        }
                      }}
                      placeholder={inputPlaceholder}
                      disabled={busy || intakeStep === "submitted"}
                      className="max-h-24 min-h-[38px] flex-1 resize-none rounded-3xl border border-white/10 bg-[#0b141a] px-3 py-2 text-xs text-white placeholder:text-white/35 outline-none focus:border-emerald-400/40 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={busy || !draft.trim() || intakeStep === "submitted"}
                      className="inline-flex h-[38px] shrink-0 items-center justify-center rounded-full bg-[#005c4b] px-4 text-xs font-semibold disabled:opacity-50"
                    >
                      Send
                    </button>
                  </form>
                </div>
              }
            >
              <div className="relative min-h-0 flex-1 overflow-y-auto px-2 py-3">
                {lines.length === 0 ? (
                  <p className="mx-auto max-w-[200px] pt-10 text-center text-xs text-white/35">
                    Type <span className="text-white/55">{CLIENT_OPEN_TICKET_PHRASE}</span> to begin.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lines.map((line) => (
                      <WhatsAppBubble key={line.id} line={line} />
                    ))}
                  </div>
                )}
              </div>
            </PanelShell>
          </div>

          {/* Column 2 — Unit311 Info Messages */}
          {visibleColumns >= 2 && (
            <div
              className="flex min-h-0 shrink-0 animate-in fade-in slide-in-from-right-4 duration-700"
              style={{ width: columnWidth }}
            >
              <PanelShell
                title="Unit311 Info Messages"
                subtitle="CallMeBot alerts"
                badge="DC"
                badgeClassName="bg-sky-700"
                className="border-r"
                onClear={clearNotifyPanel}
                clearLabel="Clear operator alerts"
                showRefresh={false}
                footer={
                  <p className="border-t border-white/10 px-3 py-2 text-center text-[10px] text-white/35">
                    Operator alerts appear here after assignment.
                  </p>
                }
              >
                <div
                  className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
                  style={{
                    backgroundColor: "#0a1218",
                    backgroundImage:
                      "radial-gradient(circle at 80% 20%, rgba(56,189,248,0.04) 0, transparent 45%)",
                  }}
                >
                  {notifyLines.length === 0 ? (
                    <p className="mx-auto max-w-[200px] pt-10 text-center text-xs text-white/35">
                      Waiting for operator assignment…
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {notifyLines.map((line) => (
                        <WhatsAppBubble key={line.id} line={line} />
                      ))}
                    </div>
                  )}
                </div>
              </PanelShell>
            </div>
          )}

          {/* Column 3 — Platform messaging */}
          {visibleColumns >= 3 && (
            <div
              className="flex min-h-0 shrink-0 animate-in fade-in slide-in-from-right-4 duration-700"
              style={{ width: columnWidth }}
            >
              <PanelShell
                title="Messaging · Support"
                subtitle="Internal operator view"
                badge="#"
                badgeClassName="bg-violet-700"
                className="border-r bg-[#07111F]"
                onClear={clearMessagingPanel}
                onRefresh={refreshMessagingPanel}
                refreshing={messagesLoading}
                clearLabel="Clear messaging view"
                refreshLabel="Refresh Support channel"
                footer={
                  <div className="border-t border-white/10 bg-[#0b1524] p-2">
                    {!joinedOperator ? (
                      <button
                        type="button"
                        onClick={() => setJoinedOperatorId(defaultOperator?.id ?? "user-1")}
                        className="mb-2 w-full rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100"
                      >
                        Join as {defaultOperator?.fullName ?? "User 1"}
                      </button>
                    ) : (
                      <p className="mb-2 px-1 text-[10px] text-white/40">
                        Joined as {joinedOperator.fullName} — type{" "}
                        <span className="text-white/60">User 1</span> to assign.
                      </p>
                    )}
                    {messagingError && (
                      <p className="mb-2 rounded-lg border border-red-400/25 bg-red-500/10 px-2 py-1.5 text-[10px] text-red-200">
                        {messagingError}
                      </p>
                    )}
                    <form
                      className="flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void assignTicket(messagingDraft);
                      }}
                    >
                      <input
                        value={messagingDraft}
                        onChange={(event) => setMessagingDraft(event.target.value)}
                        placeholder={assigned ? "Ticket assigned" : "Type User 1"}
                        disabled={!joinedOperator || assigned || messagingBusy}
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b141a] px-3 py-2 text-xs text-white placeholder:text-white/35 outline-none focus:border-sky-400/40 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={!joinedOperator || assigned || messagingBusy || !messagingDraft.trim()}
                        className="inline-flex h-[34px] shrink-0 items-center justify-center rounded-xl bg-[#2563eb] px-3 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {messagingBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send"}
                      </button>
                    </form>
                  </div>
                }
              >
                <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
                  {messagesLoading && platformMessages.length === 0 ? (
                    <div className="flex items-center gap-2 pt-4 text-xs text-white/45">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading Support channel…
                    </div>
                  ) : platformMessages.length === 0 ? (
                    <p className="pt-10 text-center text-xs text-white/35">
                      Ticket messages will appear here shortly.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {platformMessages.map((message) => {
                        const isSelf = message.operatorId === joinedOperatorId;
                        const isSystem = message.messageType === "system";
                        return (
                          <div
                            key={message.id}
                            className={cn("flex", isSelf ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[95%] rounded-xl border px-2.5 py-2",
                                isSystem
                                  ? "border-amber-400/20 bg-amber-500/10"
                                  : isSelf
                                    ? "border-sky-400/30 bg-sky-500/15"
                                    : "border-white/10 bg-white/[0.04]",
                              )}
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="text-[11px] font-semibold text-white">
                                  {message.operatorName}
                                </p>
                                <p className="text-[9px] text-white/30">
                                  {formatMessageTime(message.createdAt)}
                                </p>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-white/80">
                                {message.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </PanelShell>
            </div>
          )}

          {/* Column 4 — Ticket record */}
          {visibleColumns >= 4 && (
            <div
              className="flex min-h-0 shrink-0 animate-in fade-in slide-in-from-right-4 duration-700"
              style={{ width: columnWidth }}
            >
              <PanelShell
                title="Support ticket"
                subtitle="Platform ticket record"
                badge="SUP"
                badgeClassName="bg-amber-700 text-[9px]"
                onClear={clearTicketPanel}
                onRefresh={refreshTicketPanel}
                refreshing={ticketLoading}
                clearLabel="Clear ticket view"
                refreshLabel="Refresh ticket"
                footer={
                  <p className="border-t border-white/10 px-3 py-2 text-center text-[10px] text-white/35">
                    Send updates or close the ticket — mirrored in the client chat.
                  </p>
                }
              >
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {ticketLoading && !ticket ? (
                    <div className="flex items-center gap-2 text-xs text-white/45">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading ticket…
                    </div>
                  ) : ticket ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sky-300/80">
                          {ticket.id}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-white">
                          {ticket.name || "Unnamed"}
                        </h3>
                        <p className="mt-0.5 text-xs text-white/45">{ticket.organisation}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
                              priorityBadgeClass(ticket.priority),
                            )}
                          >
                            {ticket.clientPriorityLabel?.trim() ||
                              SUPPORT_PRIORITY_LABELS[ticket.priority]}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {ticket.userAssigned ? `Assigned: ${ticket.userAssigned}` : "Unassigned"}
                          </span>
                          {ticket.closed && (
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-200">
                              Closed
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-[11px] leading-relaxed text-white/70">
                          {ticket.description || "—"}
                        </p>
                        <div className="mt-3 border-t border-white/10 pt-2 text-[10px] text-white/35">
                          <p>Created {formatSupportDate(ticket.createdAt)}</p>
                          <p className="mt-0.5">Updated {formatSupportDate(ticket.updatedAt)}</p>
                        </div>
                      </div>

                      <SupportTicketClientActions
                        ticket={ticket}
                        preview
                        compact
                        onTicketChange={setTicket}
                        onClientMessage={(message) => appendLine("them", message)}
                      />
                    </div>
                  ) : (
                    <p className="pt-10 text-center text-xs text-white/35">
                      Ticket details will load here.
                    </p>
                  )}
                </div>
              </PanelShell>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import { MoreVertical, Trash2 } from "lucide-react";

import { CLIENT_OPEN_TICKET_PHRASE, inputPlaceholderForStep } from "@/lib/support-intake-prompts";

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

const CHAT_STORAGE_KEY = "bcn-whatsapp-support-chat-v5";
const NOTIFY_STORAGE_KEY = "bcn-whatsapp-support-notify-v5";
const PENDING_TICKET_KEY = "bcn-whatsapp-support-pending-ticket-v5";
const INTAKE_STEP_KEY = "bcn-whatsapp-support-intake-step-v5";

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

function loadPendingTicketId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PENDING_TICKET_KEY);
}

function formatAssignedReply(ticketId: string, assignee: string) {
  const label = assignee.trim().replace(/\s+/g, "");
  return `Support ticket ${ticketId} created. ${label} assigned. Please wait for further communications`;
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

function ChatBubble({ line }: { line: ChatLine }) {
  if (line.role === "you") {
    return (
      <div className="ml-10 rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 text-sm shadow-sm">
        {line.text}
      </div>
    );
  }
  if (line.role === "error") {
    return (
      <div className="mr-10 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {line.text}
      </div>
    );
  }
  if (line.role === "notify") {
    return (
      <div className="mr-10 rounded-lg rounded-tl-none border border-sky-400/20 bg-[#1a2a33] px-3 py-2 text-sm text-sky-100 shadow-sm">
        {line.text}
      </div>
    );
  }
  return (
    <div className="mr-10 rounded-lg rounded-tl-none bg-[#1f2c34] px-3 py-2 text-sm text-white/90 shadow-sm">
      {line.text}
    </div>
  );
}

export default function WhatsAppSupportChatPage() {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [notifyLines, setNotifyLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [intakeStep, setIntakeStep] = useState<IntakeStep>("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);
  const assignmentNotifiedRef = useRef<string | null>(null);

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

  useEffect(() => {
    startTransition(() => {
      setLines(loadStoredLines(CHAT_STORAGE_KEY));
      setNotifyLines(loadStoredLines(NOTIFY_STORAGE_KEY));
      setPendingTicketId(loadPendingTicketId());
      setIntakeStep(loadIntakeStep());
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(lines));
    window.localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(notifyLines));
    window.localStorage.setItem(INTAKE_STEP_KEY, intakeStep);
  }, [hydrated, lines, notifyLines, intakeStep]);

  useEffect(() => {
    if (!hydrated) return;
    if (pendingTicketId) {
      window.localStorage.setItem(PENDING_TICKET_KEY, pendingTicketId);
    } else {
      window.localStorage.removeItem(PENDING_TICKET_KEY);
    }
  }, [hydrated, pendingTicketId]);

  useEffect(() => {
    if (!pendingTicketId) return;

    let cancelled = false;

    async function pollAssignment() {
      try {
        const response = await fetch(`/api/support/tickets/${encodeURIComponent(pendingTicketId!)}`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;

        const data = (await response.json()) as {
          ticket?: { id?: string; userAssigned?: string | null };
        };
        const ticket = data.ticket;
        if (!ticket?.id || !ticket.userAssigned) return;

        const notifyKey = `${ticket.id}:${ticket.userAssigned}`;
        if (assignmentNotifiedRef.current === notifyKey) return;
        assignmentNotifiedRef.current = notifyKey;

        appendNotifyLine(formatAssignedReply(ticket.id, ticket.userAssigned));
        setPendingTicketId(null);
        setIntakeStep("submitted");
      } catch {
        // keep polling
      }
    }

    void pollAssignment();
    const interval = window.setInterval(() => void pollAssignment(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pendingTicketId, appendNotifyLine]);

  const clearChat = useCallback(async () => {
    setMenuOpen(false);
    setLines([]);
    setNotifyLines([]);
    setDraft("");
    setIntakeStep("idle");
    setPendingTicketId(null);
    assignmentNotifiedRef.current = null;
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
    window.localStorage.removeItem(NOTIFY_STORAGE_KEY);
    window.localStorage.removeItem(PENDING_TICKET_KEY);
    window.localStorage.removeItem(INTAKE_STEP_KEY);

    try {
      await fetch("/api/whatsapp/support/reset", { method: "POST" });
    } catch {
      // local clear still works if reset fails
    }
  }, []);

  const sendMessage = useCallback(
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
          const message = (data.error as string | undefined) ?? "Failed to process message";
          appendLine("error", message);
          return;
        }

        if (data.skipped) {
          appendLine("error", (data.reply as string | undefined) ?? `Start with "${CLIENT_OPEN_TICKET_PHRASE}".`);
          return;
        }

        const reply = data.reply as string | undefined;
        if (reply) {
          appendLine("them", reply);
        }

        if (data.mode === "submitted") {
          const ticket = data.ticket as { id?: string } | undefined;
          if (ticket?.id) {
            setPendingTicketId(ticket.id);
            assignmentNotifiedRef.current = null;
          }
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
    [appendLine, busy],
  );

  if (!hydrated) {
    return <div className="h-dvh bg-[#0b141a]" />;
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-6xl flex-col bg-[#0b141a] text-[#e9edef] lg:flex-row">
      {/* Client ↔ Unit311 Support */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col border-white/10 lg:border-r">
        <header className="relative flex items-center gap-3 border-b border-white/10 bg-[#1f2c34] px-3 py-2.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white"
            aria-hidden
          >
            BCN
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">Unit311 Support</h1>
            <p className="truncate text-xs text-emerald-300/90">Client chat — type your own answers</p>
          </div>
          <div className="relative lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10"
              aria-label="Chat options"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-11 z-20 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-[#233138] py-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => void clearChat()}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-200 transition-colors hover:bg-white/5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear all messages
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <div
          className="flex-1 space-y-2 overflow-y-auto px-3 py-4"
          style={{
            backgroundColor: "#0b141a",
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.02) 0, transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.02) 0, transparent 40%)",
          }}
        >
          {lines.length === 0 ? (
            <p className="mx-auto max-w-xs pt-16 text-center text-sm text-white/35">
              Type <span className="text-white/55">{CLIENT_OPEN_TICKET_PHRASE}</span> to start.
            </p>
          ) : (
            lines.map((line) => <ChatBubble key={line.id} line={line} />)
          )}
        </div>

        <div className="border-t border-white/10 bg-[#1f2c34] p-2">
          {pendingTicketId && (
            <p className="mb-2 px-2 text-[11px] text-amber-200/80">
              Waiting for operator to assign {pendingTicketId} in Messaging → Support…
            </p>
          )}

          {intakeStep === "idle" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendMessage(CLIENT_OPEN_TICKET_PHRASE)}
              className="mb-2 w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-left text-sm text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
            >
              Quick start: {CLIENT_OPEN_TICKET_PHRASE}
            </button>
          )}

          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(draft);
            }}
          >
            <textarea
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(draft);
                }
              }}
              placeholder={inputPlaceholder}
              disabled={busy || intakeStep === "submitted"}
              className="max-h-28 min-h-[42px] flex-1 resize-none rounded-3xl border border-white/10 bg-[#0b141a] px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-emerald-400/40 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim() || intakeStep === "submitted"}
              className="inline-flex h-[42px] shrink-0 items-center justify-center rounded-full bg-[#005c4b] px-5 text-sm font-semibold disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </section>

      {/* Unit311 Info Messages (CallMeBot) */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-white/10 lg:border-t-0">
        <header className="flex items-center gap-3 border-b border-white/10 bg-[#1f2c34] px-3 py-2.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-700 text-[10px] font-bold leading-tight text-white"
            aria-hidden
          >
            DC
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">Unit311 Info Messages</h2>
            <p className="truncate text-xs text-sky-300/90">CallMeBot alerts — read only</p>
          </div>
          <button
            type="button"
            onClick={() => void clearChat()}
            className="hidden rounded-lg px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/40 transition-colors hover:bg-white/5 hover:text-white/70 lg:inline-flex"
          >
            Clear all
          </button>
        </header>

        <div
          className="flex-1 space-y-2 overflow-y-auto px-3 py-4"
          style={{
            backgroundColor: "#0a1218",
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(56,189,248,0.04) 0, transparent 45%)",
          }}
        >
          {notifyLines.length === 0 ? (
            <p className="mx-auto max-w-xs pt-16 text-center text-sm text-white/35">
              Ticket assignment confirmations appear here — same as on your phone in{" "}
              <span className="text-white/55">Unit311 Info Messages</span>.
            </p>
          ) : (
            notifyLines.map((line) => <ChatBubble key={line.id} line={line} />)
          )}
        </div>

        <div className="border-t border-white/10 bg-[#1f2c34] px-4 py-3">
          <p className="text-center text-[11px] text-white/35">
            Outbound only — assign the ticket in Messaging → Support (type{" "}
            <span className="text-white/50">User 1</span>) to trigger a message here.
          </p>
        </div>
      </section>
    </main>
  );
}

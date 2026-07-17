"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";

import { formatMessageTime, type ChatMessage } from "@/lib/internal-messaging-data";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare, Send } from "lucide-react";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

type ReportChatPageProps = {
  params: Promise<{ token: string }>;
};

export default function ReportChatPage({ params }: ReportChatPageProps) {
  const [token, setToken] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void params.then((value) => setToken(value.token));
  }, [params]);

  const loadChat = useCallback(async (accessToken: string) => {
    const response = await fetch(`/api/crm/report-chat/${encodeURIComponent(accessToken)}`, {
      cache: "no-store",
    });
    const data = await readApiJson<{
      session?: { companyName: string; contactName: string };
      messages?: ChatMessage[];
      error?: string;
    }>(response);
    if (!response.ok) throw new Error(data.error ?? "Failed to load chat");
    setCompanyName(data.session?.companyName ?? "Client");
    setContactName(data.session?.contactName ?? "Guest");
    setMessages(data.messages ?? []);
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    startTransition(() => {
      setLoading(true);
      setError(null);

      void loadChat(token)
        .catch((loadError) => {
          if (!cancelled) {
            setError(loadError instanceof Error ? loadError.message : "Failed to load chat");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    const interval = window.setInterval(() => {
      void loadChat(token).catch(() => undefined);
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadChat, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !draft.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/report-chat/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.trim() }),
      });
      const data = await readApiJson<{ message?: ChatMessage; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to send message");
      setDraft("");
      await loadChat(token);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07101d] text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6">
        <header className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-500/15 p-2 text-sky-300">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                Unit311 Central
              </p>
              <h1 className="mt-1 text-xl font-semibold">{companyName || "Team chat"}</h1>
              <p className="mt-1 text-sm text-white/55">
                Chat with our team about your executive report — no login required.
              </p>
            </div>
          </div>
        </header>

        <main className="mt-4 flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading conversation…
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-white/45">
                    Start the conversation — our team will reply here.
                  </p>
                ) : (
                  messages.map((message) => {
                    const isGuest = message.operatorId.startsWith("guest:");
                    const isSystem = message.messageType === "system";

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                          isSystem
                            ? "mx-auto border border-white/10 bg-white/[0.03] text-white/55"
                            : isGuest
                              ? "ml-auto border border-sky-400/20 bg-sky-500/15 text-sky-50"
                              : "border border-white/10 bg-white/[0.05] text-white/85",
                        )}
                      >
                        {!isSystem ? (
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                            {message.operatorName}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="mt-2 text-[10px] text-white/35">
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={(event) => void handleSend(event)}
                className="border-t border-white/10 p-4"
              >
                {error ? (
                  <p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                ) : null}
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={2}
                    placeholder={`Message as ${contactName || "guest"}…`}
                    className="min-h-[52px] flex-1 resize-none rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 text-sky-200 transition-colors hover:bg-sky-500/25 disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

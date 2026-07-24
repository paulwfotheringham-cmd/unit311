"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import {
  formatMessageTime,
  MESSAGING_ACTIVE_CHANNEL_KEY,
  type ChatMessage,
  type MessageChannel,
  type MessagingParticipant,
} from "@/lib/internal-messaging-data";
import { getClientMessagingOption } from "@/lib/client-messaging-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import { Hash, Loader2, MessageSquare, Paperclip, Send } from "lucide-react";

const CLIENT_KEY = "venturi";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function inputClassName() {
  return "w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50";
}

type ClientMessagingWorkspaceProps = {
  onUnreadChange?: (count: number) => void;
};

export default function ClientMessagingWorkspace({ onUnreadChange }: ClientMessagingWorkspaceProps) {
  const client = useMemo(() => getClientMessagingOption(CLIENT_KEY), []);
  const viewerKey = `client:${CLIENT_KEY}`;
  const senderId = viewerKey;
  const senderName = client?.displayName ?? "Venturi Aeronautical";
  const senderUsername = client?.username ?? CLIENT_KEY;

  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [channels, setChannels] = useState<MessageChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<MessagingParticipant[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "polling">(
    "connecting",
  );
  const { showDetail: showChat, openDetail: openChat, closeDetail: closeChat } =
    useMobileDetailPanel();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeChannel = channels.find((channel) => channel.room === activeRoom) ?? null;
  const unreadTotal = channels.reduce((sum, channel) => sum + (channel.unreadCount ?? 0), 0);

  const loadChannels = useCallback(async () => {
    const params = new URLSearchParams({
      viewerType: "client",
      clientKey: CLIENT_KEY,
      viewerKey,
    });
    const response = await fetch(`/api/messaging/channels?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await readApiJson<{ channels?: MessageChannel[]; error?: string }>(response);
    if (!response.ok) throw new Error(data.error ?? "Failed to load channels");
    setChannels(data.channels ?? []);
    return data.channels ?? [];
  }, [viewerKey]);

  const loadMessages = useCallback(async (room: string) => {
    const response = await fetch(`/api/messaging/messages?room=${encodeURIComponent(room)}`, {
      cache: "no-store",
    });
    const data = await readApiJson<{ messages?: ChatMessage[]; error?: string }>(response);
    if (!response.ok) throw new Error(data.error ?? "Failed to load messages");
    setMessages(data.messages ?? []);
  }, []);

  const markRead = useCallback(
    async (room: string) => {
      await fetch("/api/messaging/channels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", viewerKey, room }),
      });
      setChannels((current) =>
        current.map((channel) =>
          channel.room === room ? { ...channel, unreadCount: 0 } : channel,
        ),
      );
    },
    [viewerKey],
  );

  useEffect(() => {
    onUnreadChange?.(unreadTotal);
  }, [onUnreadChange, unreadTotal]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const nextChannels = await loadChannels();
        if (cancelled) return;
        const storedChannel = window.localStorage.getItem(`${MESSAGING_ACTIVE_CHANNEL_KEY}:client`);
        const initialRoom =
          storedChannel && nextChannels.some((channel) => channel.room === storedChannel)
            ? storedChannel
            : (nextChannels[0]?.room ?? null);
        if (initialRoom) {
          setActiveRoom(initialRoom);
          await loadMessages(initialRoom);
          await markRead(initialRoom);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load messages");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    startTransition(() => {
      void bootstrap();
    });
    return () => {
      cancelled = true;
    };
  }, [loadChannels, loadMessages, markRead]);

  useEffect(() => {
    if (!activeRoom) return;
    startTransition(() => {
      void loadMessages(activeRoom);
    });
    startTransition(() => {
      void markRead(activeRoom);
    });
  }, [activeRoom, loadMessages, markRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeRoom) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null =
      null;
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    const room = activeRoom;

    async function connectRealtime() {
      try {
        const configResponse = await fetch("/api/messaging/config", { cache: "no-store" });
        const config = await readApiJson<{
          configured?: boolean;
          supabaseUrl?: string;
          supabaseAnonKey?: string;
          error?: string;
        }>(configResponse);

        if (!configResponse.ok || !config.supabaseUrl || !config.supabaseAnonKey) {
          throw new Error(config.error ?? "Realtime is not configured");
        }

        supabase = createSupabaseBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
        channel = supabase
          .channel(`client-messaging:${room}`, {
            config: { presence: { key: senderId } },
          })
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "internal_messages",
              filter: `room=eq.${room}`,
            },
            (payload) => {
              const row = payload.new as {
                id: string;
                room: string;
                operator_id: string;
                operator_name: string;
                username: string;
                content: string;
                message_type?: string | null;
                attachment_name?: string | null;
                attachment_url?: string | null;
                attachment_mime?: string | null;
                call_link?: string | null;
                created_at: string;
              };

              setMessages((current) => {
                if (current.some((message) => message.id === row.id)) return current;
                return [
                  ...current,
                  {
                    id: row.id,
                    room: row.room,
                    operatorId: row.operator_id,
                    operatorName: row.operator_name,
                    username: row.username,
                    content: row.content,
                    messageType:
                      row.message_type === "file" ||
                      row.message_type === "call" ||
                      row.message_type === "system"
                        ? row.message_type
                        : "text",
                    attachmentName: row.attachment_name ?? null,
                    attachmentUrl: row.attachment_url ?? null,
                    attachmentMime: row.attachment_mime ?? null,
                    callLink: row.call_link ?? null,
                    createdAt: row.created_at,
                  },
                ];
              });

              if (row.operator_id !== senderId) {
                void loadChannels();
              }
            },
          )
          .on("presence", { event: "sync" }, () => {
            const state = channel?.presenceState() ?? {};
            const nextParticipants: MessagingParticipant[] = [];
            for (const entries of Object.values(state)) {
              for (const entry of entries as Array<{
                operator_id?: string;
                operator_name?: string;
                username?: string;
                joined_at?: string;
              }>) {
                if (!entry.operator_id || !entry.operator_name || !entry.username) continue;
                nextParticipants.push({
                  operatorId: entry.operator_id,
                  operatorName: entry.operator_name,
                  username: entry.username,
                  joinedAt: entry.joined_at ?? new Date().toISOString(),
                });
              }
            }
            setParticipants(nextParticipants);
          });

        await channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            setRealtimeStatus("live");
            await channel?.track({
              operator_id: senderId,
              operator_name: senderName,
              username: senderUsername,
              joined_at: new Date().toISOString(),
            });
          }
        });
      } catch {
        if (cancelled) return;
        setRealtimeStatus("polling");
        pollTimer = setInterval(() => {
          void loadMessages(room).catch(() => undefined);
          void loadChannels().catch(() => undefined);
        }, 3000);
      }
    }

    startTransition(() => {
      setRealtimeStatus("connecting");
      void connectRealtime();
    });

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [activeRoom, loadChannels, loadMessages, senderId, senderName, senderUsername]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      startTransition(() => {
        void loadChannels().catch(() => undefined);
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadChannels]);

  function selectChannel(room: string) {
    setActiveRoom(room);
    window.localStorage.setItem(`${MESSAGING_ACTIVE_CHANNEL_KEY}:client`, room);
    openChat();
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!activeRoom || !draft.trim()) return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/messaging/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: senderId,
          operatorName: senderName,
          username: senderUsername,
          room: activeRoom,
          content: draft.trim(),
        }),
      });
      const data = await readApiJson<{ message?: ChatMessage; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to send message");
      if (data.message) {
        setMessages((current) =>
          current.some((message) => message.id === data.message!.id)
            ? current
            : [...current, data.message!],
        );
      }
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleAttachFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !activeRoom) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("room", activeRoom);

      const uploadResponse = await fetch("/api/messaging/attachments", {
        method: "POST",
        body: formData,
      });
      const uploadData = await readApiJson<{
        attachment?: { name: string; url: string; mimeType: string };
        error?: string;
      }>(uploadResponse);
      if (!uploadResponse.ok || !uploadData.attachment) {
        throw new Error(uploadData.error ?? "Failed to upload attachment");
      }

      const response = await fetch("/api/messaging/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: senderId,
          operatorName: senderName,
          username: senderUsername,
          room: activeRoom,
          content: draft.trim() || `Shared ${uploadData.attachment.name}`,
          messageType: "file",
          attachmentName: uploadData.attachment.name,
          attachmentUrl: uploadData.attachment.url,
          attachmentMime: uploadData.attachment.mimeType,
        }),
      });
      const data = await readApiJson<{ message?: ChatMessage; error?: string }>(response);
      if (!response.ok || !data.message) {
        throw new Error(data.error ?? "Failed to send attachment");
      }
      setMessages((current) =>
        current.some((message) => message.id === data.message!.id)
          ? current
          : [...current, data.message!],
      );
      setDraft("");
    } catch (attachError) {
      setError(attachError instanceof Error ? attachError.message : "Failed to attach file");
    } finally {
      setUploading(false);
    }
  }

  return (
    <ResponsiveMasterDetail
      showDetail={showChat && !!activeChannel}
      onBack={closeChat}
      backLabel="Back to channels"
      columnsClassName="xl:grid-cols-[320px_minmax(0,1fr)]"
      master={
        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-sky-300" />
              <h2 className="text-sm font-semibold text-white">Unit311 channels</h2>
            </div>
            <p className="mt-2 text-sm text-white/55">
              Shared channels created by the Unit311 team appear here. Reply in real time when
              a channel is available.
            </p>
            {unreadTotal > 0 && (
              <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                {unreadTotal} unread {unreadTotal === 1 ? "channel" : "channels"}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-white/55">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading channels…
              </div>
            ) : channels.length === 0 ? (
              <p className="text-sm text-white/50">
                No shared channels yet. Unit311 will create one when collaboration starts.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {channels.map((channel) => (
                  <li key={channel.room}>
                    <button
                      type="button"
                      onClick={() => selectChannel(channel.room)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors",
                        channel.room === activeRoom
                          ? "border-sky-400/30 bg-sky-500/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]",
                      )}
                    >
                      <span className="truncate text-sm font-medium">{channel.name}</span>
                      {(channel.unreadCount ?? 0) > 0 && (
                        <span className="ml-2 shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-[#07111F]">
                          New
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Online now
            </p>
            <ul className="mt-3 space-y-2">
              {participants.length === 0 ? (
                <li className="text-xs text-white/40">No one else is in this channel yet.</li>
              ) : (
                participants.map((participant) => (
                  <li
                    key={participant.operatorId}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{participant.operatorName}</span>
                  </li>
                ))
              )}
            </ul>
            <p className="mt-4 text-[10px] uppercase tracking-[0.12em] text-white/30">
              {realtimeStatus === "live"
                ? "Realtime connected"
                : realtimeStatus === "polling"
                  ? "Polling fallback"
                  : "Connecting…"}
            </p>
          </div>
        </aside>
      }
      detail={
        <section className="flex min-h-[min(60dvh,640px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-xl xl:min-h-[min(72vh,760px)]">
          {!activeChannel ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center text-white/45">
              <MessageSquare className="h-8 w-8 text-white/25" />
              <p className="text-sm">Select a channel to start messaging.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="text-lg font-semibold text-white">{activeChannel.name}</h2>
                <p className="text-xs text-white/45">Shared with Unit311 operations</p>
              </div>

              {error && (
                <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {messages.length === 0 ? (
                  <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-white/45">
                    No messages yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const isSelf = message.operatorId === senderId;
                      return (
                        <div
                          key={message.id}
                          className={cn("flex", isSelf ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[min(100%,640px)] rounded-2xl border px-4 py-3",
                              isSelf
                                ? "border-sky-400/30 bg-sky-500/15"
                                : "border-white/10 bg-white/[0.04]",
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">
                                {message.operatorName}
                              </p>
                              <p className="text-[10px] text-white/30">
                                {formatMessageTime(message.createdAt)}
                              </p>
                            </div>
                            {message.messageType === "file" && message.attachmentUrl ? (
                              <div className="mt-2 space-y-2">
                                {message.content &&
                                message.content !== message.attachmentName ? (
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                                    {message.content}
                                  </p>
                                ) : null}
                                <a
                                  href={message.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                                    isSelf
                                      ? "border-sky-400/30 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20"
                                      : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]",
                                  )}
                                >
                                  <Paperclip className="h-4 w-4 shrink-0" />
                                  <span className="truncate">
                                    {message.attachmentName ?? "Attachment"}
                                  </span>
                                </a>
                              </div>
                            ) : (
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                                {message.content}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form onSubmit={(event) => void handleSend(event)} className="border-t border-white/10 px-5 py-4">
                <div className="flex gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => void handleAttachFile(event)}
                  />
                  <button
                    type="button"
                    disabled={!activeRoom || uploading || sending}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                    aria-label="Attach file"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </button>
                  <textarea
                    rows={2}
                    value={draft}
                    disabled={sending || uploading}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend(event);
                      }
                    }}
                    placeholder={`Message in ${activeChannel.name}…`}
                    className="min-h-[52px] flex-1 resize-y rounded-xl border border-white/10 bg-[#0b1524] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-400/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-50"
                    aria-label="Send message"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      }
    />
  );
}

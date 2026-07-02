"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildScheduledCallDateTime,
  formatMessageTime,
  formatScheduledCallTime,
  generateCallLink,
  INTERNAL_MESSAGING_ROOM,
  MESSAGING_ACTIVE_CHANNEL_KEY,
  MESSAGING_STORAGE_KEY,
  type ChatMessage,
  type MessageChannel,
  type MessageChannelType,
  type MessagingParticipant,
  type ScheduledCall,
} from "@/lib/internal-messaging-data";
import { CLIENT_MESSAGING_OPTIONS } from "@/lib/client-messaging-config";
import { createInitialUsers } from "@/lib/user-management-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import {
  CalendarClock,
  Hash,
  Loader2,
  MessageSquare,
  Mic,
  Paperclip,
  Phone,
  Plus,
  Send,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";

const operators = createInitialUsers();

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

function MessageBody({
  message,
  isSelf,
}: {
  message: ChatMessage;
  isSelf: boolean;
}) {
  if (message.messageType === "call" && message.callLink) {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-sm leading-relaxed text-white/80">{message.content}</p>
        <a
          href={message.callLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/20"
        >
          <Video className="h-4 w-4" />
          Join call
        </a>
      </div>
    );
  }

  if (message.messageType === "file" && message.attachmentUrl) {
    return (
      <div className="mt-2 space-y-2">
        {message.content && message.content !== message.attachmentName && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
            {message.content}
          </p>
        )}
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
          <span className="truncate">{message.attachmentName ?? "Attachment"}</span>
        </a>
      </div>
    );
  }

  return (
    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
      {message.content}
    </p>
  );
}

export default function MessagingWorkspace() {
  const operatorsById = useMemo(
    () => new Map(operators.map((operator) => [operator.id, operator])),
    [],
  );

  const [joinedOperatorId, setJoinedOperatorId] = useState<string | null>(null);
  const [pendingOperatorId, setPendingOperatorId] = useState(operators[0]?.id ?? "");
  const [activeRoom, setActiveRoom] = useState(INTERNAL_MESSAGING_ROOM);
  const [channels, setChannels] = useState<MessageChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<MessagingParticipant[]>([]);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [createChannelError, setCreateChannelError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "polling">(
    "connecting",
  );
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>(
    operators.map((operator) => operator.id),
  );
  const [newChannelType, setNewChannelType] = useState<MessageChannelType>("internal");
  const [newChannelClientKey, setNewChannelClientKey] = useState("venturi");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [memberDraft, setMemberDraft] = useState<string[]>([]);
  const [activeCallLink, setActiveCallLink] = useState<string | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleParticipants, setScheduleParticipants] = useState<string[]>([]);
  const [scheduleCallType, setScheduleCallType] = useState<"voice" | "video">("video");
  const [scheduling, setScheduling] = useState(false);
  const { showDetail: showChat, openDetail: openChat, closeDetail: closeChat } = useMobileDetailPanel();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const joinedOperator = joinedOperatorId ? operatorsById.get(joinedOperatorId) : undefined;
  const isAdmin = joinedOperator?.role === "Admin";
  const showCreateChannelPanel = isAdmin || showCreateChannel;
  const activeChannel =
    channels.find((channel) => channel.room === activeRoom) ??
    ({
      id: "default",
      room: INTERNAL_MESSAGING_ROOM,
      name: "Internal Operations Room",
      channelType: "internal",
      clientKey: null,
      createdByOperatorId: "user-1",
      createdByOperatorName: "Paul Fotheringham",
      memberOperatorIds: operators.map((operator) => operator.id),
      memberClientUsernames: [],
      createdAt: new Date().toISOString(),
    } satisfies MessageChannel);

  const internalChannels = useMemo(
    () => channels.filter((channel) => channel.channelType === "internal"),
    [channels],
  );
  const clientChannels = useMemo(
    () => channels.filter((channel) => channel.channelType === "client"),
    [channels],
  );

  const channelMembers = useMemo(
    () =>
      activeChannel.memberOperatorIds
        .map((id) => operatorsById.get(id))
        .filter((operator): operator is NonNullable<typeof operator> => Boolean(operator)),
    [activeChannel.memberOperatorIds, operatorsById],
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadChannels = useCallback(async (operatorId?: string | null) => {
    const resolvedOperatorId = operatorId ?? operators[0]?.id ?? "user-1";
    const params = new URLSearchParams({
      viewerType: "internal",
      operatorId: resolvedOperatorId,
      viewerKey: resolvedOperatorId,
    });
    const response = await fetch(`/api/messaging/channels?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await readApiJson<{ channels?: MessageChannel[]; error?: string }>(response);
    if (!response.ok) throw new Error(data.error ?? "Failed to load channels");
    setChannels(data.channels ?? []);
    return data.channels ?? [];
  }, []);

  const markRead = useCallback(async (room: string, operatorId: string) => {
    await fetch("/api/messaging/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", viewerKey: operatorId, room }),
    });
    setChannels((current) =>
      current.map((channel) =>
        channel.room === room ? { ...channel, unreadCount: 0 } : channel,
      ),
    );
  }, []);

  const loadMessages = useCallback(async (room: string) => {
    const response = await fetch(`/api/messaging/messages?room=${encodeURIComponent(room)}`, {
      cache: "no-store",
    });
    const data = await readApiJson<{ messages?: ChatMessage[]; error?: string }>(response);
    if (!response.ok) throw new Error(data.error ?? "Failed to load messages");
    setMessages(data.messages ?? []);
  }, []);

  const loadScheduledCalls = useCallback(async (room: string) => {
    const response = await fetch(
      `/api/messaging/scheduled-calls?room=${encodeURIComponent(room)}`,
      { cache: "no-store" },
    );
    const data = await readApiJson<{ scheduledCalls?: ScheduledCall[]; error?: string }>(response);
    if (!response.ok) throw new Error(data.error ?? "Failed to load scheduled calls");
    setScheduledCalls(data.scheduledCalls ?? []);
  }, []);

  useEffect(() => {
    const storedOperator = window.localStorage.getItem(MESSAGING_STORAGE_KEY);
    const storedChannel = window.localStorage.getItem(MESSAGING_ACTIVE_CHANNEL_KEY);
    if (storedOperator && operatorsById.has(storedOperator)) {
      setJoinedOperatorId(storedOperator);
      setPendingOperatorId(storedOperator);
    }
    if (storedChannel) setActiveRoom(storedChannel);
  }, [operatorsById]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        await loadChannels(joinedOperatorId);
        await loadMessages(activeRoom);
        await loadScheduledCalls(activeRoom);
        if (joinedOperatorId) {
          await markRead(activeRoom, joinedOperatorId);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load messaging");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [activeRoom, joinedOperatorId, loadChannels, loadMessages, loadScheduledCalls, markRead]);

  useEffect(() => {
    if (!joinedOperatorId) return;
    void loadChannels(joinedOperatorId).catch(() => undefined);
  }, [joinedOperatorId, loadChannels]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!joinedOperator) return;

    const operator = joinedOperator;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null =
      null;
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;

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
          .channel(`internal-messaging:${activeRoom}`, {
            config: { presence: { key: operator.id } },
          })
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "internal_messages",
              filter: `room=eq.${activeRoom}`,
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

              if (row.operator_id.startsWith("client:")) {
                void loadChannels(operator.id).catch(() => undefined);
              } else if (row.operator_id !== operator.id && row.room === activeRoom) {
                void markRead(activeRoom, operator.id).catch(() => undefined);
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

            nextParticipants.sort((a, b) => a.operatorName.localeCompare(b.operatorName));
            setParticipants(nextParticipants);
          });

        await channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            setRealtimeStatus("live");
            await channel?.track({
              operator_id: operator.id,
              operator_name: operator.fullName,
              username: operator.username,
              joined_at: new Date().toISOString(),
            });
          }
        });
      } catch {
        if (cancelled) return;
        setRealtimeStatus("polling");
        pollTimer = setInterval(() => {
          void loadMessages(activeRoom).catch(() => undefined);
        }, 3000);
      }
    }

    setRealtimeStatus("connecting");
    void connectRealtime();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [joinedOperator, activeRoom, loadChannels, loadMessages, markRead]);

  function handleJoin(operatorId: string) {
    setJoinedOperatorId(operatorId);
    window.localStorage.setItem(MESSAGING_STORAGE_KEY, operatorId);
    setError(null);
  }

  function handleLeave() {
    setJoinedOperatorId(null);
    window.localStorage.removeItem(MESSAGING_STORAGE_KEY);
    setParticipants([]);
    setRealtimeStatus("connecting");
  }

  function selectChannel(room: string) {
    setActiveRoom(room);
    window.localStorage.setItem(MESSAGING_ACTIVE_CHANNEL_KEY, room);
    setShowAddMembers(false);
    openChat();
    if (joinedOperatorId) {
      void markRead(room, joinedOperatorId);
    }
  }

  async function postMessage(payload: {
    content: string;
    messageType?: ChatMessage["messageType"];
    attachmentName?: string | null;
    attachmentUrl?: string | null;
    attachmentMime?: string | null;
    callLink?: string | null;
  }) {
    if (!joinedOperator) return;

    const response = await fetch("/api/messaging/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorId: joinedOperator.id,
        operatorName: joinedOperator.fullName,
        username: joinedOperator.username,
        room: activeRoom,
        ...payload,
      }),
    });

    const data = await readApiJson<{ message?: ChatMessage; error?: string }>(response);
    if (!response.ok) throw new Error(data.error ?? "Failed to send message");

    if (data.message) {
      setMessages((current) => {
        if (current.some((message) => message.id === data.message!.id)) return current;
        return [...current, data.message!];
      });
    }
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!joinedOperator || !draft.trim()) return;

    setSending(true);
    setError(null);
    try {
      await postMessage({ content: draft.trim() });
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleCreateChannel(event?: React.FormEvent) {
    event?.preventDefault();

    if (!joinedOperator) {
      setCreateChannelError("Join as an operator before creating a channel.");
      return;
    }

    const trimmedName = newChannelName.trim();
    if (!trimmedName) {
      setCreateChannelError("Enter a channel name.");
      return;
    }

    const memberOperatorIds = newChannelPrivate
      ? Array.from(new Set([joinedOperator.id, ...newChannelMembers]))
      : newChannelMembers;

    const selectedClient =
      newChannelType === "client"
        ? CLIENT_MESSAGING_OPTIONS.find((client) => client.key === newChannelClientKey)
        : null;

    setCreatingChannel(true);
    setCreateChannelError(null);
    setError(null);
    try {
      const response = await fetch("/api/messaging/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          channelType: newChannelType,
          clientKey: newChannelType === "client" ? newChannelClientKey : undefined,
          createdByOperatorId: joinedOperator.id,
          createdByOperatorName: joinedOperator.fullName,
          memberOperatorIds,
          description: newChannelDescription.trim() || undefined,
          isPrivate: newChannelPrivate,
          memberClientUsernames:
            newChannelType === "client"
              ? Array.from(
                  new Set(
                    [newChannelClientKey, selectedClient?.username].filter(
                      (value): value is string => Boolean(value),
                    ),
                  ),
                )
              : undefined,
        }),
      });
      const data = await readApiJson<{ channel?: MessageChannel; error?: string }>(response);
      if (!response.ok || !data.channel) throw new Error(data.error ?? "Failed to create channel");

      await loadChannels(joinedOperator.id);
      setNewChannelName("");
      setNewChannelDescription("");
      setNewChannelPrivate(false);
      setNewChannelType("internal");
      setNewChannelClientKey(CLIENT_MESSAGING_OPTIONS[0]?.key ?? "venturi");
      setNewChannelMembers(operators.map((operator) => operator.id));
      if (!isAdmin) setShowCreateChannel(false);
      selectChannel(data.channel.room);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Failed to create channel";
      setCreateChannelError(message);
      setError(message);
    } finally {
      setCreatingChannel(false);
    }
  }

  async function handleSaveMembers() {
    if (!activeChannel.id || activeChannel.id === "default") return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/messaging/channels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: activeChannel.id,
          memberOperatorIds: memberDraft,
        }),
      });
      const data = await readApiJson<{ channel?: MessageChannel; error?: string }>(response);
      if (!response.ok || !data.channel) throw new Error(data.error ?? "Failed to update members");

      setChannels((current) =>
        current.map((channel) => (channel.id === data.channel!.id ? data.channel! : channel)),
      );
      setShowAddMembers(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update members");
    } finally {
      setSending(false);
    }
  }

  async function handleStartCall(type: "voice" | "video") {
    if (!joinedOperator) return;

    setSending(true);
    setError(null);
    try {
      const callLink = generateCallLink(type);
      await postMessage({
        content: `Started a ${type} call in ${activeChannel.name}.`,
        messageType: "call",
        callLink,
      });
      setActiveCallLink(callLink);
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : "Failed to start call");
    } finally {
      setSending(false);
    }
  }

  async function handleScheduleCall(event: React.FormEvent) {
    event.preventDefault();
    if (!joinedOperator || !scheduleTitle.trim() || !scheduleDate || !scheduleTime) return;

    setScheduling(true);
    setError(null);
    try {
      const callLink = generateCallLink(scheduleCallType);
      const scheduledAt = buildScheduledCallDateTime(scheduleDate, scheduleTime);
      const response = await fetch("/api/messaging/scheduled-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: activeRoom,
          title: scheduleTitle.trim(),
          scheduledAt,
          participantOperatorIds: scheduleParticipants,
          callLink,
          callType: scheduleCallType,
          createdByOperatorId: joinedOperator.id,
          createdByOperatorName: joinedOperator.fullName,
        }),
      });
      const data = await readApiJson<{ scheduledCall?: ScheduledCall; error?: string }>(response);
      if (!response.ok || !data.scheduledCall) {
        throw new Error(data.error ?? "Failed to schedule call");
      }

      setScheduledCalls((current) =>
        [...current, data.scheduledCall!].sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        ),
      );
      setScheduleTitle("");
      setScheduleDate("");
      setScheduleTime("");
      setScheduleParticipants([]);
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "Failed to schedule call");
    } finally {
      setScheduling(false);
    }
  }

  async function handleAttachFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !joinedOperator) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("room", activeRoom);

      const response = await fetch("/api/messaging/attachments", {
        method: "POST",
        body: formData,
      });
      const data = await readApiJson<{
        attachment?: { name: string; url: string; mimeType: string };
        error?: string;
      }>(response);
      if (!response.ok || !data.attachment) {
        throw new Error(data.error ?? "Failed to upload attachment");
      }

      await postMessage({
        content: draft.trim() || `Shared ${data.attachment.name}`,
        messageType: "file",
        attachmentName: data.attachment.name,
        attachmentUrl: data.attachment.url,
        attachmentMime: data.attachment.mimeType,
      });
      setDraft("");
    } catch (attachError) {
      setError(attachError instanceof Error ? attachError.message : "Failed to attach file");
    } finally {
      setUploading(false);
    }
  }

  function toggleMemberSelection(
    operatorId: string,
    current: string[],
    setter: (value: string[]) => void,
  ) {
    setter(
      current.includes(operatorId)
        ? current.filter((id) => id !== operatorId)
        : [...current, operatorId],
    );
  }

  function renderChannelButton(channel: MessageChannel) {
    const clientLabel =
      channel.channelType === "client"
        ? CLIENT_MESSAGING_OPTIONS.find((client) => client.key === channel.clientKey)?.label
        : null;

    return (
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
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium">{channel.name}</span>
            {clientLabel && (
              <span className="mt-0.5 block truncate text-[10px] text-violet-300/80">
                {clientLabel}
              </span>
            )}
          </div>
          <div className="ml-2 flex shrink-0 items-center gap-1.5">
            {(channel.unreadCount ?? 0) > 0 && (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-[#07111F]">
                {channel.unreadCount}
              </span>
            )}
            <span className="text-[10px] text-white/40">{channel.memberOperatorIds.length}</span>
          </div>
        </button>
      </li>
    );
  }

  function renderCreateChannelForm(options?: { className?: string; idPrefix?: string }) {
    const idPrefix = options?.idPrefix ?? "channel";
    const canSubmit = Boolean(joinedOperator) && !creatingChannel;

    return (
      <form
        onSubmit={(event) => void handleCreateChannel(event)}
        className={cn(
          "space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3",
          options?.className,
        )}
      >
        <div>
          <label
            htmlFor={`${idPrefix}-name`}
            className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45"
          >
            Channel name
          </label>
          <input
            id={`${idPrefix}-name`}
            value={newChannelName}
            onChange={(event) => {
              setNewChannelName(event.target.value);
              if (createChannelError) setCreateChannelError(null);
            }}
            placeholder="e.g. Oxford survey ops"
            autoFocus={idPrefix === "top"}
            className={cn(
              inputClassName(),
              "mt-1.5",
              createChannelError && !newChannelName.trim() && "border-amber-400/40",
            )}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-description`}
            className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45"
          >
            Description
          </label>
          <textarea
            id={`${idPrefix}-description`}
            value={newChannelDescription}
            onChange={(event) => setNewChannelDescription(event.target.value)}
            rows={2}
            placeholder="What is this channel for?"
            className={cn(inputClassName(), "mt-1.5 resize-y")}
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={newChannelPrivate}
            onChange={(event) => {
              const nextPrivate = event.target.checked;
              setNewChannelPrivate(nextPrivate);
              if (nextPrivate) {
                setNewChannelMembers(
                  joinedOperator ? [joinedOperator.id] : newChannelMembers.slice(0, 1),
                );
              } else {
                setNewChannelMembers(operators.map((operator) => operator.id));
              }
            }}
          />
          Private channel (invite-only members)
        </label>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
            Channel type
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNewChannelType("internal")}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                newChannelType === "internal"
                  ? "border-sky-400/40 bg-sky-500/10 text-white"
                  : "border-white/10 text-white/60 hover:bg-white/[0.04]",
              )}
            >
              Internal users
            </button>
            <button
              type="button"
              onClick={() => setNewChannelType("client")}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                newChannelType === "client"
                  ? "border-violet-400/40 bg-violet-500/10 text-white"
                  : "border-white/10 text-white/60 hover:bg-white/[0.04]",
              )}
            >
              External client
            </button>
          </div>
        </div>
        {newChannelType === "client" && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
              Client
            </p>
            <select
              value={newChannelClientKey}
              onChange={(event) => setNewChannelClientKey(event.target.value)}
              className={cn(inputClassName(), "mt-2")}
            >
              {CLIENT_MESSAGING_OPTIONS.map((client) => (
                <option key={client.key} value={client.key}>
                  {client.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
            {newChannelType === "client" ? "Internal team members" : "Add users"}
          </p>
          <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
            {operators.map((operator) => (
              <label
                key={operator.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/70"
              >
                <input
                  type="checkbox"
                  checked={newChannelMembers.includes(operator.id)}
                  onChange={() =>
                    toggleMemberSelection(operator.id, newChannelMembers, setNewChannelMembers)
                  }
                />
                {operator.fullName}
              </label>
            ))}
          </div>
        </div>
        {createChannelError && (
          <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {createChannelError}
          </p>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
        >
          {creatingChannel ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            "Create channel"
          )}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <section className="rounded-2xl border border-violet-400/25 bg-violet-500/5 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Create channel</h2>
              <p className="mt-1 text-xs text-white/50">
                Admins can spin up internal or client channels from here.
              </p>
            </div>
            {!joinedOperator && (
              <p className="text-xs text-amber-200/80">Join as an operator to create channels.</p>
            )}
          </div>
          <div className="mt-4">{renderCreateChannelForm({ idPrefix: "top" })}</div>
        </section>
      )}

    <ResponsiveMasterDetail
      showDetail={showChat}
      onBack={closeChat}
      backLabel="Back to channels"
      columnsClassName="xl:grid-cols-[320px_minmax(0,1fr)]"
      master={
      <aside className="space-y-4">
        <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-300" />
            <h2 className="text-sm font-semibold text-white">Join as operator</h2>
          </div>

          {!joinedOperator ? (
            <div className="mt-4 space-y-3">
              <select
                value={pendingOperatorId}
                onChange={(event) => setPendingOperatorId(event.target.value)}
                className={inputClassName()}
              >
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.fullName} (@{operator.username})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleJoin(pendingOperatorId)}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#2563eb] text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
              >
                Join messaging
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-sky-400/30 bg-sky-500/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300">
                Connected
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{joinedOperator.fullName}</p>
              <button
                type="button"
                onClick={handleLeave}
                className="mt-3 text-xs font-medium text-white/55 transition-colors hover:text-white"
              >
                Switch operator
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-violet-300" />
              <h2 className="text-sm font-semibold text-white">Channels</h2>
            </div>
            <button
              type="button"
              disabled={!joinedOperator}
              onClick={() => {
                setShowCreateChannel((current) => {
                  const next = !current;
                  if (next) setCreateChannelError(null);
                  return next;
                });
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Create channel
            </button>
          </div>

          {showCreateChannelPanel && joinedOperator && !isAdmin && (
            renderCreateChannelForm({ idPrefix: "sidebar" })
          )}

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Internal users
              </p>
              <ul className="mt-2 space-y-1.5">
                {(internalChannels.length > 0 ? internalChannels : [activeChannel]).map(
                  (channel) => renderChannelButton(channel),
                )}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                External clients
              </p>
              {clientChannels.length === 0 ? (
                <p className="mt-2 text-xs text-white/40">
                  No client channels yet. Create one to share with Westport.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {clientChannels.map((channel) => renderChannelButton(channel))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Online now
          </p>
          <ul className="mt-3 space-y-2">
            {participants.length === 0 ? (
              <li className="text-xs text-white/40">No operators in this channel yet.</li>
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

          <form onSubmit={(event) => void handleScheduleCall(event)} className="mt-5 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-300" />
              <h3 className="text-sm font-semibold text-white">Schedule a call</h3>
            </div>
            <div className="mt-3 space-y-2">
              <input
                value={scheduleTitle}
                onChange={(event) => setScheduleTitle(event.target.value)}
                placeholder="Call title"
                className={inputClassName()}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(event) => setScheduleDate(event.target.value)}
                  className={inputClassName()}
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(event) => setScheduleTime(event.target.value)}
                  className={inputClassName()}
                />
              </div>
              <select
                value={scheduleCallType}
                onChange={(event) =>
                  setScheduleCallType(event.target.value as "voice" | "video")
                }
                className={inputClassName()}
              >
                <option value="video">Video call</option>
                <option value="voice">Voice call</option>
              </select>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  People
                </p>
                <div className="mt-2 space-y-1.5">
                  {operators.map((operator) => (
                    <label
                      key={operator.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/70"
                    >
                      <input
                        type="checkbox"
                        checked={scheduleParticipants.includes(operator.id)}
                        onChange={() =>
                          toggleMemberSelection(
                            operator.id,
                            scheduleParticipants,
                            setScheduleParticipants,
                          )
                        }
                      />
                      {operator.fullName}
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={!joinedOperator || scheduling}
                className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
              >
                {scheduling ? "Scheduling…" : "Schedule call"}
              </button>
            </div>
          </form>

          {scheduledCalls.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Upcoming calls
              </p>
              {scheduledCalls.map((call) => (
                <div
                  key={call.id}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs"
                >
                  <p className="font-medium text-white">{call.title}</p>
                  <p className="mt-1 text-white/45">{formatScheduledCallTime(call.scheduledAt)}</p>
                  <a
                    href={call.callLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sky-300 underline-offset-2 hover:underline"
                  >
                    Open call link
                  </a>
                </div>
              ))}
            </div>
          )}

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
      <section className="flex min-h-[min(60dvh,640px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl xl:min-h-[min(72vh,760px)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{activeChannel.name}</h2>
                <p className="text-xs text-white/45">
                  {activeChannel.channelType === "client"
                    ? [
                        ...channelMembers.map((member) => member.fullName),
                        CLIENT_MESSAGING_OPTIONS.find(
                          (client) => client.key === activeChannel.clientKey,
                        )?.label ?? "Client",
                      ].join(" · ")
                    : channelMembers.map((member) => member.fullName).join(" · ") ||
                      "No members"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!joinedOperator}
                onClick={() => {
                  setMemberDraft(activeChannel.memberOperatorIds);
                  setShowAddMembers(true);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-semibold text-white/75 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add users
              </button>
              <button
                type="button"
                disabled={!joinedOperator || sending}
                onClick={() => void handleStartCall("voice")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Phone className="h-3.5 w-3.5" />
                Voice
              </button>
              <button
                type="button"
                disabled={!joinedOperator || sending}
                onClick={() => void handleStartCall("video")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
              >
                <Video className="h-3.5 w-3.5" />
                Video
              </button>
            </div>
          </div>

          {activeCallLink && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <span>Call started (simulated FlightHub 2 bridge)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeCallLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2"
                >
                  Join call
                </a>
                <button type="button" onClick={() => setActiveCallLink(null)} aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {showAddMembers && (
          <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-sm font-semibold text-white">Add users to channel</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {operators.map((operator) => (
                <label
                  key={operator.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/75"
                >
                  <input
                    type="checkbox"
                    checked={memberDraft.includes(operator.id)}
                    onChange={() =>
                      toggleMemberSelection(operator.id, memberDraft, setMemberDraft)
                    }
                  />
                  {operator.fullName}
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => void handleSaveMembers()}
                className="inline-flex h-9 items-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save members
              </button>
              <button
                type="button"
                onClick={() => setShowAddMembers(false)}
                className="inline-flex h-9 items-center rounded-xl border border-white/10 px-4 text-sm text-white/70"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-white/45">
              No messages yet. Send the first message in this channel.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isSelf = message.operatorId === joinedOperatorId;
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
                        <p className="text-sm font-semibold text-white">{message.operatorName}</p>
                        <p className="font-mono text-[10px] text-white/35">@{message.username}</p>
                        <p className="text-[10px] text-white/30">
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                      <MessageBody message={message} isSelf={isSelf} />
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {!joinedOperator && (
          <div className="border-t border-amber-400/25 bg-amber-500/10 px-5 py-4">
            <p className="text-sm font-semibold text-amber-100">Join as an operator to send messages</p>
            <p className="mt-1 text-xs text-amber-100/70">
              Pick your name, then join — you can also use the panel on the left.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={pendingOperatorId}
                onChange={(event) => setPendingOperatorId(event.target.value)}
                className={cn(inputClassName(), "sm:min-w-0 sm:flex-1")}
              >
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.fullName} (@{operator.username})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleJoin(pendingOperatorId)}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
              >
                Join messaging
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(event) => void handleSend(event)}
          className="border-t border-white/10 px-5 py-4"
        >
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => void handleAttachFile(event)}
            />
            <button
              type="button"
              disabled={!joinedOperator || uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
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
              disabled={!joinedOperator || sending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend(event);
                }
              }}
              placeholder={
                joinedOperator
                  ? `Message in ${activeChannel.name}…`
                  : "Join as an operator to send messages"
              }
              className="min-h-[52px] flex-1 resize-y rounded-xl border border-white/10 bg-[#0b1524] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-400/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!joinedOperator || sending || !draft.trim()}
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
      </section>
      }
    />
    </div>
  );
}

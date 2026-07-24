"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import MessagingCallRoom from "@/components/messaging/MessagingCallRoom";
import {
  buildScheduledCallDateTime,
  formatScheduledCallTime,
  INTERNAL_MESSAGING_ROOM,
  type ScheduledCall,
} from "@/lib/internal-messaging-data";
import {
  fetchCachedJson,
  PLATFORM_CACHE_KEYS,
} from "@/lib/platform-fetch-cache";
import { type ManagedUser } from "@/lib/user-management-data";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  History,
  Link2,
  Loader2,
  Mic,
  MonitorUp,
  Phone,
  Smartphone,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

type CommunicationsWorkspaceProps = {
  users?: ManagedUser[];
};

type PresenceStatus = "online" | "away" | "busy" | "offline";

function inputClassName() {
  return "w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50";
}

function formatOperatorLabel(operator: ManagedUser) {
  const email = operator.email || (operator.username.includes("@") ? operator.username : "");
  if (email) {
    const localPart = email.split("@")[0]?.trim();
    if (localPart) return `${localPart}@`;
    return email;
  }
  if (operator.username) return `@${operator.username}`;
  return operator.fullName || "Operator";
}

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function presenceDotClass(status: PresenceStatus) {
  switch (status) {
    case "online":
      return "bg-emerald-400";
    case "away":
      return "bg-amber-400";
    case "busy":
      return "bg-rose-400";
    default:
      return "bg-white/35";
  }
}

export default function CommunicationsWorkspace(_props: CommunicationsWorkspaceProps) {
  const searchParams = useSearchParams();
  const callParam = searchParams.get("call");
  const modeParam = searchParams.get("mode") === "voice" ? "voice" : "video";
  const scheduleParam = searchParams.get("schedule") === "1";
  const channelParam = searchParams.get("channel") || INTERNAL_MESSAGING_ROOM;

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [hostOperatorId, setHostOperatorId] = useState("");
  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    mode: "voice" | "video";
  } | null>(callParam ? { sessionId: callParam, mode: modeParam } : null);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [showSchedule, setShowSchedule] = useState(scheduleParam);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleCallType, setScheduleCallType] = useState<"voice" | "video">("video");
  const [scheduling, setScheduling] = useState(false);
  const [dialNumber, setDialNumber] = useState("");
  const [meetingChatDraft, setMeetingChatDraft] = useState("");
  const [meetingChat, setMeetingChat] = useState<string[]>([]);
  const [aiRecordMeeting, setAiRecordMeeting] = useState(false);
  const [aiTranscription, setAiTranscription] = useState(false);
  const [aiSummary, setAiSummary] = useState(false);
  const [aiActionItems, setAiActionItems] = useState(false);
  const [screenShareHint, setScreenShareHint] = useState(false);

  const activeOperators = useMemo(
    () => users.filter((user) => user.status === "Active"),
    [users],
  );

  const hostOperator = activeOperators.find((operator) => operator.id === hostOperatorId);

  const filteredOperators = useMemo(() => {
    const query = directoryQuery.trim().toLowerCase();
    if (!query) return activeOperators;
    return activeOperators.filter((operator) => {
      const haystack = [
        operator.fullName,
        operator.username,
        operator.email,
        operator.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activeOperators, directoryQuery]);

  const onlineOperators = useMemo(
    () => filteredOperators.slice(0, Math.max(3, Math.min(8, filteredOperators.length))),
    [filteredOperators],
  );

  useEffect(() => {
    if (callParam) {
      setActiveSession({ sessionId: callParam, mode: modeParam });
    }
    if (scheduleParam) setShowSchedule(true);
  }, [callParam, modeParam, scheduleParam]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setUsersLoading(true);
      try {
        const data = await fetchCachedJson<{ users?: ManagedUser[] }>(
          PLATFORM_CACHE_KEYS.users,
          "/api/users",
          { ttlMs: 60_000 },
        );
        if (cancelled) return;
        const nextUsers = data.users ?? [];
        setUsers(nextUsers);
        const firstActive = nextUsers.find((user) => user.status === "Active");
        setHostOperatorId((current) => current || firstActive?.id || "");
      } catch {
        if (!cancelled) setError("Failed to load contacts.");
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadScheduledCalls = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/messaging/scheduled-calls?room=${encodeURIComponent(channelParam)}`,
        { cache: "no-store" },
      );
      const data = await readApiJson<{ scheduledCalls?: ScheduledCall[]; error?: string }>(
        response,
      );
      if (!response.ok) throw new Error(data.error ?? "Failed to load call history");
      setScheduledCalls(data.scheduledCalls ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load call history");
    }
  }, [channelParam]);

  useEffect(() => {
    void loadScheduledCalls();
  }, [loadScheduledCalls]);

  async function startCall(type: "voice" | "video") {
    if (!hostOperator) {
      setError("Select a contact identity before starting a call.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/messaging/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callType: type,
          channelRoom: channelParam,
          hostOperatorId: hostOperator.id,
          hostOperatorName: hostOperator.fullName,
        }),
      });
      const data = await readApiJson<{ callLink?: string; error?: string }>(response);
      if (!response.ok || !data.callLink) {
        throw new Error(data.error ?? "Failed to create call room");
      }
      const match = data.callLink.match(/\/meet\/(voice|video)\/([^/?#]+)/i);
      if (!match?.[1] || !match[2]) throw new Error("Invalid call link returned");
      setMeetingLink(data.callLink);
      setActiveSession({
        sessionId: match[2],
        mode: match[1] === "voice" ? "voice" : "video",
      });
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Failed to start call");
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedule(event: React.FormEvent) {
    event.preventDefault();
    if (!hostOperator || !scheduleTitle.trim() || !scheduleDate || !scheduleTime) return;
    setScheduling(true);
    setError(null);
    try {
      const createResponse = await fetch("/api/messaging/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callType: scheduleCallType,
          channelRoom: channelParam,
          hostOperatorId: hostOperator.id,
          hostOperatorName: hostOperator.fullName,
        }),
      });
      const createData = await readApiJson<{ callLink?: string; error?: string }>(createResponse);
      if (!createResponse.ok || !createData.callLink) {
        throw new Error(createData.error ?? "Failed to create meeting link");
      }
      const scheduledAt = buildScheduledCallDateTime(scheduleDate, scheduleTime);
      const response = await fetch("/api/messaging/scheduled-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: channelParam,
          title: scheduleTitle.trim(),
          scheduledAt,
          participantOperatorIds: [hostOperator.id],
          callLink: createData.callLink,
          callType: scheduleCallType,
          createdByOperatorId: hostOperator.id,
          createdByOperatorName: hostOperator.fullName,
        }),
      });
      const data = await readApiJson<{ scheduledCall?: ScheduledCall; error?: string }>(response);
      if (!response.ok || !data.scheduledCall) {
        throw new Error(data.error ?? "Failed to schedule meeting");
      }
      setScheduledCalls((current) =>
        [...current, data.scheduledCall!].sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        ),
      );
      setMeetingLink(createData.callLink);
      setScheduleTitle("");
      setScheduleDate("");
      setScheduleTime("");
      setShowSchedule(false);
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "Failed to schedule");
    } finally {
      setScheduling(false);
    }
  }

  function joinScheduled(call: ScheduledCall) {
    const match = call.callLink.match(/\/meet\/(voice|video)\/([^/?#]+)/i);
    if (!match?.[1] || !match[2]) {
      window.open(call.callLink, "_blank", "noopener,noreferrer");
      return;
    }
    setMeetingLink(call.callLink);
    setActiveSession({
      sessionId: match[2],
      mode: match[1] === "voice" ? "voice" : "video",
    });
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">
              Live communication
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white">Communications</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/55">
              Voice, video, screen share, meeting links, and presence. Persistent chat stays in
              Messaging.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !hostOperator}
              onClick={() => void startCall("voice")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <Phone className="h-4 w-4" />
              Voice
            </button>
            <button
              type="button"
              disabled={busy || !hostOperator}
              onClick={() => void startCall("video")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
            >
              <Video className="h-4 w-4" />
              Video
            </button>
            <button
              type="button"
              disabled={!activeSession}
              onClick={() => setScreenShareHint(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-500/20 disabled:opacity-50"
            >
              <MonitorUp className="h-4 w-4" />
              Screen share
            </button>
            <button
              type="button"
              onClick={() => setShowSchedule((current) => !current)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20"
            >
              <CalendarClock className="h-4 w-4" />
              Schedule
            </button>
          </div>
        </div>
        {error ? (
          <p className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-300" />
              <h2 className="text-sm font-semibold text-white">Contacts</h2>
            </div>
            <select
              value={hostOperatorId}
              onChange={(event) => setHostOperatorId(event.target.value)}
              className={cn(inputClassName(), "mt-3")}
            >
              {usersLoading ? (
                <option value="">Loading…</option>
              ) : (
                activeOperators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {formatOperatorLabel(operator)}
                  </option>
                ))
              )}
            </select>
            <input
              value={directoryQuery}
              onChange={(event) => setDirectoryQuery(event.target.value)}
              placeholder="Search contacts…"
              className={cn(inputClassName(), "mt-2")}
            />
            <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
              {filteredOperators.map((operator, index) => {
                const status: PresenceStatus =
                  index < onlineOperators.length ? "online" : "offline";
                return (
                  <div
                    key={operator.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-white">{formatOperatorLabel(operator)}</p>
                      <p className="text-[11px] text-white/40">{operator.role || "Operator"}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/55">
                      <span className={cn("h-2 w-2 rounded-full", presenceDotClass(status))} />
                      {status === "online" ? "Online" : "Offline"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-300" />
              <h2 className="text-sm font-semibold text-white">Dial mobile</h2>
            </div>
            <p className="mt-1 text-[11px] text-white/40">
              Place an outbound mobile call from Communications.
            </p>
            <input
              value={dialNumber}
              onChange={(event) => setDialNumber(event.target.value)}
              placeholder="+44…"
              className={cn(inputClassName(), "mt-3")}
            />
            <button
              type="button"
              disabled={!dialNumber.trim()}
              onClick={() =>
                setError(
                  "Mobile dialling is available in Communications. Connect a telephony provider to place live outbound calls.",
                )
              }
              className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-sm font-semibold text-emerald-100 disabled:opacity-50"
            >
              <Phone className="h-3.5 w-3.5" />
              Dial
            </button>
          </section>
        </aside>

        <section className="min-h-[min(60dvh,640px)] overflow-hidden rounded-2xl border border-white/15 bg-[#020617] shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
          {activeSession ? (
            <div className="flex h-full min-h-[min(60dvh,640px)] flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-sky-100">
                <span className="inline-flex items-center gap-2">
                  {activeSession.mode === "voice" ? (
                    <Mic className="h-3.5 w-3.5" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  Live {activeSession.mode} session
                  {screenShareHint ? (
                    <span className="rounded-md border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px]">
                      Use Screen share in the call controls
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSession(null);
                    setScreenShareHint(false);
                  }}
                  className="rounded-md px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  End panel
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <MessagingCallRoom
                  sessionId={activeSession.sessionId}
                  expectedMode={activeSession.mode}
                  embedded
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[min(60dvh,640px)] flex-col items-center justify-center gap-3 px-6 text-center">
              <Video className="h-10 w-10 text-white/25" />
              <p className="text-sm font-semibold text-white/80">No live session</p>
              <p className="max-w-md text-sm text-white/45">
                Start a voice or video call, join from call history, or open a meeting link launched
                from Messaging.
              </p>
              {busy ? (
                <p className="inline-flex items-center gap-2 text-sm text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing room…
                </p>
              ) : null}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-sky-300" />
              <h2 className="text-sm font-semibold text-white">Meeting link</h2>
            </div>
            {meetingLink ? (
              <div className="mt-3 space-y-2">
                <p className="break-all rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-sky-100">
                  {meetingLink}
                </p>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(meetingLink)}
                  className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-white/10 text-sm text-white/75 hover:bg-white/[0.06]"
                >
                  Copy link
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/40">
                A shareable link appears when you start or schedule a meeting.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-amber-300" />
              <h2 className="text-sm font-semibold text-white">Call history</h2>
            </div>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {scheduledCalls.length === 0 ? (
                <p className="text-xs text-white/40">No scheduled or recent meetings yet.</p>
              ) : (
                scheduledCalls.map((call) => (
                  <button
                    key={call.id}
                    type="button"
                    onClick={() => joinScheduled(call)}
                    className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:bg-white/[0.06]"
                  >
                    <p className="text-sm text-white">{call.title}</p>
                    <p className="mt-1 text-[11px] text-white/45">
                      {formatScheduledCallTime(call.scheduledAt)} · {call.callType}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-xl">
            <h2 className="text-sm font-semibold text-white">Meeting chat</h2>
            <p className="mt-1 text-[11px] text-white/40">
              Ephemeral notes for the live session — not Messaging history.
            </p>
            <div className="mt-3 max-h-28 space-y-1 overflow-y-auto text-xs text-white/70">
              {meetingChat.length === 0 ? (
                <p className="text-white/35">No meeting chat yet.</p>
              ) : (
                meetingChat.map((line, index) => (
                  <p key={`${line}-${index}`} className="rounded-lg bg-white/[0.04] px-2 py-1">
                    {line}
                  </p>
                ))
              )}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const next = meetingChatDraft.trim();
                if (!next) return;
                setMeetingChat((current) => [...current, next]);
                setMeetingChatDraft("");
              }}
            >
              <input
                value={meetingChatDraft}
                onChange={(event) => setMeetingChatDraft(event.target.value)}
                placeholder="Send to meeting…"
                className={inputClassName()}
              />
              <button
                type="submit"
                className="rounded-xl border border-white/10 px-3 text-sm text-white/75 hover:bg-white/[0.06]"
              >
                Send
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-300" />
              <h2 className="text-sm font-semibold text-white">AI options</h2>
            </div>
            <p className="mt-1 text-[11px] text-white/40">Optional. All default off.</p>
            <div className="mt-3 space-y-1.5 text-xs text-white/75">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiRecordMeeting}
                  onChange={(event) => setAiRecordMeeting(event.target.checked)}
                />
                Record meeting
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiTranscription}
                  onChange={(event) => setAiTranscription(event.target.checked)}
                />
                AI transcription
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiSummary}
                  onChange={(event) => setAiSummary(event.target.checked)}
                />
                AI summary
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiActionItems}
                  onChange={(event) => setAiActionItems(event.target.checked)}
                />
                Action items
              </label>
            </div>
          </section>
        </aside>
      </div>

      {showSchedule ? (
        <form
          onSubmit={(event) => void handleSchedule(event)}
          className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5"
        >
          <h2 className="text-sm font-semibold text-amber-50">Schedule meeting</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <input
              value={scheduleTitle}
              onChange={(event) => setScheduleTitle(event.target.value)}
              placeholder="Meeting title"
              className={inputClassName()}
            />
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
            <select
              value={scheduleCallType}
              onChange={(event) =>
                setScheduleCallType(event.target.value === "voice" ? "voice" : "video")
              }
              className={inputClassName()}
            >
              <option value="video">Video</option>
              <option value="voice">Voice</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={scheduling || !hostOperator}
              className="inline-flex h-10 items-center rounded-xl bg-amber-500/90 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {scheduling ? "Scheduling…" : "Create meeting link"}
            </button>
            <button
              type="button"
              onClick={() => setShowSchedule(false)}
              className="inline-flex h-10 items-center rounded-xl border border-white/15 px-4 text-sm text-white/75"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

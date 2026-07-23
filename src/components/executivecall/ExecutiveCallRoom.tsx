"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import { useExecutiveCallWebRtc } from "@/hooks/useExecutiveCallWebRtc";
import { useSpeechTranscription } from "@/hooks/useSpeechTranscription";
import type { TranscriptLine } from "@/lib/executive-call-transcript-data";
import { resolveInternalOperationsBasePath } from "@/lib/internal-operations-data";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  ScreenShareOff,
  Send,
  Video,
  VideoOff,
} from "lucide-react";

type ExecutiveCallMeeting = {
  id: string;
  slug: string;
  name: string;
  organization: string;
  startsAt: string;
  endsAt: string;
  status: string;
  hostStarted: boolean;
  hostStartedAt: string | null;
  clientJoinedAt: string | null;
  hostLeftAt: string | null;
  clientLeftAt: string | null;
  guestsAdmitted: boolean;
  guestsAdmittedAt: string | null;
  transcriptSavedAt: string | null;
  transcriptFileId: string | null;
  formattedWhenGmt: string;
};

type SessionPayload = {
  meeting: ExecutiveCallMeeting;
  viewer: {
    isHost: boolean;
    displayName: string | null;
  };
  transcript: TranscriptLine[];
  saveResult?: {
    fileId: string;
    fileName: string;
    lineCount: number;
    alreadySaved?: boolean;
  } | null;
  saveError?: string | null;
};

type ExecutiveCallRoomProps = {
  slug: string;
  formattedWhenClient: string | null;
  clientTimezoneLabel: string;
};

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 160) || "Unexpected server response");
  }
}

function formatMessageTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function ExecutiveCallRoom({
  slug,
  formattedWhenClient,
  clientTimezoneLabel,
}: ExecutiveCallRoomProps) {
  const router = useRouter();
  const [payload, setPayload] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [leftCall, setLeftCall] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const hostLobbyStartedRef = useRef(false);
  const hostEndedNotifiedRef = useRef(false);

  const loadSession = useCallback(async () => {
    const response = await fetch(`/api/executivecall/${slug}`, { cache: "no-store" });
    const data = await readApiJson<SessionPayload & { error?: string }>(response);
    if (!response.ok) throw new Error(data.error ?? "Meeting not found");
    setPayload(data);
    return data;
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      void loadSession()
        .catch((loadError) => {
          if (!cancelled) {
            setError(loadError instanceof Error ? loadError.message : "Failed to load meeting");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    const interval = window.setInterval(() => {
      if (leftCall) return;
      void loadSession().catch(() => undefined);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadSession, leftCall]);

  useEffect(() => {
    if (!payload || payload.viewer.isHost) return;
    if (payload.meeting.clientJoinedAt) {
      startTransition(() => {
        setJoined(true);
      });
    }
  }, [payload?.meeting.clientJoinedAt, payload?.viewer.isHost]);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStream(null);
    setSharingScreen(false);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!payload || leftCall || payload.viewer.isHost) return;
    if (payload.meeting.hostLeftAt && joined && !hostEndedNotifiedRef.current) {
      hostEndedNotifiedRef.current = true;
      setLeftCall(true);
      stopMedia();
    }
  }, [joined, leftCall, payload, stopMedia]);

  const videoEnabledRef = useRef(videoEnabled);
  const audioEnabledRef = useRef(audioEnabled);

  useEffect(() => {
    videoEnabledRef.current = videoEnabled;
  }, [videoEnabled]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  const startMedia = useCallback(async () => {
    setMediaError(null);
    try {
      stopMedia();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      streamRef.current = stream;
      setLocalStream(stream);
      stream.getVideoTracks().forEach((track) => {
        track.enabled = videoEnabledRef.current;
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = audioEnabledRef.current;
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        void localVideoRef.current.play().catch(() => undefined);
      }
    } catch {
      setMediaError("Unable to access camera or microphone. Check browser permissions and try again.");
    }
  }, [stopMedia]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (!video || !localStream) return;
    video.srcObject = localStream;
    void video.play().catch(() => undefined);
  }, [localStream, payload?.meeting.hostStarted, joined, leftCall, videoEnabled]);

  const isParticipant = useMemo(() => {
    if (!payload || leftCall) return false;
    if (payload.viewer.isHost) return payload.meeting.hostStarted;
    return joined;
  }, [joined, leftCall, payload]);

  const webrtcEnabled = useMemo(() => {
    if (!payload || !isParticipant || leftCall) return false;
    if (!payload.meeting.guestsAdmitted) return false;
    if (payload.viewer.isHost) return Boolean(payload.meeting.clientJoinedAt);
    return joined;
  }, [isParticipant, joined, leftCall, payload]);

  const { remoteStream, connectionState, signalingError } = useExecutiveCallWebRtc({
    slug,
    role: payload?.viewer.isHost ? "host" : "guest",
    enabled: webrtcEnabled,
    localStream,
  });

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;
    video.srcObject = remoteStream;
    if (remoteStream) {
      void video.play().catch(() => undefined);
    }
  }, [remoteStream]);

  const toggleVideo = useCallback(() => {
    if (sharingScreen) return;
    setVideoEnabled((current) => {
      const next = !current;
      streamRef.current?.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, [sharingScreen]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((current) => {
      const next = !current;
      streamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    const camera = cameraStreamRef.current;
    if (camera) {
      streamRef.current = camera;
      setLocalStream(camera);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = camera;
        void localVideoRef.current.play().catch(() => undefined);
      }
    }
    setSharingScreen(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    setMediaError(null);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = display.getVideoTracks()[0];
      if (!screenTrack) throw new Error("No screen track");

      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = display;

      const audioTracks = (cameraStreamRef.current ?? streamRef.current)?.getAudioTracks() ?? [];
      const outbound = new MediaStream([screenTrack, ...audioTracks]);
      streamRef.current = outbound;
      setLocalStream(outbound);
      setSharingScreen(true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = outbound;
        void localVideoRef.current.play().catch(() => undefined);
      }
      screenTrack.onended = () => stopScreenShare();
    } catch {
      setMediaError("Unable to share screen. Check browser permissions and try again.");
    }
  }, [stopScreenShare]);

  useEffect(() => () => stopMedia(), [stopMedia]);

  const appendTranscriptLine = useCallback(
    async (text: string) => {
      if (!payload) return;
      const speaker = payload.viewer.isHost
        ? payload.viewer.displayName?.trim() || "Unit311 Host"
        : payload.meeting.name;

      const response = await fetch(`/api/executivecall/${slug}/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "append", speaker, text }),
      });
      const data = await readApiJson<{ lines?: TranscriptLine[]; error?: string }>(response);
      if (!response.ok) return;

      setPayload((current) =>
        current
          ? {
              ...current,
              transcript: data.lines ?? current.transcript,
            }
          : current,
      );
    },
    [payload, slug],
  );

  const transcriptionEnabled = useMemo(() => {
    if (!isParticipant || !audioEnabled || !payload) return false;
    if (payload.viewer.isHost) return payload.meeting.guestsAdmitted;
    return true;
  }, [audioEnabled, isParticipant, payload]);

  const transcriptionSpeaker = payload?.viewer.isHost
    ? payload.viewer.displayName?.trim() || "Unit311 Host"
    : payload?.meeting.name ?? "Guest";

  useSpeechTranscription({
    enabled: transcriptionEnabled,
    speaker: transcriptionSpeaker,
    onFinalTranscript: appendTranscriptLine,
  });

  const postAction = useCallback(
    async (action: string) => {
      const response = await fetch(`/api/executivecall/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await readApiJson<SessionPayload & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      setPayload(data);
      if (data.saveResult?.fileName) {
        setSaveMessage(`Meeting notes saved as ${data.saveResult.fileName} in the client CRM folder.`);
      } else if (data.saveError) {
        setError(data.saveError);
      }
      return data;
    },
    [slug],
  );

  useEffect(() => {
    if (!payload?.viewer.isHost || leftCall || hostLobbyStartedRef.current) return;
    hostLobbyStartedRef.current = true;

    void (async () => {
      try {
        if (!payload.meeting.hostStarted) {
          await postAction("start");
        }
        await startMedia();
      } catch (startError) {
        setError(startError instanceof Error ? startError.message : "Failed to open host room");
      }
    })();
  }, [payload?.viewer.isHost, payload?.meeting.hostStarted, leftCall, postAction, startMedia]);

  const guestMediaStartedRef = useRef(false);
  useEffect(() => {
    if (leftCall) {
      guestMediaStartedRef.current = false;
      return;
    }
    if (!payload?.meeting.hostStarted || payload.viewer.isHost || !joined) return;
    if (guestMediaStartedRef.current) return;
    guestMediaStartedRef.current = true;
    startTransition(() => {

      void startMedia();

    });
  }, [joined, leftCall, payload?.meeting.hostStarted, payload?.viewer.isHost, startMedia]);

  useEffect(() => {
    if (!leftCall || !payload?.viewer.isHost) return;
    const base = resolveInternalOperationsBasePath(
      typeof window !== "undefined" ? window.location.hostname : null,
    );
    router.replace(base === "/" ? "/?view=crm-meetings" : `${base}?view=crm-meetings`);
  }, [leftCall, payload?.viewer.isHost, router]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [payload?.transcript.length]);

  async function handleAdmitGuests() {
    setBusy(true);
    setError(null);
    try {
      await postAction("admit-guests");
    } catch (admitError) {
      setError(admitError instanceof Error ? admitError.message : "Failed to admit guests");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinMeeting() {
    setBusy(true);
    setError(null);
    try {
      await postAction("join");
      setJoined(true);
      await startMedia();
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Failed to join meeting");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeaveCall() {
    setBusy(true);
    setError(null);
    try {
      const data = await postAction(payload?.viewer.isHost ? "leave-host" : "leave-client");
      setLeftCall(true);
      stopMedia();
      if (data.viewer.isHost) {
        const base = resolveInternalOperationsBasePath(window.location.hostname);
        router.replace(base === "/" ? "/?view=crm-meetings" : `${base}?view=crm-meetings`);
      }
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : "Failed to leave call");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!payload) return;

    const text = chatDraft.trim();
    if (!text || sendingChat) return;

    setSendingChat(true);
    setError(null);

    try {
      await appendTranscriptLine(text);
      setChatDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setSendingChat(false);
    }
  }

  const canChat = useMemo(() => {
    if (!isParticipant || !payload) return false;
    if (payload.viewer.isHost) return payload.meeting.guestsAdmitted;
    return true;
  }, [isParticipant, payload]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/60">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="w-full max-w-lg rounded-2xl border border-red-400/25 bg-red-500/10 p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Meeting unavailable</h1>
          <p className="mt-3 text-sm text-red-100">{error}</p>
        </div>
      </div>
    );
  }

  if (!payload) return null;

  const { meeting, viewer } = payload;
  const isHost = viewer.isHost;
  const isGuest = !isHost;
  const isLive = meeting.hostStarted;
  const guestsAdmitted = meeting.guestsAdmitted;
  const waitingForAdmission = !guestsAdmitted && isGuest;
  const hostCanAdmit = isHost && isLive && !guestsAdmitted && !leftCall;
  const guestCanJoin = guestsAdmitted && isGuest && !joined && !leftCall;
  const callEndedForGuest = isGuest && (leftCall || Boolean(meeting.hostLeftAt));
  const transcriptSaved = Boolean(meeting.transcriptSavedAt);
  const whenLabel = formattedWhenClient ?? meeting.formattedWhenGmt;
  const hostLoginHref = `/login?next=${encodeURIComponent(`/executivecall/${slug}`)}`;

  const mediaControlClass = (enabled: boolean) =>
    enabled
      ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
      : "border-red-400/40 bg-red-500/15 text-red-100 hover:bg-red-500/20";

  if (callEndedForGuest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] px-5 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#07111f]/95 p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
          <h1 className="mt-6 text-2xl font-semibold text-white">The call has ended</h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Thank you for your participation. We will be in contact soon.
          </p>
          <p className="mt-6 text-sm text-white/45">
            A confirmation email is on its way — your report will follow shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-white/10 bg-[#07111f]/90 p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              Executive strategy session
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">{meeting.organization}</h1>
            <p className="mt-2 text-sm text-white/65">
              {meeting.name} · {whenLabel}
              {formattedWhenClient ? (
                <span className="text-white/45"> · GMT: {meeting.formattedWhenGmt}</span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-white/40">{clientTimezoneLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isHost && !isLive ? (
              <Link
                href={hostLoginHref}
                className="text-xs text-white/40 underline-offset-2 hover:text-white/60 hover:underline"
              >
                Staff login
              </Link>
            ) : null}

            {hostCanAdmit ? (
              <button
                type="button"
                onClick={() => void handleAdmitGuests()}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Allow users to enter"}
              </button>
            ) : null}

            {guestCanJoin ? (
              <button
                type="button"
                onClick={() => void handleJoinMeeting()}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join meeting"}
              </button>
            ) : null}

            {transcriptSaved ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                Notes saved
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {saveMessage ? (
        <p className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {saveMessage}
        </p>
      ) : null}

      {waitingForAdmission ? (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          Waiting for your Unit311 host to allow entry. This page will update automatically once the
          session opens.
        </div>
      ) : null}

      {isHost && isLive && !guestsAdmitted && !leftCall ? (
        <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-5 py-4 text-sm text-sky-100">
          You are in the host room. Check your camera and microphone, then click{" "}
          <span className="font-semibold">Allow users to enter</span> to start the call for your guest.
        </div>
      ) : null}

      {leftCall && isHost ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/70">
          You have ended the call for all participants.
          {transcriptSaved || saveMessage
            ? " Meeting notes were saved to the client CRM folder and the client has been emailed."
            : payload.transcript.length > 0
              ? " Meeting notes are being saved to the client CRM folder."
              : " The client has been emailed a thank-you message."}
        </div>
      ) : null}

      <div className="mt-6 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]/88">
          <div className="relative aspect-video w-full bg-black">
            {isParticipant ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={cn(
                    "h-full w-full object-cover",
                    remoteStream ? "" : "invisible",
                  )}
                />
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "absolute bottom-20 right-4 z-10 h-28 w-44 rounded-xl border border-white/20 bg-black object-cover shadow-lg sm:h-32 sm:w-52",
                    videoEnabled ? "" : "invisible",
                  )}
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/50">
                {leftCall && isHost
                  ? "Call ended. Returning to meetings…"
                  : guestCanJoin
                  ? "Join the meeting to turn on your camera."
                  : waitingForAdmission
                    ? "Waiting for the host to allow entry."
                    : isHost
                      ? "Connecting your camera…"
                      : "Video appears when the host opens the session."}
              </div>
            )}

            {isParticipant && !remoteStream ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#020617] px-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
                <p className="text-sm text-white/70">
                  {webrtcEnabled
                    ? connectionState === "connecting"
                      ? "Connecting voice and video…"
                      : "Waiting for the other participant to connect…"
                    : isHost
                      ? "Waiting for your guest to join before streaming…"
                      : "Starting your camera…"}
                </p>
                {!videoEnabled ? (
                  <p className="text-xs text-white/45">Your camera is off — they will still hear you if mic is on.</p>
                ) : null}
              </div>
            ) : null}

            {isParticipant && remoteStream && !videoEnabled ? (
              <div className="pointer-events-none absolute bottom-20 right-4 z-10 flex h-28 w-44 items-center justify-center rounded-xl border border-white/20 bg-[#020617] sm:h-32 sm:w-52">
                <VideoOff className="h-5 w-5 text-white/45" />
              </div>
            ) : null}

            {isParticipant ? (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 pb-4 pt-12">
                <button
                  type="button"
                  onClick={toggleVideo}
                  disabled={sharingScreen}
                  title={videoEnabled ? "Turn camera off" : "Turn camera on"}
                  className={cn(
                    "inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
                    mediaControlClass(videoEnabled),
                  )}
                >
                  {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleAudio}
                  title={audioEnabled ? "Mute microphone" : "Unmute microphone"}
                  className={cn(
                    "inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
                    mediaControlClass(audioEnabled),
                  )}
                >
                  {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => void (sharingScreen ? stopScreenShare() : startScreenShare())}
                  title={sharingScreen ? "Stop sharing screen" : "Share screen"}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                    sharingScreen
                      ? "border-amber-400/40 bg-amber-500/20 text-amber-100"
                      : "border-white/20 bg-white/10 text-white hover:bg-white/15",
                  )}
                >
                  {sharingScreen ? <ScreenShareOff className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
                  {sharingScreen ? "Stop share" : "Share"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleLeaveCall()}
                  disabled={busy}
                  title={isHost ? "End call for everyone" : "Leave call"}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/20 px-5 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/30 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PhoneOff className="h-4 w-4" />
                  )}
                  {isHost ? "End call" : "Leave"}
                </button>
              </div>
            ) : null}
          </div>

          {mediaError ? (
            <p className="border-t border-white/10 px-4 py-3 text-xs text-amber-100">{mediaError}</p>
          ) : null}
          {signalingError ? (
            <p className="border-t border-white/10 px-4 py-3 text-xs text-amber-100">{signalingError}</p>
          ) : null}
          {isParticipant && remoteStream ? (
            <p className="border-t border-white/10 px-4 py-2 text-[11px] text-white/40">
              Stream {connectionState === "connected" ? "connected" : connectionState}
            </p>
          ) : null}
        </section>

        <section className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-[#07111f]/88">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Chat</h2>
            <p className="mt-0.5 text-[11px] text-white/40">
              Typed messages and spoken words (when your mic is on) appear here and are saved to
              the client CRM folder when the host ends the call.
            </p>
          </div>

          <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {payload.transcript.length === 0 ? (
              <p className="text-sm text-white/45">
                {canChat
                  ? "Speak with your mic on or type a message — both are captured here."
                  : "Chat opens once you join the live meeting."}
              </p>
            ) : (
              payload.transcript.map((line) => (
                <div key={line.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-white/85">{line.speaker}</p>
                    <p className="text-[10px] text-white/40">{formatMessageTime(line.at)}</p>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-white/75">{line.text}</p>
                </div>
              ))
            )}
          </div>

          {canChat ? (
            <form
              onSubmit={(event) => void handleSendMessage(event)}
              className="border-t border-white/10 p-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="Type a message…"
                  disabled={sendingChat || leftCall}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-sky-400/50"
                />
                <button
                  type="submit"
                  disabled={sendingChat || !chatDraft.trim() || leftCall}
                  className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingChat ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}

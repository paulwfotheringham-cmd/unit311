"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import { useExecutiveCallWebRtc } from "@/hooks/useExecutiveCallWebRtc";
import { useSpeechTranscription } from "@/hooks/useSpeechTranscription";
import type { CalendarMeetingPayload } from "@/lib/calendar-meeting-service";
import type { TranscriptLine } from "@/lib/executive-call-transcript-data";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Save,
  ScreenShareOff,
  Video,
  VideoOff,
} from "lucide-react";

type CalendarMeetRoomProps = {
  eventId: string;
};

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 160) || "Unexpected server response");
  }
}

function connectionLabel(state: RTCPeerConnectionState) {
  switch (state) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting…";
    case "failed":
      return "Connection failed";
    case "disconnected":
      return "Disconnected";
    case "closed":
      return "Ended";
    default:
      return "Waiting for peer…";
  }
}

export default function CalendarMeetRoom({ eventId }: CalendarMeetRoomProps) {
  const [payload, setPayload] = useState<CalendarMeetingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [leftCall, setLeftCall] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const mediaStartedRef = useRef(false);
  const hostAutoStartedRef = useRef(false);

  const basePath = `/api/calendar/meetings/${eventId}`;

  const loadSession = useCallback(async () => {
    const response = await fetch(basePath, { cache: "no-store" });
    const data = await readApiJson<CalendarMeetingPayload & { error?: string }>(response);
    if (!response.ok) throw new Error(data.error ?? "Meeting not found");
    setPayload(data);
    return data;
  }, [basePath]);

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
  }, [leftCall, loadSession]);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStream(null);
    setSharingScreen(false);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

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
  }, [localStream, joined, leftCall, videoEnabled, sharingScreen]);

  const webrtcEnabled = useMemo(() => {
    if (!payload || !joined || leftCall || !localStream) return false;
    return Boolean(payload.meeting.hostStarted);
  }, [joined, leftCall, localStream, payload]);

  const { remoteStream, connectionState, signalingError } = useExecutiveCallWebRtc({
    slug: eventId,
    role: payload?.viewer.isHost ? "host" : "guest",
    enabled: webrtcEnabled,
    localStream,
    signalingBasePath: "/api/calendar/meetings",
  });

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;
    video.srcObject = remoteStream;
    if (remoteStream) void video.play().catch(() => undefined);
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

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch {
      setMediaError("Unable to share screen. Check browser permissions and try again.");
    }
  }, [stopScreenShare]);

  useEffect(() => () => stopMedia(), [stopMedia]);

  const appendTranscriptLine = useCallback(
    async (text: string) => {
      if (!payload) return;
      const speaker = payload.viewer.isHost
        ? payload.viewer.displayName?.trim() || "Host"
        : payload.meeting.guestName || guestName.trim() || "Guest";

      const response = await fetch(`${basePath}/transcript`, {
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
    [basePath, guestName, payload],
  );

  const transcriptionEnabled = useMemo(() => {
    return Boolean(joined && audioEnabled && !leftCall && payload?.meeting.hostStarted);
  }, [audioEnabled, joined, leftCall, payload?.meeting.hostStarted]);

  const transcriptionSpeaker = payload?.viewer.isHost
    ? payload.viewer.displayName?.trim() || "Host"
    : payload?.meeting.guestName || guestName.trim() || "Guest";

  useSpeechTranscription({
    enabled: transcriptionEnabled,
    speaker: transcriptionSpeaker,
    onFinalTranscript: appendTranscriptLine,
  });

  async function postAction(action: string, body: Record<string, unknown> = {}) {
    const response = await fetch(basePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await readApiJson<
      CalendarMeetingPayload & {
        error?: string;
        saveResult?: {
          fileName: string;
          organization: string;
          alreadySaved?: boolean;
        } | null;
        saveError?: string | null;
      }
    >(response);
    if (!response.ok) throw new Error(data.error ?? "Request failed");
    setPayload(data);
    if (data.saveResult?.fileName) {
      setSaveMessage(
        data.saveResult.alreadySaved
          ? `Notes already saved to ${data.saveResult.organization}.`
          : `Saved ${data.saveResult.fileName} into ${data.saveResult.organization}.`,
      );
    } else if (data.saveError) {
      setError(data.saveError);
    }
    return data;
  }

  useEffect(() => {
    if (!payload?.viewer.isHost || leftCall || hostAutoStartedRef.current) return;
    hostAutoStartedRef.current = true;
    void (async () => {
      try {
        if (!payload.meeting.hostStarted) {
          await postAction("start");
        }
        setJoined(true);
        if (!mediaStartedRef.current) {
          mediaStartedRef.current = true;
          await startMedia();
        }
      } catch (startError) {
        setError(startError instanceof Error ? startError.message : "Failed to start meeting");
      }
    })();
  }, [payload?.viewer.isHost, payload?.meeting.hostStarted, leftCall, startMedia]);

  async function handleJoinAsGuest() {
    setBusy(true);
    setError(null);
    try {
      await postAction("join", { guestName: guestName.trim() || "Guest" });
      setJoined(true);
      if (!mediaStartedRef.current) {
        mediaStartedRef.current = true;
        await startMedia();
      }
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Failed to join meeting");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    setBusy(true);
    setError(null);
    try {
      await postAction(payload?.viewer.isHost ? "leave-host" : "leave-guest");
      setLeftCall(true);
      setJoined(false);
      stopMedia();
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : "Failed to leave meeting");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveNotes() {
    setBusy(true);
    setError(null);
    try {
      await postAction("save-transcript", { force: true });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save notes");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#020617] text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Loading meeting…</span>
      </section>
    );
  }

  if (error && !payload) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#020617] px-5">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#07111f] p-8 text-center">
          <h1 className="text-lg font-semibold text-white">Unable to open meeting</h1>
          <p className="mt-2 text-sm text-white/55">{error}</p>
        </div>
      </section>
    );
  }

  if (leftCall) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#020617] px-5">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#07111f] p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <h1 className="mt-4 text-lg font-semibold text-white">Meeting ended</h1>
          {saveMessage ? <p className="mt-3 text-sm text-emerald-200">{saveMessage}</p> : null}
          <p className="mt-2 text-sm text-white/55">You can close this window.</p>
          {payload?.viewer.isHost ? (
            <Link
              href="/internaldashboard?view=calendar"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white"
            >
              Back to Calendar
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  if (!payload) return null;

  const isHost = payload.viewer.isHost;
  const waitingForHost = !isHost && !payload.meeting.hostStarted;

  return (
    <section className="flex min-h-screen flex-col bg-[#020617] text-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
            Calendar meeting
          </p>
          <h1 className="text-lg font-semibold">{payload.meeting.title}</h1>
          <p className="mt-1 text-xs text-white/50">
            Notes folder: {payload.folderHint.organization}
            {payload.folderHint.source !== "title" ? ` (${payload.folderHint.source})` : ""}
          </p>
        </div>
        <p className="text-xs text-white/50">{connectionLabel(connectionState)}</p>
      </header>

      <div className="relative flex flex-1 flex-col gap-4 px-5 py-6 lg:flex-row">
        <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={cn("h-full w-full object-contain", !remoteStream && "opacity-0")}
          />
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
              {waitingForHost
                ? "Waiting for the host to start…"
                : "Waiting for the other participant…"}
            </div>
          )}
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute bottom-4 right-4 h-28 w-40 rounded-xl border border-white/20 object-cover shadow-lg"
          />
        </div>

        <aside className="flex w-full flex-col rounded-2xl border border-white/10 bg-[#07111f] p-4 lg:w-80">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
            Live transcript
          </p>
          <div className="mt-3 flex-1 space-y-2 overflow-y-auto text-sm text-white/75">
            {payload.transcript.length === 0 ? (
              <p className="text-white/40">Speech is transcribed automatically while you are in the call.</p>
            ) : (
              payload.transcript.map((line) => (
                <p key={line.id}>
                  <span className="font-medium text-sky-200">{line.speaker}: </span>
                  {line.text}
                </p>
              ))
            )}
          </div>
          {isHost ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSaveNotes()}
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-sm font-semibold text-emerald-100 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save notes to folder
            </button>
          ) : null}
          {saveMessage ? <p className="mt-2 text-xs text-emerald-200">{saveMessage}</p> : null}
        </aside>
      </div>

      {(error || mediaError || signalingError) && (
        <p className="px-5 text-center text-sm text-rose-300">{error || mediaError || signalingError}</p>
      )}

      <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 px-5 py-5">
        {!joined && !isHost ? (
          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Your name"
              className="h-11 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white"
            />
            <button
              type="button"
              disabled={busy || waitingForHost}
              onClick={() => void handleJoinAsGuest()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Join meeting
            </button>
          </div>
        ) : joined ? (
          <>
            <button
              type="button"
              onClick={toggleAudio}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5"
              aria-label={audioEnabled ? "Mute" : "Unmute"}
            >
              {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={toggleVideo}
              disabled={sharingScreen}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 disabled:opacity-40"
              aria-label={videoEnabled ? "Stop camera" : "Start camera"}
            >
              {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => void (sharingScreen ? stopScreenShare() : startScreenShare())}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm",
                sharingScreen
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                  : "border-white/15 bg-white/5",
              )}
            >
              {sharingScreen ? <ScreenShareOff className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
              {sharingScreen ? "Stop share" : "Share screen"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleLeave()}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <PhoneOff className="h-4 w-4" />
              {isHost ? "End & save" : "Leave"}
            </button>
          </>
        ) : (
          <p className="text-sm text-white/55">Starting host room…</p>
        )}
      </footer>
    </section>
  );
}

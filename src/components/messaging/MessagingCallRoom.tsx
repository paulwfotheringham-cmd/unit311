"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import { useExecutiveCallWebRtc } from "@/hooks/useExecutiveCallWebRtc";
import type { MessagingCallSessionPayload } from "@/lib/messaging-call-service";
import { cn } from "@/lib/utils";
import { Loader2, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

type MessagingCallRoomProps = {
  sessionId: string;
  expectedMode: "voice" | "video";
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

export default function MessagingCallRoom({ sessionId, expectedMode }: MessagingCallRoomProps) {
  const [payload, setPayload] = useState<MessagingCallSessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [leftCall, setLeftCall] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(expectedMode === "video");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const mediaStartedRef = useRef(false);

  const isVoice = expectedMode === "voice";
  const signalingBasePath = "/api/messaging/calls";

  const loadSession = useCallback(async () => {
    const response = await fetch(`${signalingBasePath}/${sessionId}`, { cache: "no-store" });
    const data = await readApiJson<MessagingCallSessionPayload & { error?: string }>(response);
    if (!response.ok) throw new Error(data.error ?? "Call not found");
    setPayload(data);
    return data;
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      void loadSession()
        .catch((loadError) => {
          if (!cancelled) {
            setError(loadError instanceof Error ? loadError.message : "Failed to load call");
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
    streamRef.current = null;
    setLocalStream(null);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVoice ? false : true,
        audio: true,
      });
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
      setMediaError(
        isVoice
          ? "Unable to access microphone. Check browser permissions and try again."
          : "Unable to access camera or microphone. Check browser permissions and try again.",
      );
    }
  }, [isVoice, stopMedia]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (!video || !localStream || isVoice) return;
    video.srcObject = localStream;
    void video.play().catch(() => undefined);
  }, [isVoice, localStream, joined, leftCall, videoEnabled]);

  const webrtcEnabled = useMemo(() => {
    if (!payload || !joined || leftCall || !localStream) return false;
    return true;
  }, [joined, leftCall, localStream, payload]);

  const { remoteStream, connectionState, signalingError } = useExecutiveCallWebRtc({
    slug: sessionId,
    role: payload?.viewer.isHost ? "host" : "guest",
    enabled: webrtcEnabled,
    localStream,
    signalingBasePath,
    receiveVideo: !isVoice,
  });

  useEffect(() => {
    if (isVoice) {
      const audio = remoteAudioRef.current;
      if (!audio) return;
      audio.srcObject = remoteStream;
      if (remoteStream) void audio.play().catch(() => undefined);
      return;
    }
    const video = remoteVideoRef.current;
    if (!video) return;
    video.srcObject = remoteStream;
    if (remoteStream) void video.play().catch(() => undefined);
  }, [isVoice, remoteStream]);

  const toggleVideo = useCallback(() => {
    if (isVoice) return;
    setVideoEnabled((current) => {
      const next = !current;
      streamRef.current?.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, [isVoice]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((current) => {
      const next = !current;
      streamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, []);

  useEffect(() => () => stopMedia(), [stopMedia]);

  async function handleJoin() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${signalingBasePath}/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join" }),
      });
      const data = await readApiJson<MessagingCallSessionPayload & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to join call");
      if (data.room.callType !== expectedMode) {
        throw new Error(`This link is for a ${data.room.callType} call.`);
      }
      setPayload(data);
      setJoined(true);
      if (!mediaStartedRef.current) {
        mediaStartedRef.current = true;
        await startMedia();
      }
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Failed to join call");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    setBusy(true);
    setError(null);
    try {
      await fetch(`${signalingBasePath}/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      setLeftCall(true);
      setJoined(false);
      stopMedia();
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : "Failed to leave call");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#020617] text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Loading call…</span>
      </section>
    );
  }

  if (leftCall) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#020617] px-5">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#07111f] p-8 text-center">
          <h1 className="text-lg font-semibold text-white">Call ended</h1>
          <p className="mt-2 text-sm text-white/55">You can close this window and return to Messaging.</p>
          <Link
            href="/internaldashboard?view=messaging"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white"
          >
            Back to Messaging
          </Link>
        </div>
      </section>
    );
  }

  if (error && !payload) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#020617] px-5">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#07111f] p-8 text-center">
          <h1 className="text-lg font-semibold text-white">Unable to open call</h1>
          <p className="mt-2 text-sm text-white/55">{error}</p>
          <p className="mt-4 text-xs text-white/40">
            Sign in to Unit311 Central, then open the Join call link from Messaging.
          </p>
        </div>
      </section>
    );
  }

  const peerName = payload?.viewer.isHost
    ? payload.room.guestOperatorName || "Waiting for guest…"
    : payload?.room.hostOperatorName || "Host";

  return (
    <section className="flex min-h-screen flex-col bg-[#020617] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
            Messaging {isVoice ? "voice" : "video"}
          </p>
          <h1 className="text-lg font-semibold">
            {payload?.viewer.isHost ? "You are hosting" : "Joined call"} · {peerName}
          </h1>
        </div>
        <p className="text-xs text-white/50">{connectionLabel(connectionState)}</p>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-5 py-8">
        {isVoice ? (
          <>
            <audio ref={remoteAudioRef} autoPlay playsInline />
            <div className="flex h-48 w-48 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/10 text-sky-100">
              <Mic className="h-12 w-12" />
            </div>
            <p className="text-sm text-white/60">
              {remoteStream ? "Live audio connected" : "Waiting for the other participant…"}
            </p>
          </>
        ) : (
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black/40 aspect-video">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={cn("h-full w-full object-cover", !remoteStream && "opacity-0")}
            />
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                Waiting for the other participant…
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
        )}

        {(error || mediaError || signalingError) && (
          <p className="max-w-xl text-center text-sm text-rose-300">
            {error || mediaError || signalingError}
          </p>
        )}
      </div>

      <footer className="flex items-center justify-center gap-3 border-t border-white/10 px-5 py-5">
        {!joined ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleJoin()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isVoice ? <Mic className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            Join {isVoice ? "voice" : "video"} call
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleAudio}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5"
              aria-label={audioEnabled ? "Mute" : "Unmute"}
            >
              {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
            {!isVoice && (
              <button
                type="button"
                onClick={toggleVideo}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5"
                aria-label={videoEnabled ? "Stop camera" : "Start camera"}
              >
                {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleLeave()}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <PhoneOff className="h-4 w-4" />
              Leave
            </button>
          </>
        )}
      </footer>
    </section>
  );
}

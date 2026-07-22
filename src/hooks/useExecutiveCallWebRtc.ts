"use client";

import { useEffect, useRef, useState } from "react";

import type { WebrtcSenderRole, WebrtcSignal } from "@/lib/executive-call-webrtc-service";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const POLL_MS = 900;

type UseExecutiveCallWebRtcOptions = {
  slug: string;
  role: WebrtcSenderRole;
  enabled: boolean;
  localStream: MediaStream | null;
  /** Defaults to executive call signaling. Messaging uses `/api/messaging/calls`. */
  signalingBasePath?: string;
  receiveVideo?: boolean;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 160) || "Unexpected signaling response");
  }
}

async function postSignal(
  signalingBasePath: string,
  slug: string,
  senderRole: WebrtcSenderRole,
  signalType: WebrtcSignal["signalType"],
  payload: Record<string, unknown> = {},
) {
  const response = await fetch(`${signalingBasePath}/${slug}/webrtc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderRole, signalType, payload }),
  });
  const data = await readJson<{ error?: string }>(response);
  if (!response.ok) throw new Error(data.error ?? "Failed to post WebRTC signal");
}

export function useExecutiveCallWebRtc({
  slug,
  role,
  enabled,
  localStream,
  signalingBasePath = "/api/executivecall",
  receiveVideo = true,
}: UseExecutiveCallWebRtcOptions) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [signalingError, setSignalingError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const afterIsoRef = useRef<string | null>(null);
  const seenIdsRef = useRef(new Set<string>());
  const makingOfferRef = useRef(false);
  const hasRemoteDescriptionRef = useRef(false);
  const hasRemoteStreamRef = useRef(false);
  const guestReadyRef = useRef(false);
  const postedReadyRef = useRef(false);
  const signalingBasePathRef = useRef(signalingBasePath);
  const receiveVideoRef = useRef(receiveVideo);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    signalingBasePathRef.current = signalingBasePath;
  }, [signalingBasePath]);

  useEffect(() => {
    receiveVideoRef.current = receiveVideo;
  }, [receiveVideo]);

  useEffect(() => {
    if (!enabled || !localStream) {
      return;
    }

    let cancelled = false;
    let pollTimer: number | undefined;
    const basePath = signalingBasePathRef.current;

    const attachLocalTracks = (pc: RTCPeerConnection, stream: MediaStream) => {
      const senders = pc.getSenders();
      for (const track of stream.getTracks()) {
        const existing = senders.find((sender) => sender.track?.kind === track.kind);
        if (existing) {
          void existing.replaceTrack(track);
        } else {
          pc.addTrack(track, stream);
        }
      }
    };

    const ensurePeerConnection = () => {
      if (pcRef.current) return pcRef.current;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          hasRemoteStreamRef.current = true;
          setRemoteStream(stream);
          return;
        }
        setRemoteStream((current) => {
          const next = current ?? new MediaStream();
          next.addTrack(event.track);
          hasRemoteStreamRef.current = true;
          return next;
        });
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate || cancelled) return;
        void postSignal(basePath, slug, role, "ice-candidate", {
          candidate: event.candidate.toJSON(),
        }).catch(() => undefined);
      };

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
      };

      attachLocalTracks(pc, localStream);
      return pc;
    };

    const createOfferIfNeeded = async () => {
      if (role !== "host" || !guestReadyRef.current || makingOfferRef.current) return;
      const pc = ensurePeerConnection();
      if (pc.signalingState !== "stable") return;

      makingOfferRef.current = true;
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: receiveVideoRef.current,
        });
        await pc.setLocalDescription(offer);
        await postSignal(basePath, slug, role, "offer", {
          sdp: pc.localDescription?.toJSON?.() ?? {
            type: offer.type,
            sdp: offer.sdp,
          },
        });
      } finally {
        makingOfferRef.current = false;
      }
    };

    const handleSignal = async (signal: WebrtcSignal) => {
      if (seenIdsRef.current.has(signal.id)) return;
      seenIdsRef.current.add(signal.id);
      afterIsoRef.current = signal.createdAt;

      if (signal.signalType === "ready") {
        if (role === "host" && signal.senderRole === "guest") {
          guestReadyRef.current = true;
          await createOfferIfNeeded();
        }
        return;
      }

      if (signal.signalType === "hangup") {
        setRemoteStream(null);
        setConnectionState("closed");
        return;
      }

      const pc = ensurePeerConnection();

      if (signal.signalType === "offer" && role === "guest") {
        const sdp = signal.payload.sdp as RTCSessionDescriptionInit | undefined;
        if (!sdp) return;
        await pc.setRemoteDescription(sdp);
        hasRemoteDescriptionRef.current = true;
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await postSignal(basePath, slug, role, "answer", {
          sdp: pc.localDescription?.toJSON?.() ?? {
            type: answer.type,
            sdp: answer.sdp,
          },
        });
        return;
      }

      if (signal.signalType === "answer" && role === "host") {
        const sdp = signal.payload.sdp as RTCSessionDescriptionInit | undefined;
        if (!sdp || pc.signalingState !== "have-local-offer") return;
        await pc.setRemoteDescription(sdp);
        hasRemoteDescriptionRef.current = true;
        return;
      }

      if (signal.signalType === "ice-candidate") {
        const candidate = signal.payload.candidate as RTCIceCandidateInit | undefined;
        if (!candidate) return;
        try {
          if (!hasRemoteDescriptionRef.current && !pc.remoteDescription) {
            await new Promise((resolve) => window.setTimeout(resolve, 250));
          }
          await pc.addIceCandidate(candidate);
        } catch {
          // Ignore late/duplicate ICE candidates during renegotiation.
        }
      }
    };

    const poll = async () => {
      if (cancelled) return;
      try {
        const params = new URLSearchParams();
        if (afterIsoRef.current) params.set("after", afterIsoRef.current);
        params.set("excludeRole", role);
        const response = await fetch(`${basePath}/${slug}/webrtc?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await readJson<{ signals?: WebrtcSignal[]; error?: string }>(response);
        if (!response.ok) throw new Error(data.error ?? "Failed to poll WebRTC signals");
        for (const signal of data.signals ?? []) {
          await handleSignal(signal);
        }
        setSignalingError(null);
      } catch (error) {
        if (!cancelled) {
          setSignalingError(error instanceof Error ? error.message : "WebRTC signaling failed");
        }
      } finally {
        if (!cancelled) {
          pollTimer = window.setTimeout(() => void poll(), POLL_MS);
        }
      }
    };

    void (async () => {
      try {
        ensurePeerConnection();

        if (!postedReadyRef.current) {
          postedReadyRef.current = true;
          await postSignal(basePath, slug, role, "ready", {});
          if (role === "guest") {
            guestReadyRef.current = true;
          }
        }

        await poll();
      } catch (error) {
        if (!cancelled) {
          setSignalingError(error instanceof Error ? error.message : "Failed to start WebRTC");
        }
      }
    })();

    const readyNudge = window.setInterval(() => {
      if (cancelled || hasRemoteStreamRef.current || hasRemoteDescriptionRef.current) return;
      void postSignal(basePath, slug, role, "ready", {}).catch(() => undefined);
      if (role === "host") {
        guestReadyRef.current = true;
        void createOfferIfNeeded().catch(() => undefined);
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(readyNudge);
      if (pollTimer) window.clearTimeout(pollTimer);
      void postSignal(basePath, slug, role, "hangup", {}).catch(() => undefined);
      pcRef.current?.close();
      pcRef.current = null;
      makingOfferRef.current = false;
      hasRemoteDescriptionRef.current = false;
      hasRemoteStreamRef.current = false;
      guestReadyRef.current = false;
      postedReadyRef.current = false;
      seenIdsRef.current.clear();
      afterIsoRef.current = null;
      setRemoteStream(null);
      setConnectionState("closed");
    };
  }, [enabled, localStream, role, slug, signalingBasePath, receiveVideo]);

  // Keep senders in sync if local tracks are replaced while connected.
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || !localStream || !enabled) return;
    for (const track of localStream.getTracks()) {
      const sender = pc.getSenders().find((item) => item.track?.kind === track.kind);
      if (sender && sender.track !== track) {
        void sender.replaceTrack(track);
      }
    }
  }, [enabled, localStream]);

  return {
    remoteStream,
    connectionState,
    signalingError,
  };
}

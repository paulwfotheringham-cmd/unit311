# Unit311 Central — Voice & Video Architecture

Reference architecture for **Executive Call** real-time voice and video (1:1 founder / strategy sessions).

Surface: `/executivecall/[slug]`  
Internal docs home: Unit311 Details → **Voice & Video**

---

## Purpose

Enable a live two-party call between:

| Role | Who | Auth |
| --- | --- | --- |
| Host | Unit311 internal operator | Platform session (`userType=internal`) |
| Guest | Booked founder-session client | Meeting slug + booking identity |

Audio and video are streamed peer-to-peer with WebRTC. Meeting lifecycle, chat, and transcript remain on Unit311 APIs + Supabase.

---

## High-level flow

```
Guest browser                    Host browser
     |                                |
     |  getUserMedia (local A/V)      |  getUserMedia (local A/V)
     |                                |
     |-------- ready / offer / answer / ICE --------|
     |         POST/GET /api/executivecall/[slug]/webrtc
     |                                |
     |<======= RTP media (WebRTC P2P) =======>|
     |                                |
```

Signaling is **not** a media path. Media (RTP) flows browser ↔ browser after SDP/ICE complete. Signaling messages are stored in Postgres and polled by both peers.

---

## Components

| Layer | Piece | Role |
| --- | --- | --- |
| UI | `ExecutiveCallRoom` | Lobby, admit/join, local PiP + remote main video, chat, leave |
| Hook | `useExecutiveCallWebRtc` | `RTCPeerConnection`, offer/answer, ICE, remote stream |
| Meeting API | `/api/executivecall/[slug]` | Start, admit guests, join, leave, session poll |
| Signaling API | `/api/executivecall/[slug]/webrtc` | Post/poll SDP + ICE; host can clear |
| Service | `executive-call-webrtc-service` | Persist signals |
| DB | `executive_call_webrtc_signals` | Offer / answer / ice-candidate / ready / hangup |
| Booking | `founder_session_bookings` | Host/guest presence, admit gate, transcript |

---

## Connection rules

1. Host opens room → local camera/mic only (preview).
2. Host clicks **Allow users to enter** → `guests_admitted_at` set.
3. Guest clicks **Join meeting** → `client_joined_at` set; local media starts.
4. WebRTC enables when **both** are in-call (`guestsAdmitted` + guest joined for host).
5. Host clears prior signals, both post `ready`.
6. Host creates **offer**; guest returns **answer**; both exchange **ICE**.
7. Remote video fills the main stage; local video is picture-in-picture.
8. Leave / host end posts `hangup` and closes the peer connection.

---

## Signaling message types

| `signal_type` | Sender | Payload |
| --- | --- | --- |
| `ready` | host or guest | `{}` |
| `offer` | host | `{ sdp }` |
| `answer` | guest | `{ sdp }` |
| `ice-candidate` | either | `{ candidate }` |
| `hangup` | either | `{}` |

Poll: `GET .../webrtc?after=<iso>&excludeRole=<ownRole>` (~900ms).

---

## ICE / NAT

Current production uses public **STUN** only:

- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

This covers most desktop/mobile networks. Strict enterprise NATs or some mobile carriers may need a **TURN** relay (future: self-hosted or managed TURN credentials in env).

---

## What is intentionally out of scope (today)

| Topic | Status |
| --- | --- |
| Multi-party (3+) rooms | Not supported — 1:1 only |
| SFU / LiveKit / Daily | Not used — direct WebRTC |
| Screen share | Not implemented |
| Recording of A/V | Not implemented (chat/transcript only) |
| Meet stub `/meet/video/...` | Legacy placeholder — Executive Call is canonical |

---

## Related files

| Path | Notes |
| --- | --- |
| `src/components/executivecall/ExecutiveCallRoom.tsx` | Call UI |
| `src/hooks/useExecutiveCallWebRtc.ts` | Peer connection + poll loop |
| `src/app/api/executivecall/[slug]/webrtc/route.ts` | Signaling HTTP API |
| `src/lib/executive-call-webrtc-service.ts` | DB access |
| `src/lib/executive-call-meeting-service.ts` | Meeting state machine |
| `supabase/migrations/085_executive_call_webrtc_signals.sql` | Signals table |

---

## Operational checklist

- [ ] Host and guest both grant camera/mic permissions
- [ ] Host admits guests before expecting remote video
- [ ] Guest has joined (not only waiting in lobby)
- [ ] Both browsers support WebRTC (Chromium / Safari / Firefox current)
- [ ] If connect hangs behind corporate firewall, plan TURN

---

## Version

| Field | Value |
| --- | --- |
| Doc version | 1.0 |
| Feature | Executive Call WebRTC 1:1 |
| Last updated | 2026-07-17 |

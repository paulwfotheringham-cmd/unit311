-- WebRTC signaling for Executive Call 1:1 voice/video streaming.

create table if not exists public.executive_call_webrtc_signals (
  id uuid primary key default gen_random_uuid(),
  meeting_slug text not null,
  sender_role text not null
    check (sender_role in ('host', 'guest')),
  signal_type text not null
    check (signal_type in ('offer', 'answer', 'ice-candidate', 'hangup', 'ready')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists executive_call_webrtc_signals_slug_created_idx
  on public.executive_call_webrtc_signals (meeting_slug, created_at);

create index if not exists executive_call_webrtc_signals_slug_role_idx
  on public.executive_call_webrtc_signals (meeting_slug, sender_role, created_at);

comment on table public.executive_call_webrtc_signals is
  'SDP/ICE signaling messages for Unit311 Executive Call WebRTC (host <-> guest).';

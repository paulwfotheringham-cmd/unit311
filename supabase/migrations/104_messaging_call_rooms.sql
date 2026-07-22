-- Messaging live voice/video call rooms (1:1 WebRTC via executive_call_webrtc_signals).
create table if not exists public.messaging_call_rooms (
  session_id text primary key,
  workspace_id uuid not null,
  channel_room text not null,
  call_type text not null check (call_type in ('voice', 'video')),
  host_operator_id text not null,
  host_operator_name text not null default '',
  host_joined_at timestamptz,
  guest_operator_id text,
  guest_operator_name text,
  guest_joined_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messaging_call_rooms_workspace_idx
  on public.messaging_call_rooms (workspace_id, created_at desc);

create index if not exists messaging_call_rooms_channel_idx
  on public.messaging_call_rooms (channel_room, created_at desc);

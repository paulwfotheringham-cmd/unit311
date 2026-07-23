-- Live calendar meeting sessions (WebRTC + transcript) keyed by calendar event id.
create table if not exists public.calendar_meeting_sessions (
  event_id uuid primary key references public.internal_calendar_events (id) on delete cascade,
  workspace_id uuid not null,
  host_started_at timestamptz,
  host_left_at timestamptz,
  guest_name text,
  guest_joined_at timestamptz,
  guest_left_at timestamptz,
  transcript_draft jsonb not null default '[]'::jsonb,
  transcript_file_id text,
  transcript_saved_at timestamptz,
  folder_organization text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_meeting_sessions_workspace_idx
  on public.calendar_meeting_sessions (workspace_id, created_at desc);

alter table public.calendar_meeting_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_meeting_sessions'
      and policyname = 'calendar_meeting_sessions_all'
  ) then
    create policy calendar_meeting_sessions_all on public.calendar_meeting_sessions
      for all using (true) with check (true);
  end if;
end $$;

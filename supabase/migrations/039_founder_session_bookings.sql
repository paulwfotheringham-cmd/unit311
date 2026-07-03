-- Founder session bookings from unit311central.com/book

create table if not exists public.founder_session_bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization text not null,
  email text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  video_link text not null,
  calendar_event_id uuid references public.internal_calendar_events(id) on delete set null,
  confirmation_sent_at timestamptz,
  internal_notification_sent_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists founder_session_bookings_starts_at_uidx
  on public.founder_session_bookings (starts_at);

create index if not exists founder_session_bookings_reminder_idx
  on public.founder_session_bookings (starts_at, reminder_sent_at);

alter table public.founder_session_bookings enable row level security;

create policy "founder_session_bookings_all" on public.founder_session_bookings
  for all using (true) with check (true);

alter table public.founder_session_bookings replica identity full;

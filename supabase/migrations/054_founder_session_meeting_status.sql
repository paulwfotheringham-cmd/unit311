alter table public.founder_session_bookings
  add column if not exists meeting_slug text,
  add column if not exists status text not null default 'scheduled',
  add column if not exists start_reminder_sent_at timestamptz;

create unique index if not exists founder_session_bookings_meeting_slug_uidx
  on public.founder_session_bookings (meeting_slug)
  where meeting_slug is not null;

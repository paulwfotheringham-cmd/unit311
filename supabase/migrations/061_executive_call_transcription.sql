-- Executive call room state and live transcription

alter table public.founder_session_bookings
  add column if not exists host_started_at timestamptz,
  add column if not exists client_joined_at timestamptz,
  add column if not exists host_left_at timestamptz,
  add column if not exists client_left_at timestamptz,
  add column if not exists transcript_draft jsonb not null default '[]'::jsonb,
  add column if not exists transcript_file_id uuid references public.file_objects (id) on delete set null,
  add column if not exists transcript_saved_at timestamptz;

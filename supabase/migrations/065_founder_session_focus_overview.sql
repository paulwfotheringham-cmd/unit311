-- Pre-meeting focus selections and overview PDF from /book thank-you flow

alter table public.founder_session_bookings
  add column if not exists focus_selections jsonb,
  add column if not exists focus_overview_pdf_file_id uuid references public.file_objects (id) on delete set null,
  add column if not exists focus_selections_submitted_at timestamptz;

create index if not exists founder_session_bookings_focus_pdf_idx
  on public.founder_session_bookings (focus_overview_pdf_file_id)
  where focus_overview_pdf_file_id is not null;

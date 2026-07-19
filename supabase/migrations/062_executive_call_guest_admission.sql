-- Separate host lobby from guest admission on executive calls

alter table public.founder_session_bookings
  add column if not exists guests_admitted_at timestamptz;

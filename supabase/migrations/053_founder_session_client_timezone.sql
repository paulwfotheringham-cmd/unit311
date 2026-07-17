alter table public.founder_session_bookings
  add column if not exists client_timezone text;

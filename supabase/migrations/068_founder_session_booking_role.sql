-- Contact role from unit311central.com/book

alter table public.founder_session_bookings
  add column if not exists role text;

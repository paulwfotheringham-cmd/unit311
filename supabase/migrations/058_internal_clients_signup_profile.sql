-- Signup profile fields for internal client records

alter table public.internal_clients
  add column if not exists job_title text not null default '',
  add column if not exists company_address text not null default '',
  add column if not exists invoice_email text not null default '';

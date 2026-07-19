-- Store complete signup billing profile until email verification creates the Client.
alter table public.platform_users
  add column if not exists signup_billing_profile jsonb;

-- Structured billing fields on Client (invoice defaults).
alter table public.internal_clients
  add column if not exists primary_contact_first_name text not null default '',
  add column if not exists primary_contact_surname text not null default '',
  add column if not exists company_city text not null default '',
  add column if not exists company_postcode text not null default '',
  add column if not exists company_country text not null default '',
  add column if not exists billing_same_as_company boolean not null default true;

comment on column public.internal_clients.invoice_email is
  'Accounts Payable email — default recipient for client invoices.';

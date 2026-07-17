-- Email verification for platform signups

alter table public.platform_users
  add column if not exists email_verified_at timestamptz;

create table if not exists public.platform_email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  platform_user_id uuid not null references public.platform_users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists platform_email_verification_tokens_token_hash_uidx
  on public.platform_email_verification_tokens (token_hash);

create index if not exists platform_email_verification_tokens_user_active_idx
  on public.platform_email_verification_tokens (platform_user_id, expires_at)
  where used_at is null;

alter table public.platform_email_verification_tokens enable row level security;

create policy "platform_email_verification_tokens_all" on public.platform_email_verification_tokens
  for all using (true) with check (true);

-- Payment submission tracking

alter table public.platform_organisations
  add column if not exists payment_submitted_at timestamptz,
  add column if not exists invoice_file_path text;

alter table public.internal_clients
  add column if not exists platform_organisation_id uuid;

create index if not exists internal_clients_platform_organisation_id_idx
  on public.internal_clients (platform_organisation_id)
  where platform_organisation_id is not null;

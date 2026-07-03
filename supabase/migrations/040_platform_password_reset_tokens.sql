-- Self-service password reset tokens for platform_users

create table if not exists public.platform_password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  platform_user_id uuid not null references public.platform_users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists platform_password_reset_tokens_token_hash_uidx
  on public.platform_password_reset_tokens (token_hash);

create index if not exists platform_password_reset_tokens_user_active_idx
  on public.platform_password_reset_tokens (platform_user_id, expires_at)
  where used_at is null;

alter table public.platform_password_reset_tokens enable row level security;

create policy "platform_password_reset_tokens_all" on public.platform_password_reset_tokens
  for all using (true) with check (true);

alter table public.platform_password_reset_tokens replica identity full;

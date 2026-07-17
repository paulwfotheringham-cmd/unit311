-- Organisations for platform sign-ups (multiple users can belong to one organisation)

create table if not exists public.platform_organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  primary_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_organisations_name_idx
  on public.platform_organisations (name);

alter table public.platform_organisations enable row level security;

drop policy if exists "platform_organisations_all" on public.platform_organisations;
create policy "platform_organisations_all" on public.platform_organisations
  for all using (true) with check (true);

alter table public.platform_users
  add column if not exists organisation_id uuid references public.platform_organisations (id);

create index if not exists platform_users_organisation_id_idx
  on public.platform_users (organisation_id);

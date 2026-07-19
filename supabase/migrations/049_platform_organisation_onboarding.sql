-- Organisation slugs, payment verification, and onboarding responses

alter table public.platform_organisations
  add column if not exists slug text,
  add column if not exists logo_path text,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

create unique index if not exists platform_organisations_slug_unique
  on public.platform_organisations (slug)
  where slug is not null;

create table if not exists public.platform_organisation_onboarding (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.platform_organisations (id) on delete cascade,
  module_selection_mode text not null default 'all' check (module_selection_mode in ('all', 'choose')),
  selected_modules jsonb not null default '[]'::jsonb,
  import_clients_csv boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id)
);

create index if not exists platform_organisation_onboarding_org_idx
  on public.platform_organisation_onboarding (organisation_id);

alter table public.platform_organisation_onboarding enable row level security;

drop policy if exists "platform_organisation_onboarding_all" on public.platform_organisation_onboarding;
create policy "platform_organisation_onboarding_all" on public.platform_organisation_onboarding
  for all using (true) with check (true);

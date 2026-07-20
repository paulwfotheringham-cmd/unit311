-- FDR-PRM-003-PHASE0 — Integration Framework skeleton
-- Provider registry + workspace connections. No adapters. No module cutovers.

create table if not exists public.integration_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  category text not null,
  display_name text not null,
  auth_methods jsonb not null default '[]'::jsonb,
  default_capabilities jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_providers_category_check check (
    category in (
      'banking',
      'email',
      'calendar',
      'messaging',
      'payments',
      'shipping',
      'storage',
      'ai'
    )
  )
);

create index if not exists integration_providers_category_idx
  on public.integration_providers (category);

create index if not exists integration_providers_active_idx
  on public.integration_providers (is_active);

create table if not exists public.workspace_integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  provider_id uuid not null references public.integration_providers (id) on delete restrict,
  category text not null,
  enabled boolean not null default true,
  status text not null default 'disconnected',
  manual_mode boolean not null default false,
  auth_method text,
  is_default_for_category boolean not null default false,
  display_label text,
  credentials_encrypted text,
  credentials_key_id text,
  config jsonb not null default '{}'::jsonb,
  capabilities jsonb not null default '[]'::jsonb,
  notes text,
  last_health_at timestamptz,
  last_health_status text,
  last_error text,
  last_tested_at timestamptz,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_integration_connections_workspace_provider_key
    unique (workspace_id, provider_id),
  constraint workspace_integration_connections_status_check check (
    status in ('disconnected', 'connected', 'error')
  ),
  constraint workspace_integration_connections_category_check check (
    category in (
      'banking',
      'email',
      'calendar',
      'messaging',
      'payments',
      'shipping',
      'storage',
      'ai'
    )
  ),
  constraint workspace_integration_connections_health_check check (
    last_health_status is null
    or last_health_status in ('healthy', 'degraded', 'failed', 'unknown')
  )
);

create index if not exists workspace_integration_connections_workspace_idx
  on public.workspace_integration_connections (workspace_id);

create index if not exists workspace_integration_connections_category_idx
  on public.workspace_integration_connections (workspace_id, category);

-- At most one default connection per workspace + category.
create unique index if not exists workspace_integration_connections_default_category_uidx
  on public.workspace_integration_connections (workspace_id, category)
  where is_default_for_category = true;

alter table public.integration_providers enable row level security;
alter table public.workspace_integration_connections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'integration_providers'
      and policyname = 'integration_providers_all'
  ) then
    create policy integration_providers_all
      on public.integration_providers
      for all
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_integration_connections'
      and policyname = 'workspace_integration_connections_all'
  ) then
    create policy workspace_integration_connections_all
      on public.workspace_integration_connections
      for all
      using (true)
      with check (true);
  end if;
end $$;

insert into public.integration_providers (
  code, category, display_name, auth_methods, default_capabilities
)
values
  (
    'banking.wise',
    'banking',
    'Wise (registry placeholder)',
    '["api_key","oauth2","manual"]'::jsonb,
    '["balances","transfers"]'::jsonb
  ),
  (
    'email.microsoft365',
    'email',
    'Microsoft 365 (registry placeholder)',
    '["oauth2","manual"]'::jsonb,
    '["send","receive"]'::jsonb
  ),
  (
    'calendar.google',
    'calendar',
    'Google Calendar (registry placeholder)',
    '["oauth2","manual"]'::jsonb,
    '["events","availability"]'::jsonb
  ),
  (
    'messaging.twilio',
    'messaging',
    'Twilio (registry placeholder)',
    '["api_key","manual"]'::jsonb,
    '["send","receive"]'::jsonb
  ),
  (
    'payments.stripe',
    'payments',
    'Stripe (registry placeholder)',
    '["api_key","manual"]'::jsonb,
    '["charges","refunds"]'::jsonb
  ),
  (
    'shipping.ups',
    'shipping',
    'UPS (registry placeholder)',
    '["api_key","oauth2","manual"]'::jsonb,
    '["create_shipment","labels","tracking"]'::jsonb
  ),
  (
    'storage.placeholder',
    'storage',
    'Storage (registry placeholder)',
    '["oauth2","api_key","manual"]'::jsonb,
    '["read","write"]'::jsonb
  ),
  (
    'ai.placeholder',
    'ai',
    'AI (registry placeholder)',
    '["api_key","manual"]'::jsonb,
    '["chat"]'::jsonb
  )
on conflict (code) do nothing;

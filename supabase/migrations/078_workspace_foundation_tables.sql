-- Workspace foundation tables (database only)
-- Project: kkxtvzxqmbacjatkiupq (Unit311 Central)
-- No RLS. No application behaviour changes.

-- Ensure Internal workspace exists
insert into public.workspaces (name, slug, workspace_type, status)
select 'Unit311 Central', 'unit311', 'Internal', 'Active'
where not exists (
  select 1 from public.workspaces where slug = 'unit311'
);

---------------------------------------------------------
-- workspace_settings
---------------------------------------------------------
create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  timezone text,
  currency text,
  language text,
  date_format text,
  time_format text,
  logo_url text,
  primary_colour text,
  secondary_colour text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_settings_workspace_id_key unique (workspace_id)
);

create index if not exists workspace_settings_workspace_id_idx
  on public.workspace_settings (workspace_id);

insert into public.workspace_settings (
  workspace_id,
  timezone,
  currency,
  language,
  date_format,
  time_format,
  logo_url,
  primary_colour,
  secondary_colour
)
select
  w.id,
  'Europe/London',
  'USD',
  'en-GB',
  'DD/MM/YYYY',
  '24h',
  null,
  '#0b2d63',
  '#2563eb'
from public.workspaces w
where w.slug = 'unit311'
  and not exists (
    select 1 from public.workspace_settings s where s.workspace_id = w.id
  );

---------------------------------------------------------
-- workspace_modules
---------------------------------------------------------
create table if not exists public.workspace_modules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  module_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_modules_workspace_module_key unique (workspace_id, module_key)
);

create index if not exists workspace_modules_workspace_id_idx
  on public.workspace_modules (workspace_id);

create index if not exists workspace_modules_module_key_idx
  on public.workspace_modules (module_key);

-- Default enabled modules for Unit311 Central Internal only (not customer data)
insert into public.workspace_modules (workspace_id, module_key, enabled)
select w.id, m.module_key, true
from public.workspaces w
cross join (
  values
    ('clients'),
    ('crm'),
    ('projects'),
    ('financials'),
    ('quality-management'),
    ('hr'),
    ('assets-inventory'),
    ('file-explorer'),
    ('email-calendar-messaging'),
    ('executive-assistant'),
    ('logistics'),
    ('social'),
    ('careers'),
    ('support'),
    ('engineering-rnd'),
    ('strategy'),
    ('training'),
    ('users'),
    ('testing'),
    ('website-management'),
    ('profiles')
) as m(module_key)
where w.slug = 'unit311'
  and not exists (
    select 1
    from public.workspace_modules existing
    where existing.workspace_id = w.id
      and existing.module_key = m.module_key
  );

---------------------------------------------------------
-- workspace_users
---------------------------------------------------------
create table if not exists public.workspace_users (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  user_id uuid,
  role text,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_users_workspace_id_idx
  on public.workspace_users (workspace_id);

create index if not exists workspace_users_user_id_idx
  on public.workspace_users (user_id);

create unique index if not exists workspace_users_workspace_user_uidx
  on public.workspace_users (workspace_id, user_id)
  where user_id is not null;

-- No auth migration: relationship table only. Left empty in this phase.

---------------------------------------------------------
-- workspace_audit_log
---------------------------------------------------------
create table if not exists public.workspace_audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  event_type text,
  entity_type text,
  entity_id uuid,
  description text,
  performed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists workspace_audit_log_workspace_id_idx
  on public.workspace_audit_log (workspace_id);

create index if not exists workspace_audit_log_created_at_idx
  on public.workspace_audit_log (created_at desc);

create index if not exists workspace_audit_log_event_type_idx
  on public.workspace_audit_log (event_type);

insert into public.workspace_audit_log (
  workspace_id,
  event_type,
  entity_type,
  description
)
select
  w.id,
  'workspace_foundation_seeded',
  'workspace',
  'Workspace foundation tables created and Unit311 Central defaults seeded (settings + modules).'
from public.workspaces w
where w.slug = 'unit311'
  and not exists (
    select 1
    from public.workspace_audit_log a
    where a.workspace_id = w.id
      and a.event_type = 'workspace_foundation_seeded'
  );

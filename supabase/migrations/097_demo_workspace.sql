-- Demo release model — Demo workspace (same build as Internal; content tenancy only)
-- Host: demo.unit311central.com → Internal Ops UI → workspace slug = demo

insert into public.workspaces (name, slug, workspace_type, status)
select 'Unit311 Demo', 'demo', 'Internal', 'Active'
where not exists (
  select 1 from public.workspaces where slug = 'demo'
);

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
where w.slug = 'demo'
  and not exists (
    select 1 from public.workspace_settings s where s.workspace_id = w.id
  );

-- Mirror Internal module enablement onto Demo (visibility can still be narrowed via DEMO_VISIBLE_MODULES)
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
where w.slug = 'demo'
  and not exists (
    select 1
    from public.workspace_modules existing
    where existing.workspace_id = w.id
      and existing.module_key = m.module_key
  );

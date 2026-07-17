-- Phase 2: workspace isolation for CRM (+ founder meetings used by CRM) tables.
-- internal_projects already has workspace_id from migration 076.

alter table public.crm_leads add column if not exists workspace_id uuid;
alter table public.crm_activities add column if not exists workspace_id uuid;
alter table public.crm_contact_history add column if not exists workspace_id uuid;
alter table public.crm_connections add column if not exists workspace_id uuid;
alter table public.founder_session_bookings add column if not exists workspace_id uuid;

update public.crm_leads
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.crm_activities
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.crm_contact_history
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.crm_connections
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.founder_session_bookings
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

do $$
declare
  null_count bigint;
  table_name text;
begin
  foreach table_name in array array[
    'crm_leads',
    'crm_activities',
    'crm_contact_history',
    'crm_connections',
    'founder_session_bookings'
  ]
  loop
    execute format(
      'select count(*) from public.%I where workspace_id is null',
      table_name
    ) into null_count;
    if null_count > 0 then
      raise exception 'Backfill failed for %. % rows still null', table_name, null_count;
    end if;
  end loop;

  if not exists (select 1 from public.workspaces where slug = 'unit311') then
    raise exception 'Unit311 Central workspace (slug=unit311) is missing';
  end if;
end $$;

alter table public.crm_leads alter column workspace_id set not null;
alter table public.crm_activities alter column workspace_id set not null;
alter table public.crm_contact_history alter column workspace_id set not null;
alter table public.crm_connections alter column workspace_id set not null;
alter table public.founder_session_bookings alter column workspace_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_leads_workspace_id_fkey'
  ) then
    alter table public.crm_leads
      add constraint crm_leads_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_activities_workspace_id_fkey'
  ) then
    alter table public.crm_activities
      add constraint crm_activities_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_contact_history_workspace_id_fkey'
  ) then
    alter table public.crm_contact_history
      add constraint crm_contact_history_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_connections_workspace_id_fkey'
  ) then
    alter table public.crm_connections
      add constraint crm_connections_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'founder_session_bookings_workspace_id_fkey'
  ) then
    alter table public.founder_session_bookings
      add constraint founder_session_bookings_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

create index if not exists crm_leads_workspace_id_idx on public.crm_leads (workspace_id);
create index if not exists crm_leads_workspace_status_idx on public.crm_leads (workspace_id, status);
create index if not exists crm_activities_workspace_id_idx on public.crm_activities (workspace_id);
create index if not exists crm_contact_history_workspace_id_idx on public.crm_contact_history (workspace_id);
create index if not exists crm_connections_workspace_id_idx on public.crm_connections (workspace_id);
create index if not exists founder_session_bookings_workspace_id_idx
  on public.founder_session_bookings (workspace_id);

-- Keep inserts working before app always stamps workspace_id (same pattern as 077).
alter table public.crm_leads
  alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.crm_activities
  alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.crm_contact_history
  alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.crm_connections
  alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.founder_session_bookings
  alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;

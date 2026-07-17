-- Phase 2: Financials + File Explorer workspace isolation follow-up.
-- Most financial/file tables already have workspace_id from 076.
-- Add missing columns for journal_lines and treasury_settings.

alter table public.journal_lines add column if not exists workspace_id uuid;
alter table public.treasury_settings add column if not exists workspace_id uuid;

update public.journal_lines jl
set workspace_id = je.workspace_id
from public.journal_entries je
where jl.journal_entry_id = je.id
  and jl.workspace_id is null
  and je.workspace_id is not null;

update public.journal_lines
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.treasury_settings
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

-- Allow one settings row per workspace (was single-row id=1 only).
alter table public.treasury_settings drop constraint if exists treasury_settings_id_check;

alter table public.treasury_settings drop constraint if exists treasury_settings_pkey;

create sequence if not exists public.treasury_settings_id_seq;

alter table public.treasury_settings
  alter column id set default nextval('public.treasury_settings_id_seq');

do $$
begin
  perform setval(
    'public.treasury_settings_id_seq',
    coalesce((select max(id) from public.treasury_settings), 1)
  );
end $$;

alter table public.treasury_settings
  add constraint treasury_settings_pkey primary key (id);

do $$
declare
  null_count bigint;
begin
  select count(*) into null_count from public.journal_lines where workspace_id is null;
  if null_count > 0 then
    raise exception 'Backfill failed for journal_lines. % rows still null', null_count;
  end if;

  select count(*) into null_count from public.treasury_settings where workspace_id is null;
  if null_count > 0 then
    raise exception 'Backfill failed for treasury_settings. % rows still null', null_count;
  end if;

  if not exists (select 1 from public.workspaces where slug = 'unit311') then
    raise exception 'Unit311 Central workspace (slug=unit311) is missing';
  end if;
end $$;

alter table public.journal_lines alter column workspace_id set not null;
alter table public.treasury_settings alter column workspace_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'journal_lines_workspace_id_fkey'
  ) then
    alter table public.journal_lines
      add constraint journal_lines_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'treasury_settings_workspace_id_fkey'
  ) then
    alter table public.treasury_settings
      add constraint treasury_settings_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

create index if not exists journal_lines_workspace_id_idx on public.journal_lines (workspace_id);
create index if not exists treasury_settings_workspace_id_idx on public.treasury_settings (workspace_id);

create unique index if not exists treasury_settings_workspace_id_uidx
  on public.treasury_settings (workspace_id);

alter table public.journal_lines
  alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.treasury_settings
  alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;

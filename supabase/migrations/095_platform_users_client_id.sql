-- FDR-MOD-161 — platform_users.client_id → internal_clients (PRM-001)
-- Nullable during backfill; new external users require client_id at the API layer.

alter table public.platform_users
  add column if not exists client_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_users_client_id_fkey'
      and conrelid = 'public.platform_users'::regclass
  ) then
    alter table public.platform_users
      add constraint platform_users_client_id_fkey
      foreign key (client_id)
      references public.internal_clients (id)
      on delete restrict;
  end if;
end $$;

create index if not exists platform_users_client_id_idx
  on public.platform_users (client_id);

-- Backfill only when exactly one Client matches company_name (case-insensitive),
-- preferring same workspace when both sides have workspace_id.
with ranked as (
  select
    pu.id as user_id,
    ic.id as matched_client_id,
    count(*) over (partition by pu.id) as match_count
  from public.platform_users pu
  inner join public.internal_clients ic
    on lower(trim(pu.client_name)) = lower(trim(ic.company_name))
   and (
      pu.workspace_id is null
      or ic.workspace_id is null
      or pu.workspace_id = ic.workspace_id
    )
  where pu.user_type = 'external'
    and pu.client_id is null
    and coalesce(trim(pu.client_name), '') <> ''
)
update public.platform_users pu
set
  client_id = ranked.matched_client_id,
  updated_at = now()
from ranked
where pu.id = ranked.user_id
  and ranked.match_count = 1;

-- Refresh denormalised display cache from Directory when linked.
update public.platform_users pu
set
  client_name = ic.company_name,
  updated_at = now()
from public.internal_clients ic
where pu.client_id = ic.id
  and pu.user_type = 'external'
  and coalesce(pu.client_name, '') is distinct from ic.company_name;

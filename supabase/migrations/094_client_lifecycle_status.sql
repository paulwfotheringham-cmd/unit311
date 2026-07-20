-- FDR-MOD-011-LIFECYCLE — map legacy Directory account_status → PRM-001 canonical set.

update public.internal_clients
set account_status = case account_status
  when 'Active' then 'Active'
  when 'Prospect' then 'Client Created'
  when 'Pending' then 'Onboarding'
  when 'Pending Payment' then 'Workspace Provisioned'
  when 'On Hold' then 'Dormant'
  when 'Inactive' then 'Archived'
  when 'Client Created' then 'Client Created'
  when 'Workspace Provisioned' then 'Workspace Provisioned'
  when 'Onboarding' then 'Onboarding'
  when 'Dormant' then 'Dormant'
  when 'Archived' then 'Archived'
  else 'Client Created'
end
where account_status is distinct from case account_status
  when 'Active' then 'Active'
  when 'Prospect' then 'Client Created'
  when 'Pending' then 'Onboarding'
  when 'Pending Payment' then 'Workspace Provisioned'
  when 'On Hold' then 'Dormant'
  when 'Inactive' then 'Archived'
  when 'Client Created' then 'Client Created'
  when 'Workspace Provisioned' then 'Workspace Provisioned'
  when 'Onboarding' then 'Onboarding'
  when 'Dormant' then 'Dormant'
  when 'Archived' then 'Archived'
  else 'Client Created'
end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_clients_account_status_lifecycle_check'
      and conrelid = 'public.internal_clients'::regclass
  ) then
    alter table public.internal_clients
      add constraint internal_clients_account_status_lifecycle_check
      check (
        account_status in (
          'Client Created',
          'Workspace Provisioned',
          'Onboarding',
          'Active',
          'Dormant',
          'Archived'
        )
      );
  end if;
end $$;

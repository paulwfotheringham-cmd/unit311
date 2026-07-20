-- MOD-081 Company Details
-- One canonical company profile record per workspace.

create table if not exists public.company_details (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  legal_company_name text not null default '',
  trading_name text not null default '',
  company_number text not null default '',
  vat_tax_number text not null default '',
  registered_office_address text not null default '',
  principal_business_address text not null default '',
  country_of_registration text not null default '',
  date_of_incorporation date,
  company_status text not null default 'Active',
  sic_industry_classification text not null default '',
  website text not null default '',
  primary_email text not null default '',
  primary_telephone text not null default '',
  general_company_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_details_workspace_id_key unique (workspace_id),
  constraint company_details_company_status_check check (
    company_status in (
      'Active',
      'Dormant',
      'Dissolved',
      'In Liquidation',
      'Other'
    )
  )
);

create index if not exists company_details_workspace_id_idx
  on public.company_details (workspace_id);

create index if not exists company_details_legal_name_idx
  on public.company_details (workspace_id, legal_company_name);

alter table public.company_details enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'company_details'
      and policyname = 'company_details_all'
  ) then
    create policy company_details_all
      on public.company_details
      for all
      using (true)
      with check (true);
  end if;
end $$;

-- MOD Payroll Phase 1: settings, employee profiles, runs, run lines

create table if not exists public.payroll_settings (
  workspace_id text primary key,
  federal_tax_pct numeric(8, 4) not null default 22,
  state_tax_pct numeric(8, 4) not null default 5,
  social_security_pct numeric(8, 4) not null default 6.2,
  medicare_pct numeric(8, 4) not null default 1.45,
  employer_payroll_pct numeric(8, 4) not null default 7.65,
  default_currency text not null default 'USD',
  payroll_frequency text not null default 'monthly',
  pay_day integer not null default 0,
  country_code text not null default 'US',
  default_tax_state text not null default 'CA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payroll_employee_profiles (
  id text primary key,
  workspace_id text not null,
  employee_id text not null,
  annual_salary numeric(14, 2),
  monthly_salary numeric(14, 2),
  hourly_rate numeric(14, 4),
  bonus numeric(14, 2) not null default 0,
  commission numeric(14, 2) not null default 0,
  payroll_frequency text not null default 'monthly',
  currency text not null default 'USD',
  tax_state text not null default 'CA',
  federal_tax_pct numeric(8, 4),
  state_tax_pct numeric(8, 4),
  social_security_pct numeric(8, 4),
  medicare_pct numeric(8, 4),
  employer_payroll_pct numeric(8, 4),
  payroll_status text not null default 'active',
  bank_account text not null default '',
  routing_number text not null default '',
  payroll_employee_id text not null default '',
  tax_id text not null default '',
  hire_date date,
  termination_date date,
  manager text not null default '',
  department text not null default '',
  cost_centre text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, employee_id)
);

create index if not exists payroll_employee_profiles_workspace_idx
  on public.payroll_employee_profiles (workspace_id);
create index if not exists payroll_employee_profiles_employee_idx
  on public.payroll_employee_profiles (employee_id);

create table if not exists public.payroll_runs (
  id text primary key,
  workspace_id text not null,
  period_start date not null,
  period_end date not null,
  pay_date date not null,
  status text not null default 'draft',
  employee_count integer not null default 0,
  gross_payroll numeric(14, 2) not null default 0,
  employee_tax numeric(14, 2) not null default 0,
  employer_tax numeric(14, 2) not null default 0,
  net_payroll numeric(14, 2) not null default 0,
  currency text not null default 'USD',
  journal_entry_id text,
  payment_journal_entry_id text,
  wise_batch_id text,
  wise_payment_status text not null default 'none',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz
);

create index if not exists payroll_runs_workspace_idx
  on public.payroll_runs (workspace_id, pay_date desc);
create index if not exists payroll_runs_status_idx
  on public.payroll_runs (workspace_id, status);

create table if not exists public.payroll_run_lines (
  id text primary key,
  workspace_id text not null,
  run_id text not null references public.payroll_runs (id) on delete cascade,
  employee_id text not null,
  employee_name text not null default '',
  department text not null default '',
  cost_centre text not null default '',
  gross numeric(14, 2) not null default 0,
  bonus numeric(14, 2) not null default 0,
  commission numeric(14, 2) not null default 0,
  federal_tax numeric(14, 2) not null default 0,
  state_tax numeric(14, 2) not null default 0,
  social_security numeric(14, 2) not null default 0,
  medicare numeric(14, 2) not null default 0,
  employer_tax numeric(14, 2) not null default 0,
  net numeric(14, 2) not null default 0,
  total_employment_cost numeric(14, 2) not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create index if not exists payroll_run_lines_run_idx
  on public.payroll_run_lines (run_id);
create index if not exists payroll_run_lines_workspace_idx
  on public.payroll_run_lines (workspace_id);

-- Seed COA accounts for workspaces that already have an accounts table
insert into public.accounts (workspace_id, code, name, type, currency, is_active)
select
  a.workspace_id,
  v.code,
  v.name,
  v.type,
  null,
  true
from (select distinct workspace_id from public.accounts where workspace_id is not null) a
cross join (
  values
    ('2020', 'Payroll Clearing', 'liability'),
    ('2030', 'Employer Payroll Tax Payable', 'liability'),
    ('5021', 'Employer Payroll Tax', 'expense')
) as v(code, name, type)
where not exists (
  select 1 from public.accounts x
  where x.workspace_id = a.workspace_id and x.code = v.code
);

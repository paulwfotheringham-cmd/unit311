-- Client onboarding workflow (separate from internal_clients CRM records)

create table if not exists public.client_onboarding_records (
  id uuid primary key default gen_random_uuid(),
  platform_organisation_id uuid,
  platform_user_id uuid,
  company_name text not null,
  contact_name text not null default '',
  contact_email text not null default '',
  signup_date timestamptz not null default now(),
  current_stage text not null default 'signed_up'
    check (current_stage in (
      'signed_up',
      'payment_received',
      'questionnaire_complete',
      'platform_clone_complete',
      'review_complete',
      'platform_live'
    )),
  progress_percent integer not null default 17
    check (progress_percent >= 0 and progress_percent <= 100),
  current_status text not null default 'In Progress'
    check (current_status in ('In Progress', 'Platform Live')),
  signed_up_at timestamptz not null default now(),
  signed_up_by text,
  payment_received_at timestamptz,
  payment_received_by text,
  questionnaire_complete_at timestamptz,
  questionnaire_complete_by text,
  platform_clone_complete_at timestamptz,
  platform_clone_complete_by text,
  review_complete_at timestamptz,
  review_complete_by text,
  platform_live_at timestamptz,
  platform_live_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_onboarding_records_company_name_idx
  on public.client_onboarding_records (company_name);

create index if not exists client_onboarding_records_contact_email_idx
  on public.client_onboarding_records (contact_email);

create index if not exists client_onboarding_records_current_stage_idx
  on public.client_onboarding_records (current_stage);

create index if not exists client_onboarding_records_current_status_idx
  on public.client_onboarding_records (current_status);

create index if not exists client_onboarding_records_signup_date_idx
  on public.client_onboarding_records (signup_date desc);

create index if not exists client_onboarding_records_platform_org_idx
  on public.client_onboarding_records (platform_organisation_id)
  where platform_organisation_id is not null;

alter table public.client_onboarding_records enable row level security;

drop policy if exists "client_onboarding_records_all" on public.client_onboarding_records;
create policy "client_onboarding_records_all" on public.client_onboarding_records
  for all using (true) with check (true);

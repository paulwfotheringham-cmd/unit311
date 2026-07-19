-- Client payment activation, provisioning, and CRM link tracking

alter table public.internal_clients
  add column if not exists crm_lead_id text,
  add column if not exists provisioning_status text
    check (
      provisioning_status is null
      or provisioning_status in ('none', 'provisioning_pending', 'provisioning', 'live')
    ),
  add column if not exists onboarding_stage text,
  add column if not exists activation_date date,
  add column if not exists payment_matched_at timestamptz,
  add column if not exists last_paid_invoice_number text,
  add column if not exists last_wise_transaction_id text;

create index if not exists internal_clients_crm_lead_id_idx
  on public.internal_clients (crm_lead_id);

update public.internal_clients
set onboarding_stage = coalesce(onboarding_stage, 'signup_submitted')
where onboarding_stage is null
  and account_status = 'Pending';

update public.internal_clients
set provisioning_status = coalesce(provisioning_status, 'none')
where provisioning_status is null;

-- Link platform users created via CRM invite signup to the originating lead.
-- Unverified until email_verified_at is set (Email Verification Pending).

alter table public.platform_users
  add column if not exists crm_lead_id uuid references public.crm_leads(id) on delete set null;

create index if not exists platform_users_crm_lead_id_idx
  on public.platform_users (crm_lead_id)
  where crm_lead_id is not null;

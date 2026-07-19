-- Platform billing: Unit311-owned view of customer subscriptions.
-- Internal host only; customer workspaces keep their own subscription UI.

create table if not exists public.platform_customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id text references public.internal_clients (id) on delete set null,
  workspace_id uuid,
  company_name text not null,
  plan_name text not null default 'Professional',
  billing_frequency text not null default 'quarterly'
    check (billing_frequency in ('monthly', 'quarterly', 'annual')),
  subscription_status text not null default 'active'
    check (subscription_status in ('inactive', 'pending_payment', 'active', 'suspended', 'cancelled')),
  outstanding_balance_usd numeric(12, 2) not null default 0,
  next_invoice_date date,
  mrr_usd numeric(12, 2) not null default 0,
  arr_usd numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_customer_subscriptions_company_uidx
  on public.platform_customer_subscriptions (lower(company_name));

create index if not exists platform_customer_subscriptions_status_idx
  on public.platform_customer_subscriptions (subscription_status);

create index if not exists platform_customer_subscriptions_client_idx
  on public.platform_customer_subscriptions (client_id);

comment on table public.platform_customer_subscriptions is
  'Platform-owner billing ledger for customer workspaces (Internal Unit311 only).';

-- Seed initial customer: Fotheringham (Professional, quarterly, $999 MRR).
insert into public.platform_customer_subscriptions (
  company_name,
  plan_name,
  billing_frequency,
  subscription_status,
  outstanding_balance_usd,
  next_invoice_date,
  mrr_usd,
  arr_usd,
  notes
)
select
  'Fotheringham',
  'Professional',
  'quarterly',
  'active',
  0,
  (date_trunc('quarter', now()) + interval '3 months')::date,
  999,
  11988,
  'Initial platform billing seed'
where not exists (
  select 1
  from public.platform_customer_subscriptions
  where lower(company_name) = 'fotheringham'
);

-- Link client_id when an internal_clients row exists for Fotheringham.
update public.platform_customer_subscriptions pcs
set
  client_id = c.id,
  updated_at = now()
from public.internal_clients c
where pcs.client_id is null
  and lower(pcs.company_name) = 'fotheringham'
  and lower(c.company_name) like '%fotheringham%';

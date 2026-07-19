-- Unit311 Central General Ledger + AR invoices + expense/journal links

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type text not null check (type in ('asset', 'liability', 'equity', 'income', 'expense')),
  currency text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  description text not null default '',
  client_id text references public.internal_clients (id) on delete set null,
  source_type text,
  source_id text,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  journal_date date not null default current_date,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  unique (source_type, source_id)
);

create index if not exists journal_entries_date_idx on public.journal_entries (journal_date desc);
create index if not exists journal_entries_status_idx on public.journal_entries (status);
create index if not exists journal_entries_client_idx on public.journal_entries (client_id);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  account_id uuid not null references public.accounts (id),
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  description text not null default '',
  created_at timestamptz not null default now(),
  check (not (debit > 0 and credit > 0)),
  check (debit > 0 or credit > 0)
);

create index if not exists journal_lines_entry_idx on public.journal_lines (journal_entry_id);
create index if not exists journal_lines_account_idx on public.journal_lines (account_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id text not null references public.internal_clients (id) on delete restrict,
  organisation_id uuid,
  issue_date date not null default current_date,
  due_date date not null,
  currency text not null default 'USD',
  amount numeric(14, 2) not null check (amount >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
  payment_reference text not null unique,
  pdf_path text,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  payment_journal_entry_id uuid references public.journal_entries (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_client_idx on public.invoices (client_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_payment_reference_idx on public.invoices (payment_reference);

create table if not exists public.wise_payment_matches (
  id uuid primary key default gen_random_uuid(),
  wise_transaction_id text not null unique,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  amount numeric(14, 2),
  currency text,
  matched_at timestamptz not null default now()
);

alter table public.internal_clients
  add column if not exists subscription_status text
    check (subscription_status in ('inactive', 'pending_payment', 'active', 'suspended', 'cancelled')),
  add column if not exists billing_frequency text default 'quarterly',
  add column if not exists renewal_date date,
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('wise', 'stripe'));

update public.internal_clients
set subscription_status = case
  when account_status = 'Active' then 'active'
  when account_status = 'Pending' then 'pending_payment'
  else 'inactive'
end
where subscription_status is null;

alter table public.financial_expenses
  add column if not exists supplier text,
  add column if not exists category_account_code text,
  add column if not exists expense_date date,
  add column if not exists payment_method text,
  add column if not exists wise_balance_id bigint,
  add column if not exists attachment_path text,
  add column if not exists reference text,
  add column if not exists journal_entry_id uuid references public.journal_entries (id) on delete set null,
  add column if not exists payment_journal_entry_id uuid references public.journal_entries (id) on delete set null;

update public.financial_expenses
set expense_date = date_submitted
where expense_date is null;

insert into public.accounts (code, name, type, currency) values
  ('1000', 'Wise USD', 'asset', 'USD'),
  ('1010', 'Wise GBP', 'asset', 'GBP'),
  ('1020', 'Wise EUR', 'asset', 'EUR'),
  ('1030', 'Accounts Receivable', 'asset', null),
  ('1040', 'Prepaid Expenses', 'asset', null),
  ('2000', 'Accounts Payable', 'liability', null),
  ('2010', 'Deferred Revenue', 'liability', null),
  ('3000', 'Owner Equity', 'equity', null),
  ('3010', 'Retained Earnings', 'equity', null),
  ('4000', 'Subscription Revenue', 'income', null),
  ('4010', 'Professional Services', 'income', null),
  ('5000', 'Stripe Fees', 'expense', null),
  ('5010', 'Software Subscriptions', 'expense', null),
  ('5020', 'Payroll', 'expense', null),
  ('5030', 'Contractors', 'expense', null),
  ('5040', 'Marketing', 'expense', null),
  ('5050', 'Travel', 'expense', null),
  ('5060', 'Office', 'expense', null),
  ('5070', 'Accounting', 'expense', null),
  ('5080', 'Legal', 'expense', null),
  ('5090', 'Misc Expenses', 'expense', null)
on conflict (code) do nothing;

alter table public.accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.wise_payment_matches enable row level security;

do $$ begin
  create policy "accounts_all" on public.accounts for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "journal_entries_all" on public.journal_entries for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "journal_lines_all" on public.journal_lines for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "invoices_all" on public.invoices for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "wise_payment_matches_all" on public.wise_payment_matches for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

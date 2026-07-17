-- Software Asset Register (Corporate Information → Software & Licences)
-- Workspace-scoped. Credentials encrypted at application layer (no plaintext password column).

create table if not exists public.software_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,

  -- General
  name text not null,
  vendor text not null default '',
  purpose text not null default '',
  category text not null default '',
  website_url text not null default '',
  support_url text not null default '',
  documentation_url text not null default '',
  status text not null default 'Active'
    check (status in ('Active', 'Trial', 'Cancelled')),

  -- Licences
  licences_purchased integer not null default 0 check (licences_purchased >= 0),
  licences_allocated integer not null default 0 check (licences_allocated >= 0),
  licence_type text not null default 'Named'
    check (licence_type in ('Named', 'Concurrent', 'Per user', 'Unlimited')),

  -- Financials
  monthly_cost numeric(12, 2) not null default 0,
  annual_cost numeric(12, 2) not null default 0,
  currency text not null default 'GBP',
  last_payment_amount numeric(12, 2),
  last_payment_date date,
  next_renewal_date date,
  renewal_frequency text not null default 'Annually'
    check (renewal_frequency in ('Monthly', 'Quarterly', 'Annually')),
  contract_length text not null default '',
  cost_centre text not null default '',
  budget_owner text not null default '',
  supplier_name text not null default '',
  invoice_reference text not null default '',
  financial_account_code text not null default '5010',

  -- Ownership
  business_owner text not null default '',
  technical_owner text not null default '',
  department text not null default '',
  approver text not null default '',

  -- Supplier
  supplier_company text not null default '',
  account_manager text not null default '',
  support_email text not null default '',
  support_phone text not null default '',
  customer_number text not null default '',

  -- Integrations (placeholders)
  integration_connected boolean not null default false,
  integration_api_key_set boolean not null default false,
  integration_webhook_url text not null default '',
  integration_oauth_status text not null default '',
  integration_sync_status text not null default '',

  -- Future Financials / files hooks
  linked_expense_id uuid,
  files_folder_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists software_assets_workspace_id_idx
  on public.software_assets (workspace_id);

create index if not exists software_assets_workspace_status_idx
  on public.software_assets (workspace_id, status);

create index if not exists software_assets_workspace_vendor_idx
  on public.software_assets (workspace_id, vendor);

create index if not exists software_assets_workspace_renewal_idx
  on public.software_assets (workspace_id, next_renewal_date);

create table if not exists public.software_asset_credentials (
  software_asset_id uuid primary key
    references public.software_assets (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete restrict,

  primary_account_email text not null default '',
  portal_url text not null default '',
  username text not null default '',

  -- AES-GCM ciphertext parts (never store plaintext passwords)
  password_ciphertext text,
  password_nonce text,
  password_tag text,

  mfa_enabled boolean not null default false,
  recovery_email text not null default '',
  recovery_phone text not null default '',
  notes text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists software_asset_credentials_workspace_id_idx
  on public.software_asset_credentials (workspace_id);

create table if not exists public.software_asset_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  software_asset_id uuid not null
    references public.software_assets (id) on delete cascade,
  file_object_id uuid not null,
  attachment_kind text not null default 'Other'
    check (
      attachment_kind in (
        'Contract',
        'Invoice',
        'Renewal quote',
        'Licence agreement',
        'User guide',
        'Other'
      )
    ),
  created_at timestamptz not null default now(),
  constraint software_asset_files_asset_file_key unique (software_asset_id, file_object_id)
);

create index if not exists software_asset_files_workspace_id_idx
  on public.software_asset_files (workspace_id);

create index if not exists software_asset_files_asset_id_idx
  on public.software_asset_files (software_asset_id);

create table if not exists public.software_asset_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  software_asset_id uuid
    references public.software_assets (id) on delete set null,
  actor text not null default '',
  action text not null,
  summary text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists software_asset_audit_events_workspace_id_idx
  on public.software_asset_audit_events (workspace_id);

create index if not exists software_asset_audit_events_asset_id_idx
  on public.software_asset_audit_events (software_asset_id, created_at desc);

comment on table public.software_assets is
  'Corporate Software Asset Register — subscriptions and licences per workspace.';
comment on table public.software_asset_credentials is
  'Encrypted portal credentials for software assets (AES-GCM at app layer).';
comment on table public.software_asset_files is
  'Document attachments linked to software assets (contracts, invoices, etc.).';
comment on table public.software_asset_audit_events is
  'Audit history stub for software asset create/update/delete events.';

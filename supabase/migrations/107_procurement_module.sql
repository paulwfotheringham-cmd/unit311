-- MOD-068 Procurement & Purchasing foundation (workspace-scoped)

create table if not exists public.procurement_suppliers (
  id text primary key,
  workspace_id text not null,
  company_name text not null,
  contacts jsonb not null default '[]'::jsonb,
  addresses jsonb not null default '[]'::jsonb,
  tax_id text not null default '',
  payment_terms text not null default 'Net 30',
  bank_details text not null default '',
  preferred boolean not null default false,
  insurance_expiry date,
  contract_expiry date,
  rating numeric(4, 2) not null default 0,
  performance_score numeric(6, 2) not null default 0,
  on_time_delivery_pct numeric(6, 2) not null default 0,
  quality_score numeric(6, 2) not null default 0,
  price_competitiveness numeric(6, 2) not null default 0,
  average_lead_time_days numeric(8, 2) not null default 0,
  total_spend numeric(14, 2) not null default 0,
  notes text not null default '',
  documents jsonb not null default '[]'::jsonb,
  category text not null default '',
  currency text not null default 'EUR',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists procurement_suppliers_workspace_idx
  on public.procurement_suppliers (workspace_id);

create table if not exists public.procurement_requisitions (
  id text primary key,
  workspace_id text not null,
  request_number text not null,
  request_date date not null,
  requested_by text not null default '',
  department text not null default '',
  cost_centre text not null default '',
  priority text not null default 'normal',
  required_date date,
  business_justification text not null default '',
  budget_code text not null default '',
  status text not null default 'draft',
  lines jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  approval_history jsonb not null default '[]'::jsonb,
  linked_po_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, request_number)
);

create index if not exists procurement_requisitions_workspace_idx
  on public.procurement_requisitions (workspace_id, request_date desc);
create index if not exists procurement_requisitions_status_idx
  on public.procurement_requisitions (workspace_id, status);

create table if not exists public.procurement_purchase_orders (
  id text primary key,
  workspace_id text not null,
  po_number text not null,
  supplier_id text,
  supplier_name text not null default '',
  supplier_contact text not null default '',
  delivery_address text not null default '',
  billing_address text not null default '',
  currency text not null default 'EUR',
  payment_terms text not null default 'Net 30',
  expected_delivery date,
  status text not null default 'draft',
  requisition_id text,
  lines jsonb not null default '[]'::jsonb,
  notes text not null default '',
  subtotal numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  grand_total numeric(14, 2) not null default 0,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, po_number)
);

create index if not exists procurement_pos_workspace_idx
  on public.procurement_purchase_orders (workspace_id, created_at desc);
create index if not exists procurement_pos_status_idx
  on public.procurement_purchase_orders (workspace_id, status);

create table if not exists public.procurement_goods_receipts (
  id text primary key,
  workspace_id text not null,
  receipt_number text not null,
  po_id text not null,
  po_number text not null default '',
  supplier_name text not null default '',
  delivery_date date not null,
  received_by text not null default '',
  lines jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  notes text not null default '',
  inventory_updated boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, receipt_number)
);

create index if not exists procurement_gr_workspace_idx
  on public.procurement_goods_receipts (workspace_id, delivery_date desc);

create table if not exists public.procurement_invoice_matches (
  id text primary key,
  workspace_id text not null,
  invoice_number text not null,
  supplier_id text,
  supplier_name text not null default '',
  po_id text,
  po_number text not null default '',
  receipt_id text,
  receipt_number text,
  invoice_date date,
  invoice_total numeric(14, 2) not null default 0,
  po_total numeric(14, 2) not null default 0,
  receipt_total numeric(14, 2) not null default 0,
  currency text not null default 'EUR',
  match_status text not null default 'pending',
  mismatches jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create index if not exists procurement_invoice_workspace_idx
  on public.procurement_invoice_matches (workspace_id, created_at desc);

create table if not exists public.procurement_approval_rules (
  id text primary key,
  workspace_id text not null,
  name text not null,
  min_value numeric(14, 2) not null default 0,
  max_value numeric(14, 2),
  department text not null default 'any',
  business_unit text not null default 'any',
  cost_centre text not null default 'any',
  project text not null default 'any',
  levels jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists procurement_rules_workspace_idx
  on public.procurement_approval_rules (workspace_id);

create table if not exists public.procurement_contracts (
  id text primary key,
  workspace_id text not null,
  title text not null,
  supplier_id text,
  supplier_name text not null default '',
  contract_value numeric(14, 2) not null default 0,
  currency text not null default 'EUR',
  start_date date,
  renewal_date date,
  notice_period_days integer not null default 30,
  owner text not null default '',
  status text not null default 'draft',
  documents jsonb not null default '[]'::jsonb,
  reminder_sent boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists procurement_contracts_workspace_idx
  on public.procurement_contracts (workspace_id, renewal_date);

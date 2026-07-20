-- MOD-071 Phase 1: Employee foundation
-- Lifecycle, employee number, compensation history, documents, notes, timeline, offboarding

create table if not exists public.hr_employee_number_seq (
  workspace_id text primary key,
  next_value integer not null default 1
);

alter table public.hr_employees add column if not exists employee_number text;
alter table public.hr_employees add column if not exists preferred_name text not null default '';
alter table public.hr_employees add column if not exists address text not null default '';
alter table public.hr_employees add column if not exists emergency_contact_name text not null default '';
alter table public.hr_employees add column if not exists emergency_contact_phone text not null default '';
alter table public.hr_employees add column if not exists emergency_contact_relationship text not null default '';
alter table public.hr_employees add column if not exists nationality text not null default '';
alter table public.hr_employees add column if not exists employment_status text not null default 'active';
alter table public.hr_employees add column if not exists employment_type text not null default 'full_time';
alter table public.hr_employees add column if not exists manager_employee_id text;
alter table public.hr_employees add column if not exists office_id text;
alter table public.hr_employees add column if not exists probation_end_date date;
alter table public.hr_employees add column if not exists end_date date;
alter table public.hr_employees add column if not exists pay_frequency text not null default 'annual';
alter table public.hr_employees add column if not exists currency text not null default 'EUR';
alter table public.hr_employees add column if not exists platform_user_id text;
alter table public.hr_employees add column if not exists operator_id text;
alter table public.hr_employees add column if not exists archived_at timestamptz;

alter table public.hr_employees add column if not exists notice_given_date date;
alter table public.hr_employees add column if not exists notice_period text;
alter table public.hr_employees add column if not exists final_working_day date;
alter table public.hr_employees add column if not exists termination_date date;
alter table public.hr_employees add column if not exists termination_reason text;
alter table public.hr_employees add column if not exists exit_interview text;
alter table public.hr_employees add column if not exists company_assets_returned boolean not null default false;
alter table public.hr_employees add column if not exists accounts_disabled boolean not null default false;
alter table public.hr_employees add column if not exists final_payroll_ref text;
alter table public.hr_employees add column if not exists outstanding_leave_paid_ref text;
alter table public.hr_employees add column if not exists redundancy_payment_ref text;
alter table public.hr_employees add column if not exists severance_payment_ref text;
alter table public.hr_employees add column if not exists outstanding_expenses_ref text;
alter table public.hr_employees add column if not exists final_amount_paid numeric(12, 2);
alter table public.hr_employees add column if not exists final_payment_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'hr_employees_employment_status_check'
  ) then
    alter table public.hr_employees
      add constraint hr_employees_employment_status_check
      check (
        employment_status in (
          'candidate',
          'offer_accepted',
          'employee',
          'probation',
          'active',
          'leave_of_absence',
          'notice_given',
          'former_employee',
          'archived'
        )
      );
  end if;
end $$;

update public.hr_employees
set employment_status = 'active'
where employment_status is null or employment_status = '';

update public.hr_employees
set pay_frequency = 'annual'
where pay_frequency is null or pay_frequency = '';

update public.hr_employees
set currency = 'EUR'
where currency is null or currency = '';

-- Backfill employee numbers in join-date order within each workspace (or null workspace as '')
with ordered as (
  select
    id,
    coalesce(workspace_id::text, '') as ws,
    row_number() over (
      partition by coalesce(workspace_id::text, '')
      order by date_joined asc nulls last, id asc
    ) as rn
  from public.hr_employees
  where employee_number is null or employee_number = ''
)
update public.hr_employees e
set employee_number = 'EMP-' || lpad(ordered.rn::text, 4, '0')
from ordered
where e.id = ordered.id;

-- Ensure unique employee_number per workspace where present
create unique index if not exists hr_employees_employee_number_uidx
  on public.hr_employees (workspace_id, employee_number)
  where employee_number is not null and employee_number <> '';

create index if not exists hr_employees_workspace_status_idx
  on public.hr_employees (workspace_id, employment_status);

create index if not exists hr_employees_manager_idx
  on public.hr_employees (manager_employee_id);

-- Seed number sequence from max assigned
insert into public.hr_employee_number_seq (workspace_id, next_value)
select
  coalesce(workspace_id::text, ''),
  coalesce(
    max(
      nullif(regexp_replace(employee_number, '^EMP-', ''), '')::int
    ),
    0
  ) + 1
from public.hr_employees
where employee_number ~ '^EMP-[0-9]+$'
group by coalesce(workspace_id::text, '')
on conflict (workspace_id) do update
set next_value = greatest(public.hr_employee_number_seq.next_value, excluded.next_value);

create table if not exists public.hr_employee_compensation_history (
  id text primary key,
  workspace_id text not null,
  employee_id text not null references public.hr_employees (id) on delete cascade,
  category text not null,
  effective_date date not null,
  amount numeric(12, 2),
  currency text not null default 'EUR',
  reason text not null default '',
  approved_by text not null default '',
  terms text,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hr_comp_history_category_check check (
    category in ('salary', 'bonus', 'share_options', 'pension', 'benefits')
  )
);

create unique index if not exists hr_comp_history_current_uidx
  on public.hr_employee_compensation_history (employee_id, category)
  where superseded_at is null;

create index if not exists hr_comp_history_employee_idx
  on public.hr_employee_compensation_history (employee_id, effective_date desc);

create table if not exists public.hr_employee_documents (
  id text primary key,
  workspace_id text not null,
  employee_id text not null references public.hr_employees (id) on delete cascade,
  document_type text not null,
  title text not null default '',
  file_name text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  uploaded_by text not null default '',
  uploaded_at timestamptz not null default now(),
  expires_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hr_employee_documents_type_check check (
    document_type in (
      'resume',
      'employment_contract',
      'passport',
      'visa',
      'right_to_work',
      'driving_licence',
      'qualifications',
      'certifications',
      'training_certificates',
      'medical',
      'insurance',
      'performance_reviews',
      'share_option_agreement',
      'other'
    )
  )
);

create index if not exists hr_employee_documents_employee_idx
  on public.hr_employee_documents (employee_id, uploaded_at desc);

create table if not exists public.hr_employee_notes (
  id text primary key,
  workspace_id text not null,
  employee_id text not null references public.hr_employees (id) on delete cascade,
  body text not null,
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists hr_employee_notes_employee_idx
  on public.hr_employee_notes (employee_id, created_at desc);

create table if not exists public.hr_employee_timeline_events (
  id text primary key,
  workspace_id text not null,
  employee_id text not null references public.hr_employees (id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  title text not null,
  detail text,
  source text not null default 'employees',
  created_at timestamptz not null default now()
);

create index if not exists hr_employee_timeline_employee_idx
  on public.hr_employee_timeline_events (employee_id, occurred_at desc);

create table if not exists public.hr_employee_employment_history (
  id text primary key,
  workspace_id text not null,
  employee_id text not null references public.hr_employees (id) on delete cascade,
  effective_date date not null,
  department text not null default '',
  role text not null default '',
  location text not null default '',
  office_id text,
  manager_employee_id text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists hr_employee_employment_history_idx
  on public.hr_employee_employment_history (employee_id, effective_date desc);

-- Seed compensation history from legacy salary fields (idempotent-ish: only if none exist)
insert into public.hr_employee_compensation_history (
  id, workspace_id, employee_id, category, effective_date, amount, currency, reason, approved_by, superseded_at
)
select
  'comp-seed-sal-prev-' || e.id,
  coalesce(e.workspace_id::text, ''),
  e.id,
  'salary',
  e.date_joined,
  e.salary_previous,
  coalesce(nullif(e.currency, ''), 'EUR'),
  'Phase 1 backfill (previous salary)',
  'system',
  now()
from public.hr_employees e
where e.salary_previous > 0
  and e.salary_previous <> e.salary_current
  and not exists (
    select 1 from public.hr_employee_compensation_history h where h.employee_id = e.id and h.category = 'salary'
  );

insert into public.hr_employee_compensation_history (
  id, workspace_id, employee_id, category, effective_date, amount, currency, reason, approved_by
)
select
  'comp-seed-sal-' || e.id,
  coalesce(e.workspace_id::text, ''),
  e.id,
  'salary',
  coalesce(e.salary_increase_date, e.date_joined),
  e.salary_current,
  coalesce(nullif(e.currency, ''), 'EUR'),
  'Phase 1 backfill (current salary)',
  'system'
from public.hr_employees e
where e.salary_current > 0
  and not exists (
    select 1
    from public.hr_employee_compensation_history h
    where h.employee_id = e.id and h.category = 'salary' and h.superseded_at is null
  );

insert into public.hr_employee_compensation_history (
  id, workspace_id, employee_id, category, effective_date, amount, currency, reason, approved_by
)
select
  'comp-seed-bonus-' || e.id,
  coalesce(e.workspace_id::text, ''),
  e.id,
  'bonus',
  coalesce(e.salary_increase_date, e.date_joined),
  e.bonus,
  coalesce(nullif(e.currency, ''), 'EUR'),
  'Phase 1 backfill (bonus)',
  'system'
from public.hr_employees e
where e.bonus > 0
  and not exists (
    select 1 from public.hr_employee_compensation_history h where h.employee_id = e.id and h.category = 'bonus'
  );

-- Seed joined timeline events
insert into public.hr_employee_timeline_events (
  id, workspace_id, employee_id, event_type, occurred_at, title, detail, source
)
select
  'tl-joined-' || e.id,
  coalesce(e.workspace_id::text, ''),
  e.id,
  'joined',
  e.date_joined::timestamptz,
  'Joined',
  'Employment start date',
  'system'
from public.hr_employees e
where not exists (
  select 1 from public.hr_employee_timeline_events t where t.id = 'tl-joined-' || e.id
);

-- Migrate legacy document metadata slots (no file bytes)
insert into public.hr_employee_documents (
  id, workspace_id, employee_id, document_type, title, file_name, uploaded_by, uploaded_at, notes
)
select
  'doc-legacy-resume-' || e.id,
  coalesce(e.workspace_id::text, ''),
  e.id,
  'resume',
  'Resume',
  e.documents->'resume'->>'fileName',
  'system',
  coalesce((e.documents->'resume'->>'uploadedAt')::timestamptz, e.created_at),
  'Migrated from legacy document slot'
from public.hr_employees e
where coalesce(e.documents->'resume'->>'fileName', '') <> ''
  and not exists (select 1 from public.hr_employee_documents d where d.id = 'doc-legacy-resume-' || e.id);

insert into public.hr_employee_documents (
  id, workspace_id, employee_id, document_type, title, file_name, uploaded_by, uploaded_at, notes
)
select
  'doc-legacy-contract-' || e.id,
  coalesce(e.workspace_id::text, ''),
  e.id,
  'employment_contract',
  'Employment Contract',
  e.documents->'contract'->>'fileName',
  'system',
  coalesce((e.documents->'contract'->>'uploadedAt')::timestamptz, e.created_at),
  'Migrated from legacy document slot'
from public.hr_employees e
where coalesce(e.documents->'contract'->>'fileName', '') <> ''
  and not exists (select 1 from public.hr_employee_documents d where d.id = 'doc-legacy-contract-' || e.id);

insert into public.hr_employee_documents (
  id, workspace_id, employee_id, document_type, title, file_name, uploaded_by, uploaded_at, notes
)
select
  'doc-legacy-share-' || e.id,
  coalesce(e.workspace_id::text, ''),
  e.id,
  'share_option_agreement',
  'Share Option Agreement',
  e.documents->'shareOptions'->>'fileName',
  'system',
  coalesce((e.documents->'shareOptions'->>'uploadedAt')::timestamptz, e.created_at),
  'Migrated from legacy document slot'
from public.hr_employees e
where coalesce(e.documents->'shareOptions'->>'fileName', '') <> ''
  and not exists (select 1 from public.hr_employee_documents d where d.id = 'doc-legacy-share-' || e.id);

-- Map manager names to ids where unique match
update public.hr_employees e
set manager_employee_id = m.id
from public.hr_employees m
where e.manager_employee_id is null
  and coalesce(e.manager, '') <> ''
  and lower(trim(m.full_name)) = lower(trim(e.manager))
  and coalesce(m.workspace_id::text, '') = coalesce(e.workspace_id::text, '')
  and m.id <> e.id;

alter table public.hr_employee_compensation_history enable row level security;
alter table public.hr_employee_documents enable row level security;
alter table public.hr_employee_notes enable row level security;
alter table public.hr_employee_timeline_events enable row level security;
alter table public.hr_employee_employment_history enable row level security;
alter table public.hr_employee_number_seq enable row level security;

drop policy if exists "hr_comp_history_all" on public.hr_employee_compensation_history;
create policy "hr_comp_history_all" on public.hr_employee_compensation_history
  for all using (true) with check (true);

drop policy if exists "hr_employee_documents_all" on public.hr_employee_documents;
create policy "hr_employee_documents_all" on public.hr_employee_documents
  for all using (true) with check (true);

drop policy if exists "hr_employee_notes_all" on public.hr_employee_notes;
create policy "hr_employee_notes_all" on public.hr_employee_notes
  for all using (true) with check (true);

drop policy if exists "hr_employee_timeline_all" on public.hr_employee_timeline_events;
create policy "hr_employee_timeline_all" on public.hr_employee_timeline_events
  for all using (true) with check (true);

drop policy if exists "hr_employee_employment_history_all" on public.hr_employee_employment_history;
create policy "hr_employee_employment_history_all" on public.hr_employee_employment_history
  for all using (true) with check (true);

drop policy if exists "hr_employee_number_seq_all" on public.hr_employee_number_seq;
create policy "hr_employee_number_seq_all" on public.hr_employee_number_seq
  for all using (true) with check (true);

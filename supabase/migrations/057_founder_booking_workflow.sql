-- Founder session booking workflow: reminders, CRM links, action items, external folders

alter table public.founder_session_bookings
  add column if not exists week_reminder_sent_at timestamptz,
  add column if not exists hour_reminder_sent_at timestamptz,
  add column if not exists crm_lead_id uuid references public.crm_leads (id) on delete set null,
  add column if not exists external_folder_id uuid references public.file_folders (id) on delete set null;

create table if not exists public.internal_action_items (
  id uuid primary key default gen_random_uuid(),
  priority text not null default 'high',
  task text not null,
  assigned_to text not null default 'Team',
  due_label text not null,
  due_at timestamptz,
  href text,
  crm_lead_id uuid references public.crm_leads (id) on delete set null,
  booking_id uuid references public.founder_session_bookings (id) on delete cascade,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists internal_action_items_open_idx
  on public.internal_action_items (created_at desc)
  where completed_at is null;

alter table public.internal_action_items enable row level security;

drop policy if exists "internal_action_items_all" on public.internal_action_items;
create policy "internal_action_items_all" on public.internal_action_items for all using (true) with check (true);

alter table public.file_folders
  add column if not exists external_scope boolean not null default false;

create index if not exists file_folders_external_scope_idx
  on public.file_folders (external_scope, parent_id, name);

-- CRM contact history + activity timeline (Contact form + Email replies)

alter table public.crm_leads
  add column if not exists first_name text,
  add column if not exists surname text,
  add column if not exists role text,
  add column if not exists last_contact_at timestamptz,
  add column if not exists last_activity_at timestamptz,
  add column if not exists contact_count integer not null default 0;

create table if not exists public.crm_contact_history (
  id uuid primary key default gen_random_uuid(),
  crm_lead_id uuid not null references public.crm_leads (id) on delete cascade,
  subject text,
  message text not null,
  submitted_at timestamptz not null default now(),
  source text not null default 'Website Contact Form',
  reply_status text not null default 'awaiting_reply'
    check (reply_status in ('awaiting_reply', 'replied')),
  reply_at timestamptz,
  replied_by text,
  reply_email_message_id text,
  reply_email_thread_id text,
  notification_email_message_id text,
  confirmation_email_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_contact_history_lead_id_idx
  on public.crm_contact_history (crm_lead_id, submitted_at desc);

create index if not exists crm_contact_history_reply_status_idx
  on public.crm_contact_history (reply_status);

create index if not exists crm_contact_history_notification_msg_idx
  on public.crm_contact_history (notification_email_message_id);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  crm_lead_id uuid not null references public.crm_leads (id) on delete cascade,
  activity_type text not null,
  title text not null,
  subject text,
  message text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  contact_history_id uuid references public.crm_contact_history (id) on delete set null,
  email_message_id text,
  email_thread_id text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists crm_activities_lead_id_idx
  on public.crm_activities (crm_lead_id, occurred_at desc);

alter table public.crm_contact_history enable row level security;
alter table public.crm_activities enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'crm_contact_history' and policyname = 'crm_contact_history_all'
  ) then
    create policy "crm_contact_history_all" on public.crm_contact_history
      for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'crm_activities' and policyname = 'crm_activities_all'
  ) then
    create policy "crm_activities_all" on public.crm_activities
      for all using (true) with check (true);
  end if;
end $$;

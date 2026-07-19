
-- Phase 1: workspace_id foundation for Unit311 Central multi-workspace
-- Project: kkxtvzxqmbacjatkiupq (Unit311 Central)
-- Does not enable RLS. Does not change application logic.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  workspace_type text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.workspaces (name, slug, workspace_type, status)
select 'Unit311 Central', 'unit311', 'Internal', 'Active'
where not exists (
  select 1 from public.workspaces where slug = 'unit311'
);

alter table public.accounts add column if not exists workspace_id uuid;
alter table public.blog_posts add column if not exists workspace_id uuid;
alter table public.client_onboarding_records add column if not exists workspace_id uuid;
alter table public.competitors add column if not exists workspace_id uuid;
alter table public.email_mailbox_credentials add column if not exists workspace_id uuid;
alter table public.email_whatsapp_notification_log add column if not exists workspace_id uuid;
alter table public.email_whatsapp_settings add column if not exists workspace_id uuid;
alter table public.file_categories add column if not exists workspace_id uuid;
alter table public.file_folders add column if not exists workspace_id uuid;
alter table public.file_objects add column if not exists workspace_id uuid;
alter table public.financial_expenses add column if not exists workspace_id uuid;
alter table public.hr_employees add column if not exists workspace_id uuid;
alter table public.internal_action_items add column if not exists workspace_id uuid;
alter table public.internal_calendar_events add column if not exists workspace_id uuid;
alter table public.internal_clients add column if not exists workspace_id uuid;
alter table public.internal_info_email_messages add column if not exists workspace_id uuid;
alter table public.internal_info_email_threads add column if not exists workspace_id uuid;
alter table public.internal_projects add column if not exists workspace_id uuid;
alter table public.internal_scheduled_calls add column if not exists workspace_id uuid;
alter table public.internal_whiteboard add column if not exists workspace_id uuid;
alter table public.invoices add column if not exists workspace_id uuid;
alter table public.journal_entries add column if not exists workspace_id uuid;
alter table public.platform_organisation_onboarding add column if not exists workspace_id uuid;
alter table public.platform_organisations add column if not exists workspace_id uuid;
alter table public.platform_users add column if not exists workspace_id uuid;
alter table public.strategy_items add column if not exists workspace_id uuid;
alter table public.support_tickets add column if not exists workspace_id uuid;
alter table public.telemetry add column if not exists workspace_id uuid;
alter table public.whatsapp_inbound_log add column if not exists workspace_id uuid;
alter table public.whatsapp_support_sessions add column if not exists workspace_id uuid;
alter table public.whiteboard_projects add column if not exists workspace_id uuid;
alter table public.wise_payment_matches add column if not exists workspace_id uuid;


update public.accounts
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.blog_posts
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.client_onboarding_records
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.competitors
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.email_mailbox_credentials
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.email_whatsapp_notification_log
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.email_whatsapp_settings
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.file_categories
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.file_folders
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.file_objects
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.financial_expenses
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.hr_employees
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_action_items
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_calendar_events
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_clients
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_info_email_messages
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_info_email_threads
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_projects
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_scheduled_calls
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_whiteboard
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.invoices
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.journal_entries
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.platform_organisation_onboarding
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.platform_organisations
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.platform_users
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.strategy_items
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.support_tickets
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.telemetry
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.whatsapp_inbound_log
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.whatsapp_support_sessions
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.whiteboard_projects
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.wise_payment_matches
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

-- Fail the migration if any target table still has null workspace_id before NOT NULL.
do $$
declare
  null_count bigint;
  table_name text;
begin
  foreach table_name in array array['accounts', 'blog_posts', 'client_onboarding_records', 'competitors', 'email_mailbox_credentials', 'email_whatsapp_notification_log', 'email_whatsapp_settings', 'file_categories', 'file_folders', 'file_objects', 'financial_expenses', 'hr_employees', 'internal_action_items', 'internal_calendar_events', 'internal_clients', 'internal_info_email_messages', 'internal_info_email_threads', 'internal_projects', 'internal_scheduled_calls', 'internal_whiteboard', 'invoices', 'journal_entries', 'platform_organisation_onboarding', 'platform_organisations', 'platform_users', 'strategy_items', 'support_tickets', 'telemetry', 'whatsapp_inbound_log', 'whatsapp_support_sessions', 'whiteboard_projects', 'wise_payment_matches']
  loop
    execute format(
      'select count(*) from public.%I where workspace_id is null',
      table_name
    ) into null_count;
    if null_count > 0 then
      raise exception 'Backfill failed for %.% rows still null', table_name, null_count;
    end if;
  end loop;

  if not exists (select 1 from public.workspaces where slug = 'unit311') then
    raise exception 'Unit311 Central workspace (slug=unit311) is missing';
  end if;
end $$;


do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'accounts_workspace_id_fkey'
  ) then
    alter table public.accounts
      add constraint accounts_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'blog_posts_workspace_id_fkey'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_onboarding_records_workspace_id_fkey'
  ) then
    alter table public.client_onboarding_records
      add constraint client_onboarding_records_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'competitors_workspace_id_fkey'
  ) then
    alter table public.competitors
      add constraint competitors_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'email_mailbox_credentials_workspace_id_fkey'
  ) then
    alter table public.email_mailbox_credentials
      add constraint email_mailbox_credentials_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'email_whatsapp_notification_log_workspace_id_fkey'
  ) then
    alter table public.email_whatsapp_notification_log
      add constraint email_whatsapp_notification_log_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'email_whatsapp_settings_workspace_id_fkey'
  ) then
    alter table public.email_whatsapp_settings
      add constraint email_whatsapp_settings_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'file_categories_workspace_id_fkey'
  ) then
    alter table public.file_categories
      add constraint file_categories_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'file_folders_workspace_id_fkey'
  ) then
    alter table public.file_folders
      add constraint file_folders_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'file_objects_workspace_id_fkey'
  ) then
    alter table public.file_objects
      add constraint file_objects_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'financial_expenses_workspace_id_fkey'
  ) then
    alter table public.financial_expenses
      add constraint financial_expenses_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'hr_employees_workspace_id_fkey'
  ) then
    alter table public.hr_employees
      add constraint hr_employees_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'internal_action_items_workspace_id_fkey'
  ) then
    alter table public.internal_action_items
      add constraint internal_action_items_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'internal_calendar_events_workspace_id_fkey'
  ) then
    alter table public.internal_calendar_events
      add constraint internal_calendar_events_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'internal_clients_workspace_id_fkey'
  ) then
    alter table public.internal_clients
      add constraint internal_clients_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'internal_info_email_messages_workspace_id_fkey'
  ) then
    alter table public.internal_info_email_messages
      add constraint internal_info_email_messages_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'internal_info_email_threads_workspace_id_fkey'
  ) then
    alter table public.internal_info_email_threads
      add constraint internal_info_email_threads_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'internal_projects_workspace_id_fkey'
  ) then
    alter table public.internal_projects
      add constraint internal_projects_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'internal_scheduled_calls_workspace_id_fkey'
  ) then
    alter table public.internal_scheduled_calls
      add constraint internal_scheduled_calls_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'internal_whiteboard_workspace_id_fkey'
  ) then
    alter table public.internal_whiteboard
      add constraint internal_whiteboard_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'invoices_workspace_id_fkey'
  ) then
    alter table public.invoices
      add constraint invoices_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'journal_entries_workspace_id_fkey'
  ) then
    alter table public.journal_entries
      add constraint journal_entries_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'platform_organisation_onboarding_workspace_id_fkey'
  ) then
    alter table public.platform_organisation_onboarding
      add constraint platform_organisation_onboarding_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'platform_organisations_workspace_id_fkey'
  ) then
    alter table public.platform_organisations
      add constraint platform_organisations_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'platform_users_workspace_id_fkey'
  ) then
    alter table public.platform_users
      add constraint platform_users_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'strategy_items_workspace_id_fkey'
  ) then
    alter table public.strategy_items
      add constraint strategy_items_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'support_tickets_workspace_id_fkey'
  ) then
    alter table public.support_tickets
      add constraint support_tickets_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'telemetry_workspace_id_fkey'
  ) then
    alter table public.telemetry
      add constraint telemetry_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'whatsapp_inbound_log_workspace_id_fkey'
  ) then
    alter table public.whatsapp_inbound_log
      add constraint whatsapp_inbound_log_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'whatsapp_support_sessions_workspace_id_fkey'
  ) then
    alter table public.whatsapp_support_sessions
      add constraint whatsapp_support_sessions_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'whiteboard_projects_workspace_id_fkey'
  ) then
    alter table public.whiteboard_projects
      add constraint whiteboard_projects_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'wise_payment_matches_workspace_id_fkey'
  ) then
    alter table public.wise_payment_matches
      add constraint wise_payment_matches_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

create index if not exists accounts_workspace_id_idx on public.accounts (workspace_id);
create index if not exists blog_posts_workspace_id_idx on public.blog_posts (workspace_id);
create index if not exists client_onboarding_records_workspace_id_idx on public.client_onboarding_records (workspace_id);
create index if not exists competitors_workspace_id_idx on public.competitors (workspace_id);
create index if not exists email_mailbox_credentials_workspace_id_idx on public.email_mailbox_credentials (workspace_id);
create index if not exists email_whatsapp_notification_log_workspace_id_idx on public.email_whatsapp_notification_log (workspace_id);
create index if not exists email_whatsapp_settings_workspace_id_idx on public.email_whatsapp_settings (workspace_id);
create index if not exists file_categories_workspace_id_idx on public.file_categories (workspace_id);
create index if not exists file_folders_workspace_id_idx on public.file_folders (workspace_id);
create index if not exists file_objects_workspace_id_idx on public.file_objects (workspace_id);
create index if not exists financial_expenses_workspace_id_idx on public.financial_expenses (workspace_id);
create index if not exists hr_employees_workspace_id_idx on public.hr_employees (workspace_id);
create index if not exists internal_action_items_workspace_id_idx on public.internal_action_items (workspace_id);
create index if not exists internal_calendar_events_workspace_id_idx on public.internal_calendar_events (workspace_id);
create index if not exists internal_clients_workspace_id_idx on public.internal_clients (workspace_id);
create index if not exists internal_info_email_messages_workspace_id_idx on public.internal_info_email_messages (workspace_id);
create index if not exists internal_info_email_threads_workspace_id_idx on public.internal_info_email_threads (workspace_id);
create index if not exists internal_projects_workspace_id_idx on public.internal_projects (workspace_id);
create index if not exists internal_scheduled_calls_workspace_id_idx on public.internal_scheduled_calls (workspace_id);
create index if not exists internal_whiteboard_workspace_id_idx on public.internal_whiteboard (workspace_id);
create index if not exists invoices_workspace_id_idx on public.invoices (workspace_id);
create index if not exists journal_entries_workspace_id_idx on public.journal_entries (workspace_id);
create index if not exists platform_organisation_onboarding_workspace_id_idx on public.platform_organisation_onboarding (workspace_id);
create index if not exists platform_organisations_workspace_id_idx on public.platform_organisations (workspace_id);
create index if not exists platform_users_workspace_id_idx on public.platform_users (workspace_id);
create index if not exists strategy_items_workspace_id_idx on public.strategy_items (workspace_id);
create index if not exists support_tickets_workspace_id_idx on public.support_tickets (workspace_id);
create index if not exists telemetry_workspace_id_idx on public.telemetry (workspace_id);
create index if not exists whatsapp_inbound_log_workspace_id_idx on public.whatsapp_inbound_log (workspace_id);
create index if not exists whatsapp_support_sessions_workspace_id_idx on public.whatsapp_support_sessions (workspace_id);
create index if not exists whiteboard_projects_workspace_id_idx on public.whiteboard_projects (workspace_id);
create index if not exists wise_payment_matches_workspace_id_idx on public.wise_payment_matches (workspace_id);


alter table public.accounts
  alter column workspace_id set not null;

alter table public.blog_posts
  alter column workspace_id set not null;

alter table public.client_onboarding_records
  alter column workspace_id set not null;

alter table public.competitors
  alter column workspace_id set not null;

alter table public.email_mailbox_credentials
  alter column workspace_id set not null;

alter table public.email_whatsapp_notification_log
  alter column workspace_id set not null;

alter table public.email_whatsapp_settings
  alter column workspace_id set not null;

alter table public.file_categories
  alter column workspace_id set not null;

alter table public.file_folders
  alter column workspace_id set not null;

alter table public.file_objects
  alter column workspace_id set not null;

alter table public.financial_expenses
  alter column workspace_id set not null;

alter table public.hr_employees
  alter column workspace_id set not null;

alter table public.internal_action_items
  alter column workspace_id set not null;

alter table public.internal_calendar_events
  alter column workspace_id set not null;

alter table public.internal_clients
  alter column workspace_id set not null;

alter table public.internal_info_email_messages
  alter column workspace_id set not null;

alter table public.internal_info_email_threads
  alter column workspace_id set not null;

alter table public.internal_projects
  alter column workspace_id set not null;

alter table public.internal_scheduled_calls
  alter column workspace_id set not null;

alter table public.internal_whiteboard
  alter column workspace_id set not null;

alter table public.invoices
  alter column workspace_id set not null;

alter table public.journal_entries
  alter column workspace_id set not null;

alter table public.platform_organisation_onboarding
  alter column workspace_id set not null;

alter table public.platform_organisations
  alter column workspace_id set not null;

alter table public.platform_users
  alter column workspace_id set not null;

alter table public.strategy_items
  alter column workspace_id set not null;

alter table public.support_tickets
  alter column workspace_id set not null;

alter table public.telemetry
  alter column workspace_id set not null;

alter table public.whatsapp_inbound_log
  alter column workspace_id set not null;

alter table public.whatsapp_support_sessions
  alter column workspace_id set not null;

alter table public.whiteboard_projects
  alter column workspace_id set not null;

alter table public.wise_payment_matches
  alter column workspace_id set not null;


-- Keep existing application inserts working in Phase 1 (no app code changes yet).
do $$
declare
  unit311_id uuid;
begin
  select id into unit311_id from public.workspaces where slug = 'unit311' limit 1;
  if unit311_id is null then
    raise exception 'Unit311 Central workspace missing while setting defaults';
  end if;

  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'accounts',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'blog_posts',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'client_onboarding_records',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'competitors',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'email_mailbox_credentials',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'email_whatsapp_notification_log',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'email_whatsapp_settings',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'file_categories',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'file_folders',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'file_objects',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'financial_expenses',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'hr_employees',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'internal_action_items',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'internal_calendar_events',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'internal_clients',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'internal_info_email_messages',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'internal_info_email_threads',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'internal_projects',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'internal_scheduled_calls',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'internal_whiteboard',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'invoices',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'journal_entries',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'platform_organisation_onboarding',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'platform_organisations',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'platform_users',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'strategy_items',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'support_tickets',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'telemetry',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'whatsapp_inbound_log',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'whatsapp_support_sessions',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'whiteboard_projects',
    unit311_id
  );
  execute format(
    'alter table public.%I alter column workspace_id set default %L::uuid',
    'wise_payment_matches',
    unit311_id
  );
end $$;

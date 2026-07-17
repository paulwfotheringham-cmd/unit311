-- Phase 2: Messaging, Email, Support workspace isolation.
-- Email/Support tables already have workspace_id from 076.
-- Messaging core tables need workspace_id; uniqueness must be tenant-scoped.

-- ---------------------------------------------------------------------------
-- Messaging: add workspace_id
-- ---------------------------------------------------------------------------
alter table public.internal_message_channels add column if not exists workspace_id uuid;
alter table public.internal_messages add column if not exists workspace_id uuid;
alter table public.internal_message_read_state add column if not exists workspace_id uuid;

update public.internal_message_channels
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_messages m
set workspace_id = c.workspace_id
from public.internal_message_channels c
where m.room = c.room
  and m.workspace_id is null
  and c.workspace_id is not null;

update public.internal_messages
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_message_read_state rs
set workspace_id = c.workspace_id
from public.internal_message_channels c
where rs.room = c.room
  and rs.workspace_id is null
  and c.workspace_id is not null;

update public.internal_message_read_state
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

update public.internal_scheduled_calls sc
set workspace_id = c.workspace_id
from public.internal_message_channels c
where sc.room = c.room
  and sc.workspace_id is null
  and c.workspace_id is not null;

update public.internal_scheduled_calls
set workspace_id = (select id from public.workspaces where slug = 'unit311' limit 1)
where workspace_id is null;

do $$
declare
  null_count bigint;
  table_name text;
begin
  foreach table_name in array array[
    'internal_message_channels',
    'internal_messages',
    'internal_message_read_state',
    'internal_scheduled_calls'
  ]
  loop
    execute format(
      'select count(*) from public.%I where workspace_id is null',
      table_name
    ) into null_count;
    if null_count > 0 then
      raise exception 'Backfill failed for %. % rows still null', table_name, null_count;
    end if;
  end loop;

  if not exists (select 1 from public.workspaces where slug = 'unit311') then
    raise exception 'Unit311 Central workspace (slug=unit311) is missing';
  end if;
end $$;

alter table public.internal_message_channels alter column workspace_id set not null;
alter table public.internal_messages alter column workspace_id set not null;
alter table public.internal_message_read_state alter column workspace_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'internal_message_channels_workspace_id_fkey'
  ) then
    alter table public.internal_message_channels
      add constraint internal_message_channels_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'internal_messages_workspace_id_fkey'
  ) then
    alter table public.internal_messages
      add constraint internal_messages_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'internal_message_read_state_workspace_id_fkey'
  ) then
    alter table public.internal_message_read_state
      add constraint internal_message_read_state_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces (id)
      on delete restrict;
  end if;
end $$;

alter table public.internal_message_channels drop constraint if exists internal_message_channels_room_key;
create unique index if not exists internal_message_channels_workspace_room_uidx
  on public.internal_message_channels (workspace_id, room);

alter table public.internal_message_read_state drop constraint if exists internal_message_read_state_pkey;
alter table public.internal_message_read_state
  add constraint internal_message_read_state_pkey
  primary key (workspace_id, viewer_key, room);

create index if not exists internal_message_channels_workspace_id_idx
  on public.internal_message_channels (workspace_id);
create index if not exists internal_messages_workspace_id_idx
  on public.internal_messages (workspace_id);
create index if not exists internal_messages_workspace_room_created_idx
  on public.internal_messages (workspace_id, room, created_at desc);
create index if not exists internal_message_read_state_workspace_id_idx
  on public.internal_message_read_state (workspace_id);
create index if not exists internal_scheduled_calls_workspace_id_idx
  on public.internal_scheduled_calls (workspace_id);

alter table public.internal_message_channels
  alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.internal_messages
  alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.internal_message_read_state
  alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;

-- ---------------------------------------------------------------------------
-- Email: allow one credential/settings/log row per workspace + account
-- ---------------------------------------------------------------------------
alter table public.email_mailbox_credentials drop constraint if exists email_mailbox_credentials_pkey;
create unique index if not exists email_mailbox_credentials_workspace_account_uidx
  on public.email_mailbox_credentials (workspace_id, account_id);

alter table public.email_whatsapp_settings drop constraint if exists email_whatsapp_settings_pkey;
create unique index if not exists email_whatsapp_settings_workspace_account_uidx
  on public.email_whatsapp_settings (workspace_id, account_id);

alter table public.email_whatsapp_notification_log
  drop constraint if exists email_whatsapp_notification_log_account_id_message_uid_key;
create unique index if not exists email_whatsapp_notification_log_workspace_account_uid_uidx
  on public.email_whatsapp_notification_log (workspace_id, account_id, message_uid);

-- ---------------------------------------------------------------------------
-- Support WhatsApp sessions: phone unique per workspace
-- ---------------------------------------------------------------------------
alter table public.whatsapp_support_sessions drop constraint if exists whatsapp_support_sessions_pkey;

alter table public.whatsapp_support_sessions
  add column if not exists id uuid;

update public.whatsapp_support_sessions
set id = gen_random_uuid()
where id is null;

alter table public.whatsapp_support_sessions
  alter column id set default gen_random_uuid();

alter table public.whatsapp_support_sessions
  alter column id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'whatsapp_support_sessions_pkey'
  ) then
    alter table public.whatsapp_support_sessions
      add constraint whatsapp_support_sessions_pkey primary key (id);
  end if;
end $$;

create unique index if not exists whatsapp_support_sessions_workspace_phone_uidx
  on public.whatsapp_support_sessions (workspace_id, phone);

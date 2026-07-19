-- Unit311 Central messaging cleanup: remove legacy BCN operators, test channels, and reset members

delete from public.internal_operators
where id in ('user-bcndrone', 'user-1', 'user-2', 'user-3', 'user-4', 'user-5');

delete from public.internal_messages
where room in (
  select room
  from public.internal_message_channels
  where name = 'Nick'
     or (channel_type = 'client' and name <> 'Test Channel')
);

delete from public.internal_scheduled_calls
where room in (
  select room
  from public.internal_message_channels
  where name = 'Nick'
     or (channel_type = 'client' and name <> 'Test Channel')
);

delete from public.internal_message_read_state
where room in (
  select room
  from public.internal_message_channels
  where name = 'Nick'
     or (channel_type = 'client' and name <> 'Test Channel')
);

delete from public.internal_message_channels
where name = 'Nick'
   or (channel_type = 'client' and name <> 'Test Channel');

update public.internal_message_channels
set member_operator_ids = (
  select coalesce(array_agg(id order by full_name), '{}'::text[])
  from public.internal_operators
  where status = 'Active'
)
where channel_type = 'internal';

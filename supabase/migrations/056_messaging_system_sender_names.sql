-- Normalize legacy system message sender labels in messaging channels

update public.internal_messages
set
  operator_name = 'System',
  operator_id = case when operator_id in ('user-bcndrone', 'user-1', 'user-2', 'user-3', 'user-4', 'user-5') then 'system' else operator_id end
where message_type = 'system'
   or username = 'system'
   or operator_name in ('Unit311 Operations', 'BCN Operations');

update public.internal_message_channels
set created_by_operator_name = 'System'
where created_by_operator_name in ('Unit311 Operations', 'BCN Operations');

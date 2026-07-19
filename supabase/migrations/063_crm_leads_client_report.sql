alter table public.crm_leads
  add column if not exists client_report_file_id uuid,
  add column if not exists client_report_file_name text,
  add column if not exists client_report_sent_at timestamptz,
  add column if not exists client_chat_room text,
  add column if not exists client_chat_key text,
  add column if not exists client_chat_access_token text;

create unique index if not exists crm_leads_client_chat_access_token_idx
  on public.crm_leads (client_chat_access_token)
  where client_chat_access_token is not null;

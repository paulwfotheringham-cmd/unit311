alter table public.crm_leads
  add column if not exists client_report_message_id text,
  add column if not exists client_report_replied_at timestamptz,
  add column if not exists client_report_reminder_7d_sent_at timestamptz,
  add column if not exists client_report_reminder_14d_sent_at timestamptz,
  add column if not exists client_report_last_reminder_sent_at timestamptz;

create index if not exists crm_leads_client_report_followups_idx
  on public.crm_leads (client_report_sent_at)
  where client_report_sent_at is not null and client_report_replied_at is null;

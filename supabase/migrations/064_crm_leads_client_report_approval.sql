alter table public.crm_leads
  add column if not exists client_report_generated_at timestamptz,
  add column if not exists client_report_ppt_file_id uuid,
  add column if not exists client_report_ppt_file_name text;

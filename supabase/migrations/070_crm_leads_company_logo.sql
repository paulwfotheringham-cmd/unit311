alter table public.crm_leads
  add column if not exists company_logo_file_id uuid,
  add column if not exists company_logo_file_name text;

alter table public.crm_leads
  add column if not exists discovery_questionnaire jsonb;

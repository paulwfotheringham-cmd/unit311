-- Discovery notes for CRM leads (rich-text HTML)

alter table public.crm_leads
  add column if not exists discovery_notes text;

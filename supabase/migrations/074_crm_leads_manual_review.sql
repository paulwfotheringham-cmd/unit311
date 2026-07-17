-- Flag ambiguous CRM matches from Contact Form for manual review

alter table public.crm_leads
  add column if not exists needs_manual_review boolean not null default false,
  add column if not exists manual_review_reason text;

create index if not exists crm_leads_needs_manual_review_idx
  on public.crm_leads (needs_manual_review)
  where needs_manual_review = true;

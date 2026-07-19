-- Snapshot the first Website Contact Form enquiry on the CRM lead

alter table public.crm_leads
  add column if not exists original_enquiry_subject text,
  add column if not exists original_enquiry_message text,
  add column if not exists original_enquiry_submitted_at timestamptz;

-- Backfill from the earliest Contact History entry per lead
update public.crm_leads as lead
set
  original_enquiry_subject = history.subject,
  original_enquiry_message = history.message,
  original_enquiry_submitted_at = history.submitted_at
from (
  select distinct on (crm_lead_id)
    crm_lead_id,
    subject,
    message,
    submitted_at
  from public.crm_contact_history
  where coalesce(source, '') = 'Website Contact Form'
     or source is null
  order by crm_lead_id, submitted_at asc
) as history
where lead.id = history.crm_lead_id
  and lead.original_enquiry_submitted_at is null;

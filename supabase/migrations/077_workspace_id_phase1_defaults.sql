
-- Phase 1 follow-up: default workspace_id so existing inserts keep working
-- without application changes. Default is Unit311 Central Internal workspace.
alter table public.accounts alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.blog_posts alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.client_onboarding_records alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.competitors alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.email_mailbox_credentials alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.email_whatsapp_notification_log alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.email_whatsapp_settings alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.file_categories alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.file_folders alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.file_objects alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.financial_expenses alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.hr_employees alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.internal_action_items alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.internal_calendar_events alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.internal_clients alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.internal_info_email_messages alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.internal_info_email_threads alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.internal_projects alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.internal_scheduled_calls alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.internal_whiteboard alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.invoices alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.journal_entries alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.platform_organisation_onboarding alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.platform_organisations alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.platform_users alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.strategy_items alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.support_tickets alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.telemetry alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.whatsapp_inbound_log alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.whatsapp_support_sessions alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.whiteboard_projects alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;
alter table public.wise_payment_matches alter column workspace_id set default 'cd5c37a5-add4-4a8b-830c-6d26b775f62c'::uuid;


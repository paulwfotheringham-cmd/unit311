-- MOD-900 — list query indexes for common workspace-scoped lookups (idempotent).

create index if not exists idx_internal_clients_workspace_company
  on public.internal_clients (workspace_id, company_name);

create index if not exists idx_internal_projects_workspace_updated
  on public.internal_projects (workspace_id, updated_at desc);

create index if not exists idx_support_tickets_workspace_created
  on public.support_tickets (workspace_id, created_at desc);

create index if not exists idx_support_tickets_workspace_archived
  on public.support_tickets (workspace_id, archived)
  where archived = false;

-- Workspace customer onboarding wizard (V1 prototype)
-- Temporary completion flag for first-login wizard gating.

alter table public.workspaces
  add column if not exists onboarding_completed boolean not null default false;

comment on column public.workspaces.onboarding_completed is
  'When false, eligible prototype workspaces (e.g. fotheringham) redirect to the customer onboarding wizard after login.';

create index if not exists workspaces_onboarding_completed_idx
  on public.workspaces (onboarding_completed)
  where onboarding_completed = false;

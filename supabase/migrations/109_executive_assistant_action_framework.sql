-- Executive Assistant Action Framework (Phase 1)
-- Plans awaiting confirmation + central audit log for executed business actions.
--
-- Security:
-- - RLS enabled with NO permissive policies for anon/authenticated.
-- - Access via Next.js server using SUPABASE_SERVICE_ROLE_KEY only.

create table if not exists public.executive_assistant_action_plans (
  id text primary key,
  user_id text not null,
  workspace_id text null,
  organisation_id text null,
  conversation_id text null,
  status text not null default 'proposed',
  title text not null default 'Action plan',
  summary text not null default '',
  ai_request text null,
  steps jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  permission_notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists executive_assistant_action_plans_user_updated_idx
  on public.executive_assistant_action_plans (user_id, updated_at desc);

create index if not exists executive_assistant_action_plans_status_idx
  on public.executive_assistant_action_plans (status, updated_at desc);

alter table public.executive_assistant_action_plans enable row level security;
drop policy if exists "executive_assistant_action_plans_all" on public.executive_assistant_action_plans;

create table if not exists public.executive_assistant_action_audit (
  id text primary key,
  plan_id text null,
  step_id text null,
  user_id text not null,
  workspace_id text null,
  module text not null,
  action_id text not null,
  action_name text not null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  result text not null,
  duration_ms integer null,
  ai_request text null,
  tool_calls jsonb not null default '[]'::jsonb,
  error text null,
  created_at timestamptz not null default now()
);

create index if not exists executive_assistant_action_audit_user_created_idx
  on public.executive_assistant_action_audit (user_id, created_at desc);

create index if not exists executive_assistant_action_audit_plan_idx
  on public.executive_assistant_action_audit (plan_id, created_at desc);

create index if not exists executive_assistant_action_audit_action_idx
  on public.executive_assistant_action_audit (action_id, created_at desc);

alter table public.executive_assistant_action_audit enable row level security;
drop policy if exists "executive_assistant_action_audit_all" on public.executive_assistant_action_audit;
-- Intentionally no open policies: service-role server access only.

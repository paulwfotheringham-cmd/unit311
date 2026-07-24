-- Executive Assistant Planning Engine (Goal plans)
-- Additive to Action Framework Phase 1 — does not alter action_plans / action_audit tables.
--
-- Security:
-- - RLS enabled with NO permissive policies for anon/authenticated.
-- - Access via Next.js server using SUPABASE_SERVICE_ROLE_KEY only.

create table if not exists public.executive_assistant_goal_plans (
  id text primary key,
  user_id text not null,
  workspace_id text null,
  organisation_id text null,
  conversation_id text null,
  goal text not null default '',
  status text not null default 'proposed',
  title text not null default 'Goal plan',
  business_impact text not null default '',
  steps jsonb not null default '[]'::jsonb,
  graph jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  permission_notes jsonb not null default '[]'::jsonb,
  estimated_duration_ms integer null,
  risk_level text not null default 'low',
  rollback_available boolean not null default false,
  confirmation_required boolean not null default true,
  action_plan_id text null,
  audit_reference text null,
  started_at timestamptz null,
  completed_at timestamptz null,
  duration_ms integer null,
  planner_source text not null default 'heuristic',
  discovered_action_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists executive_assistant_goal_plans_user_updated_idx
  on public.executive_assistant_goal_plans (user_id, updated_at desc);

create index if not exists executive_assistant_goal_plans_status_idx
  on public.executive_assistant_goal_plans (status, updated_at desc);

alter table public.executive_assistant_goal_plans enable row level security;
drop policy if exists "executive_assistant_goal_plans_all" on public.executive_assistant_goal_plans;
-- Intentionally no open policies: service-role server access only.

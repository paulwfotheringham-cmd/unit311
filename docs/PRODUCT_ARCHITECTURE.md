# Product Architecture

Navigation and information-architecture notes for Unit311 Central (ops shell).  
Workspace Isolation is paused until this structure is reviewed and approved.

## Current navigation (post-refinement)

### Business Central

- **Clients** — Dashboard · Client Directory · Client Onboarding
- **CRM** — Pipeline · Executive Strategy Session Meetings · Potential Clients
- **Partners** (view id remains `representatives`) — representatives, distributors, referral/commission partners, affiliates
- **Projects** · **Grants** · **Financials** (unchanged tree)
- **HR** — Dashboard · Employees · Recruitment · Leave · Performance
- **Corporate Information** — Dashboard · Company Details · Office Locations · Bank Accounts · Professional Advisers · Insurance · Software & Licences · Contracts

### Training

- Dashboard · Staff Training · QMS Training  
  Quality Management remains under **QMS**.

### External Client Access

- Dashboard (placeholder for portal builder)
- External Users (moved from Tools → Users)

### Tools / Settings

- Tools → **Users** = Internal users only
- Settings → Profile · General · **Billing** (unchanged position)

---

## Billing recommendation

**Internal Unit311:** Settings → Billing opens **Platform Billing** (all customer subscriptions: plan, MRR/ARR, status, outstanding, next invoice). Data: `platform_customer_subscriptions` (migration `084`).

**Customer workspaces:** Settings → Billing remains the tenant subscription page (plan, payment method, invoices). Unchanged.

| Context | Recommendation |
| --- | --- |
| Customer workspaces | Settings → Billing is the correct place for workspace subscription, plan, and invoices. |
| Internal Unit311 admin | Platform Billing console — do not show Unit311’s own “Professional” subscription mock. |
| Later | Sync Platform Billing rows when customers activate; optional link to AR invoices. |

---

## Users architecture (future — do not implement yet)

Today:

- `platform_users` — login identity (`internal` \| `external`)
- `internal_operators` — Internal Users roster with Staff / Manager / Admin
- No per-module permission matrix; views are not role-gated in the dashboard

Target model (additive, non-breaking):

```
Workspace
  └── Teams (Board, Executive, Management, Engineering, Finance, HR, Sales, …)
        └── Roles
              └── Permissions
                    └── Users (via memberships)
```

### Recommended evolution

1. Keep `platform_users` as the identity table (email/password, `user_type`).
2. Add `workspace_memberships` (user ↔ workspace) when isolation resumes.
3. Add `teams` and `team_memberships` so a user can belong to **multiple teams** in one workspace.
4. Treat current Staff / Manager / Admin as a **legacy role enum** on membership until a full Roles table ships; map legacy values into Roles in a migration, do not delete the enum until clients are upgraded.
5. Permissions should be capability strings (e.g. `clients.read`, `hr.employees.write`) attached to Roles, evaluated in APIs — not only hidden in the sidebar.
6. External portal users stay `user_type=external` and gain portal-scoped grants under External Client Access, separate from internal team memberships.

This lets Teams/Roles land without breaking login or the current Internal Users UI.

---

## Roles placeholder (future security model)

```
Workspace → Teams → Roles → Permissions → Users
```

No Roles UI, tables, or migrations in this pass. Document only until product approves implementation.

---

## External Users placement

**Moved under External Client Access.**

External Users manage `platform_users` with `user_type=external` and portal redirect paths. That roster belongs with the future portal builder (select client → modules → invites → permissions), not with internal operator admin under Tools → Users.

---

## General IA recommendations before Workspace Isolation

| Finding | Recommendation |
| --- | --- |
| Unit311 Details under File Explorer | Later merge into Corporate Information → Company Details |
| Website Management, Testing, Telemetry, Engineering | Internal-only; filter out of customer workspace nav |
| WhatsApp Testing under Support | Keep internal-only |
| Grants next to Projects | Fine; optional later “Funding” group |
| Competitors under Strategy | Fine |
| Dual user stores | Consolidate identity before Roles/Teams |
| Same nav tree on internal + customer hosts | Introduce host/workspace nav profiles before isolation Phase 2B+ |
| Operations section | Removed; Client Onboarding lives under Clients |

---

## Schema / Supabase / Vercel / API

This refinement is **navigation and routing only**:

- No database schema changes
- No Supabase migrations
- No Vercel project/domain changes
- No API contract changes (Partners keeps view id `representatives`)

Routing: new `?view=` keys for placeholders; Client Onboarding hard path has an App Router page at `/internaldashboard/client-onboarding`.

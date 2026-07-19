# Unit311 Central — Architecture

This document is the high-level system overview. Detailed specifications:

- **[docs/WORKSPACE_ARCHITECTURE.md](./docs/WORKSPACE_ARCHITECTURE.md)** — `workspaces`, `workspace_id`, and provisioning
- **[docs/VERCEL_ARCHITECTURE.md](./docs/VERCEL_ARCHITECTURE.md)** — Vercel deployment, domains, middleware, host routing (diagrams under `public/architecture/`)
- **[docs/GITHUB_ARCHITECTURE.md](./docs/GITHUB_ARCHITECTURE.md)** — repository layout, modules, branch/hygiene (diagrams under `public/architecture/`)

## Goals

1. One production Next.js application serves marketing, Internal ops, and future customer workspaces.
2. One production Supabase project (Unit311 Central, `kkxtvzxqmbacjatkiupq`) holds all tenants.
3. Isolation is by `workspace_id` (and host slug), not by separate databases or repos.

## Host model

Configured in `src/middleware.ts` and `src/lib/app-domains.ts`.

| Host | Role |
| --- | --- |
| `unit311central.com` / `www` | Public marketing website + `/login` |
| `internal.unit311central.com` | Unit311 Internal operations app |
| `{slug}.unit311central.com` | Customer workspace host (gateway today; product UI later) |

Reserved subdomains (never customer slugs): `www`, `internal`, `unit311`, `api`, `app`, `admin`, …

### Request flow (simplified)

```text
                    ┌─────────────────────────────┐
   browser ────────►│ Vercel (unit311central)      │
                    │ Next.js + middleware         │
                    └──────────────┬──────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
   apex / www              internal.*                  {slug}.*
   marketing pages         rewrite →                 rewrite →
   /login                  /internaldashboard         /ws/[slug]
          │                        │                        │
          └────────────────────────┴────────────────────────┘
                                   │
                                   ▼
                           Supabase (shared)
                     workspaces + workspace-aware tables
```

### Internal app

- App Router folders under `src/app/(survey-operations)/internaldashboard`.
- UI components currently live in `src/components/testflighthub/` (legacy folder name; product name is Unit311 Central Internal).
- Views are primarily query-driven (`?view=crm`, etc.).

### Customer workspace hosts (current phase)

- Middleware rewrites `{slug}.*` → `/ws/[slug]`.
- Page checks `public.workspaces` by `slug`.
- Missing → branded “Workspace unavailable”.
- Present → onboarding placeholder (no customer product UI yet).
- Login for all users remains on the public apex: `https://unit311central.com/login`.

## Data model (summary)

- Registry: `workspaces` (`slug`, `workspace_type`, `status`, …).
- Foundation: `workspace_settings`, `workspace_modules`, `workspace_users`, `workspace_audit_log`.
- Domain tables marked workspace-aware carry `workspace_id` (Phase 1 backfilled to Internal `unit311`).
- Internal-only tables (CRM, Discovery, Internal Messaging, Operators) stay Unit311 Central only.
- `provision_workspace(company_name, workspace_slug)` seeds a Customer workspace transactionally.

Details: [docs/WORKSPACE_ARCHITECTURE.md](./docs/WORKSPACE_ARCHITECTURE.md).

## Application layers

| Layer | Location |
| --- | --- |
| Routing / hosts | `src/middleware.ts`, `src/lib/app-domains.ts` |
| UI | `src/app/**`, `src/components/**` |
| Domain services | `src/lib/**` |
| HTTP API | `src/app/api/**` |
| Schema | `supabase/migrations/**` |
| Ops scripts | `scripts/**` (no secret-dump helpers) |

## Integrations

| Integration | Primary modules |
| --- | --- |
| Supabase | `src/lib/supabase/**`, migrations |
| Zoho Mail | `src/lib/email/**` |
| Wise | `src/lib/wise-service.ts` |
| WhatsApp notify | `src/lib/whatsapp/**`, CallMeBot/TextMeBot |
| AI Gateway / OpenAI | `src/lib/executive-assistant-ai.ts` |
| WebODM | env-driven dashboard/API links |

## Security notes (architecture)

- Session cookie `dc_platform_session` may use `Domain=.unit311central.com` so apex login can reach Internal / future workspace hosts.
- Production secrets live in Vercel — never in git.
- `/api/internal/*` migration/debug routes are gated by `INTERNAL_FILES_SETUP_SECRET` and must remain restricted.

## Future work (not implemented here)

- Full customer workspace application shell and tenancy-aware queries.
- RLS after application workspace context exists.
- Signup → payment → `provision_workspace()` → owner binding.

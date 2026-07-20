# Deployment

Production app: Vercel project **`unit311central`**  
Production database: Supabase **Unit311 Central** (`kkxtvzxqmbacjatkiupq`)

## Prerequisites

- Access to the `unit311central` Vercel project
- Access to the Unit311 Central Supabase project
- Node.js 20+ recommended for local builds

## Production deploy

**Canonical repository:** `Unit311central/unit311central` (`Desktop\unit311`).

Production must ship from **committed Git revisions** via Vercel Git integration.  
CLI `vercel --prod` is disabled in ops scripts.

```bash
node scripts/assert-canonical-unit311-repo.mjs
# then merge to main on Unit311central/unit311central
```

Full process and rollback: [docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md).

Do **not** deploy Unit311 Central from `Desktop\onwardair`.

## Domains (Vercel)

Configure under **Project → Settings → Domains**:

| Domain | Purpose |
| --- | --- |
| `unit311central.com` | Public website |
| `www.unit311central.com` | Redirect / alias to apex (optional) |
| `internal.unit311central.com` | Internal operations app |
| `*.unit311central.com` | Wildcard for customer workspace hosts |

### DNS checklist

1. Apex + www as required by Vercel (A / CNAME per dashboard instructions).
2. `internal` CNAME → Vercel DNS target shown in the dashboard.
3. Wildcard `*.unit311central.com` CNAME → same Vercel target.
4. Wait until each domain shows **Valid** and SSL **Issued**.

Until the wildcard domain and DNS are active, customer subdomains will fail at the edge (DNS/SSL 404) even though application middleware is ready.

## Environment variables

Source of truth for names: [`.env.example`](./.env.example).

Set production values in Vercel → **Settings → Environment Variables** (Production).

Minimum required for a healthy production site:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL=https://unit311central.com`
- `AUTH_SECRET` (required in production for session signing; never use the anon key)
- `INTEGRATION_CREDENTIALS_SECRET` (required in production when storing Integration Framework credentials; never reuse `AUTH_SECRET`. Optional `INTEGRATION_CREDENTIALS_KEY_ID` defaults to `v1` for rotation)

Commonly required for full product:

- `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ACCESS_TOKEN` (ops / migrations)
- `INTERNAL_FILES_SETUP_SECRET`
- `CRON_SECRET`
- Zoho mail credentials
- Wise API + SCA key
- WhatsApp notify keys

Never commit decrypted env dumps or PEM private keys.

## Database migrations

Canonical SQL lives in `supabase/migrations/`.

Ways to apply:

1. Supabase SQL editor / Management API (preferred for production).
2. Guarded App Router helpers under `/api/internal/apply-*` (require `INTERNAL_FILES_SETUP_SECRET`).
3. Named scripts in `package.json` (`db:*`) for specific migrations.

### Production schema baseline (post-recovery, 2026-07-19)

Production database **Unit311 Central** (`kkxtvzxqmbacjatkiupq`) includes recovery migrations:

**067, 068, 085, 087, 088, 089, 090**

| Version | File | Applied how |
| --- | --- | --- |
| 067 | `067_treasury_settings.sql` | Direct apply during recovery |
| 068 | `068_founder_session_booking_role.sql` | Direct apply during recovery |
| 085 | `085_executive_call_webrtc_signals.sql` | Direct apply during recovery |
| 087 | `087_crm_projects_workspace_isolation.sql` | Direct apply during recovery |
| 088 | `088_financials_files_workspace_isolation.sql` | Direct apply during recovery |
| 089 | `089_messaging_email_support_workspace_isolation.sql` | Direct apply during recovery |
| 090 | `090_accounts_workspace_code_unique.sql` | Direct apply to production during recovery (2026-07-19) |

Migration **090** replaces global `UNIQUE(accounts.code)` with `UNIQUE(workspace_id, code)` so each workspace can seed the standard Chart of Accounts.

Allowlist: `/api/internal/apply-unit311central-pending-migrations` includes these paths through **097**.

### Required pre-deploy migrations (Company Details + Integration Framework)

| Version | File | Purpose |
| --- | --- | --- |
| 091 | `091_hr_employee_foundation.sql` | HR employee foundation (allowlist predecessor) |
| **092** | **`092_company_details.sql`** | **Required** — creates `company_details` (one row per workspace) |
| **093** | **`093_integration_framework_phase0.sql`** | **Required** — Integration Framework Phase 0 tables + seed providers |
| **094** | **`094_client_lifecycle_status.sql`** | Client Directory lifecycle status remap (FDR-MOD-011) |
| **095** | **`095_platform_users_client_id.sql`** | External Users `client_id` FK → Client Directory (FDR-MOD-161) |
| **096** | **`096_client_files_root_integrity.sql`** | Client Files root FK + backfill (MOD-103) |
| **097** | **`097_demo_workspace.sql`** | Demo workspace (same build; curated content tenancy) |

**Release checklist — database**

1. Apply pending migrations via `/api/internal/apply-unit311central-pending-migrations` (or Supabase SQL / Management API) through **093**.
2. Confirm verification payload includes `company_details: true`.
3. Hit health probe: `GET /api/internal/company-details-health` → `{ ok: true, ready: true }`.
4. Hit health probe: `GET /api/internal/wave0-foundation-health` → `{ ok: true, ready: true }` (includes integration tables after 093).
5. Confirm Vercel Production has `INTEGRATION_CREDENTIALS_SECRET` (never `AUTH_SECRET`) before storing integration credentials.
6. Only then merge/promote the app revision that depends on these schemas.

The app **must not** create these tables at runtime. If 092/093 are missing, related APIs/health return **503** with a clear migration error.

Full process notes: [docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md).  
Release summary: [docs/RELEASE_NOTES_RECOVERY_2026-07.md](./docs/RELEASE_NOTES_RECOVERY_2026-07.md).

After migrations that affect workspace foundations, confirm:

- Internal workspace `slug = unit311` exists
- `provision_workspace()` is present (migration `079_…`)
- Phase 1 `workspace_id` columns remain intact
- `accounts` has `UNIQUE(workspace_id, code)` (migration `090_…`)
- `company_details` table exists (migration `092_…`)
- `integration_providers` + `workspace_integration_connections` exist (migration `093_…`)

See [docs/WORKSPACE_ARCHITECTURE.md](./docs/WORKSPACE_ARCHITECTURE.md).

## Cron jobs

Defined in `vercel.json`:

| Path | Schedule |
| --- | --- |
| `/api/cron/founder-session-reminders` | `0 7 * * *` |
| `/api/cron/crm-client-report-followups` | `0 8 * * *` |
| `/api/cron/wise-payment-reconcile` | `0 9 * * *` |

Protect with `CRON_SECRET` (or setup secret where implemented).

## Smoke tests after deploy

1. https://unit311central.com — marketing home
2. https://unit311central.com/login — login page
3. https://internal.unit311central.com — Internal app (browser `/`; rewrite to `/internaldashboard`)
4. https://unit311central.com/internaldashboard — **308** to https://internal.unit311central.com/
5. https://internal.unit311central.com/internaldashboard — **308** to https://internal.unit311central.com/
6. https://acme.unit311central.com — Workspace unavailable (after wildcard DNS)
7. Create a `workspaces` row with `slug=acme` — onboarding placeholder appears
8. `GET https://unit311central.com/api/internal/company-details-health` — must return `{ ok: true, ready: true }` (fails **503** if migration **092** is not applied)

## Rollback

- Vercel → Deployments → Promote a previous production deployment
- Database: prefer additive forward fixes; avoid destructive resets on production

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [README.md](./README.md)
- [docs/WORKSPACE_ARCHITECTURE.md](./docs/WORKSPACE_ARCHITECTURE.md)
- [docs/VERCEL_ARCHITECTURE.md](./docs/VERCEL_ARCHITECTURE.md) (host / middleware / domains; regenerate diagram with `npm run diagram:vercel-architecture`)

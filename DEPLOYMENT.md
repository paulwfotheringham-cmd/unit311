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

After migrations that affect workspace foundations, confirm:

- Internal workspace `slug = unit311` exists
- `provision_workspace()` is present (migration `079_…`)
- Phase 1 `workspace_id` columns remain intact

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
3. https://internal.unit311central.com — Internal app (`X-Matched-Path: /internaldashboard`)
4. https://unit311central.com/internaldashboard — redirects to Internal host
5. https://acme.unit311central.com — Workspace unavailable (after wildcard DNS)
6. Create a `workspaces` row with `slug=acme` — onboarding placeholder appears

## Rollback

- Vercel → Deployments → Promote a previous production deployment
- Database: prefer additive forward fixes; avoid destructive resets on production

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [README.md](./README.md)
- [docs/WORKSPACE_ARCHITECTURE.md](./docs/WORKSPACE_ARCHITECTURE.md)
- [docs/VERCEL_ARCHITECTURE.md](./docs/VERCEL_ARCHITECTURE.md) (host / middleware / domains; regenerate diagram with `npm run diagram:vercel-architecture`)

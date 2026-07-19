# Unit311 Central

Single-repo, multi-tenant SaaS platform for Unit311 Central (internal operations) and future customer workspaces.

This repository is the **single source of truth** for:

- the public marketing site
- the Internal Unit311 operations application
- shared APIs, integrations, and Supabase migrations
- future customer workspaces on `{slug}.unit311central.com`

Do **not** split this into multiple repositories for tenancy.

## Product URLs (production)

| Surface | URL |
| --- | --- |
| Public website | https://unit311central.com |
| Login (single entry) | https://unit311central.com/login |
| Internal workspace | https://internal.unit311central.com |
| Customer workspaces (future) | https://`{workspace-slug}`.unit311central.com |

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Storage) — project display name **Unit311 Central**
- Vercel (hosting, cron, domains)

## Repository map

```text
unit311/
├── src/
│   ├── app/                 # App Router: marketing, internal dashboard, APIs, workspace host gateway
│   ├── components/          # UI (ops UI currently under components/testflighthub/)
│   ├── lib/                 # Domain services, integrations, workspace helpers
│   ├── hooks/, types/
│   └── middleware.ts        # Host-based routing (apex / internal / customer slug)
├── supabase/migrations/     # Canonical SQL migration history
├── scripts/                 # Seed / provision / ops helpers (no secret dumps)
├── public/                  # Static assets
├── docs/                    # Deep technical docs (workspace architecture, diagrams)
├── mobile/                  # Optional Capacitor shell (legacy branding may remain)
├── ARCHITECTURE.md          # System overview
├── DEPLOYMENT.md            # Domains, Vercel, migrations
├── CONTRIBUTING.md          # Working agreements
└── .env.example             # Documented environment variables
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values locally only
npm run dev
```

Open http://localhost:3000

Localhost keeps path-based Internal routing (`/internaldashboard`). Host-based routing applies on production domains.

## Documentation

| Doc | Purpose |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Host model, tenancy, app layout |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel, domains, DNS, migrations |
| [docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md) | Canonical repo, Git-only prod, rollback |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to work in this repo |
| [docs/WORKSPACE_ARCHITECTURE.md](./docs/WORKSPACE_ARCHITECTURE.md) | Workspace / `workspace_id` technical specification |
| [docs/TECHNICAL_DEBT.md](./docs/TECHNICAL_DEBT.md) | Known debt and improvement backlog |

## Environment variables

See [`.env.example`](./.env.example) for the full matrix. Never commit `.env.local`, PEMs, or Vercel env dumps.

## Deploy

**Canonical GitHub:** https://github.com/Unit311central/unit311central

Production ships from committed Git revisions on that repository (Vercel Git integration).  
See [docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md).

```bash
node scripts/assert-canonical-unit311-repo.mjs
```

Do **not** run `npx vercel --prod` from other folders (especially `Desktop\onwardair`).

## License / ownership

Proprietary — NAKAMA TECHNOLOGY HOLDINGS LIMITED / Unit311 Central.

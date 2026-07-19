# Unit311 Central — GitHub Repository Architecture

This document is the reference architecture for the **Unit311 Central** GitHub repository. Generated diagrams under `public/architecture/` are produced from this file by code — do not hand-edit the SVG/PNG.

Regenerate:

```bash
npm run diagram:github-architecture
```

---

## Repository identity

| Field | Value |
| --- | --- |
| GitHub remote | `https://github.com/paulwfotheringham-cmd/unit311.git` |
| Default package name | `unit311` |
| Product | Unit311 Central (single-repo multi-tenant SaaS) |
| Default branch | `main` |
| Hosting project | Vercel `unit311central` |
| Production database | Supabase Unit311 Central (`kkxtvzxqmbacjatkiupq`) |
| Rule | One repository for Internal + all future customer workspaces |

---

## Repository structure

| Path | Role |
| --- | --- |
| `src/app/` | Next.js App Router (pages, layouts, API routes) |
| `src/components/` | React UI (marketing + Internal ops) |
| `src/lib/` | Domain services, integrations, host helpers |
| `src/hooks/`, `src/types/` | Shared hooks and TypeScript types |
| `src/middleware.ts` | Host-based routing (apex / internal / workspace) |
| `supabase/migrations/` | Canonical SQL migration history |
| `scripts/` | Ops, seed, provision, diagram generation |
| `public/` | Static assets served as-is |
| `docs/` | Deep technical specifications |
| `mobile/` | Optional Capacitor shell |
| `.github/workflows/` | CI (for example Android APK build) |
| Root docs | `README.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `CONTRIBUTING.md` |
| `.env.example` | Documented environment variable names |
| `vercel.json` | Cron schedules and Vercel project config |

---

## App Router

| Area | Location | Purpose |
| --- | --- | --- |
| Marketing site | `src/app/page.tsx`, `about`, `contact`, industries, legal, … | Public website on apex |
| Auth | `src/app/login`, `signup`, `resetpassword`, … | Shared login entry |
| Internal dashboard | `src/app/(survey-operations)/internaldashboard` | Unit311 Internal operations app |
| Workspace gateway | `src/app/ws/[slug]` | Customer subdomain host entry |
| HTTP APIs | `src/app/api/**` | Server routes for product + ops |
| Book / meet / payment | `src/app/book`, `meet`, `payment*`, … | Public product flows |
| Metadata | `src/app/layout.tsx`, `robots.ts`, `sitemap.ts` | Site shell and SEO |

---

## Components

| Area | Location | Purpose |
| --- | --- | --- |
| Marketing / home | `src/components/home`, `layout`, `sections` | Public site UI |
| Auth | `src/components/auth` | Login / signup UI |
| Internal modules | `src/components/testflighthub/` | Ops UI (legacy folder name) |
| Client platform | `src/components/client-platform` | Customer-facing platform pieces |
| Shared UI | `src/components/ui` | Primitives |
| Payments / onboarding | `src/components/payment`, `onboarding`, … | Checkout and onboarding flows |

---

## lib

| Concern | Location |
| --- | --- |
| Host / domains | `src/lib/app-domains.ts`, workspace host helpers |
| Supabase clients | `src/lib/supabase/**` |
| CRM / financials / HR / messaging | Matching `*-service.ts` / `*-data.ts` modules |
| Integrations | Zoho mail, Wise, WhatsApp, AI Gateway helpers |
| Diagram generators | `*-architecture-diagram.ts` (parse markdown → SVG) |
| Auth / platform users | Platform signup, password, session helpers |

---

## Supabase

| Item | Detail |
| --- | --- |
| Migrations path | `supabase/migrations/` |
| Naming | `NNN_description.sql` sequential files |
| Client code | `src/lib/supabase/**` + API routes |
| Tenancy model | Single project; `workspaces` + `workspace_id` |
| Spec | `docs/WORKSPACE_ARCHITECTURE.md` |
| Rule | Do not create a second production database for customers |

---

## Middleware

| Item | Detail |
| --- | --- |
| File | `src/middleware.ts` |
| Helpers | `src/lib/app-domains.ts` |
| Apex | Public marketing + `/login` |
| Internal host | Rewrite `/` → `/internaldashboard` |
| Workspace hosts | Rewrite `{slug}.*` → `/ws/[slug]` |
| Spec companion | `docs/VERCEL_ARCHITECTURE.md` |

---

## Public assets

| Path | Contents |
| --- | --- |
| `public/architecture/` | Generated architecture SVG/PNG (from docs via code) |
| `public/images/`, `people/`, `videos/` | Marketing and product media |
| `public/downloads/`, `screenshots/`, `mockups/` | Supporting static files |
| Note | Prefer generated diagrams over hand-edited binaries in `architecture/` |

---

## Documentation

| Document | Purpose |
| --- | --- |
| `README.md` | Repo overview and quick start |
| `ARCHITECTURE.md` | System overview |
| `DEPLOYMENT.md` | Vercel, domains, migrations, smoke tests |
| `CONTRIBUTING.md` | Branching, layout, hygiene rules |
| `docs/WORKSPACE_ARCHITECTURE.md` | Tenancy / `workspace_id` specification |
| `docs/VERCEL_ARCHITECTURE.md` | Deployment / host routing specification |
| `docs/GITHUB_ARCHITECTURE.md` | This file — repository architecture |
| `docs/TECHNICAL_DEBT.md` | Debt register |
| `docs/README.md` | Docs index |
| `AGENTS.md` / `CLAUDE.md` | Agent guidance for this Next.js tree |

---

## Migrations

| Practice | Detail |
| --- | --- |
| Location | `supabase/migrations/` |
| Style | Additive, preferably idempotent |
| Apply | Supabase Management API / SQL editor / guarded `/api/internal/apply-*` |
| Scripts | Named `db:*` entries in `package.json` + helpers under `scripts/` |
| Workspace impact | Update `docs/WORKSPACE_ARCHITECTURE.md` when relevant |

---

## Scripts

| Category | Examples |
| --- | --- |
| Diagram generation | `diagram:vercel-architecture`, `diagram:github-architecture`, workspace architecture seed |
| Database / seed | `db:setup-*`, `db:seed-*`, migration apply helpers |
| Provisioning | Vercel / Zoho / Supabase env helpers for Unit311 Central |
| Integrations | WhatsApp webhook registration, Wise keypair |
| Hygiene rule | Never commit `scripts/_*.mjs` secret-dump / inspect helpers |

---

## Internal modules

| Module area | Typical home |
| --- | --- |
| Unit311 Details | `Unit311DetailsWorkspace` + `unit311-details-*` |
| CRM / Discovery | Internal-only tables and CRM workspaces |
| Financials / Wise / expenses | Financial services + Internal views |
| Messaging / email | Internal messaging + Zoho mail workspaces |
| HR / careers / training | HR and QMS-related Internal views |
| Files / board packs / EA | File repository and executive assistant |
| Host note | Served on `internal.unit311central.com` |

---

## Customer modules

| Module area | Typical home |
| --- | --- |
| Workspace gateway | `src/app/ws/[slug]` |
| Client platform UI | `src/components/client-platform` |
| Onboarding / questions | `src/app/questions`, onboarding components |
| Provisioning | `provision_workspace()` (database) + future signup flow |
| Status | Host routing + placeholders ready; full customer product UI future |

---

## Build process

| Step | Command / artefact |
| --- | --- |
| Install | `npm install` |
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Production build | `npm run build` |
| Start | `npm run start` |
| Framework | Next.js App Router + TypeScript + Tailwind CSS v4 |
| Config | `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` |

---

## Vercel deployment

| Item | Detail |
| --- | --- |
| Project | `unit311central` |
| Deploy | Git integration from `Unit311central/unit311central` `main` (CLI `--prod` disabled in scripts) |
| Env | Vercel Environment Variables (names in `.env.example`) |
| Domains | Apex, `internal.*`, wildcard `*.unit311central.com` |
| Spec | `DEPLOYMENT.md`, `docs/VERCEL_ARCHITECTURE.md` |

---

## Branch strategy

| Practice | Detail |
| --- | --- |
| Default branch | `main` |
| Feature work | Branch from `main`; open small focused PRs |
| Production | Prefer merging to `main` then Vercel production deploy |
| Migrations in PRs | Call out SQL files and any domain follow-up |
| Avoid | Force-push to `main`; committing secrets; silent rewrite of applied migrations |

---

## Environment variables

| Practice | Detail |
| --- | --- |
| Documented names | `.env.example` (committed) |
| Local values | `.env.local` (gitignored) |
| Production values | Vercel project env |
| Forbidden in git | `.env*`, PEMs, `wise-keys/`, env dumps, `*.tmp` deploy payloads |
| Enforcement | `.gitignore` hygiene rules |

---

## Repository hygiene

| Rule | Detail |
| --- | --- |
| Secrets | Never commit decrypted env, tokens, or private keys |
| Scope | Change only what the task requires |
| Docs | Update architecture docs when structure or tenancy changes |
| Diagrams | Regenerate with npm diagram scripts after source MD changes |
| Obsolete dumps | Do not reintroduce `_inspect-*` / secret-copy scripts |
| Debt | Record long-lived debt in `docs/TECHNICAL_DEBT.md` |

---

## Diagram artifacts

| Artifact | Path |
| --- | --- |
| Source specification | `docs/GITHUB_ARCHITECTURE.md` |
| Generator | `src/lib/github-architecture-diagram.ts` |
| SVG (served) | `public/architecture/github-architecture.svg` |
| PNG (served) | `public/architecture/github-architecture.png` |
| npm script | `diagram:github-architecture` |
| UI entry | Unit311 Details → Github → View Architecture Diagram |

---

## Current status

| Item | Status |
| --- | --- |
| Single GitHub repo `unit311` | Canonical |
| Default branch `main` | Production line |
| App Router + middleware | Active |
| Internal modules under testflighthub | Active |
| Customer workspace host gateway | Active (placeholders) |
| Migrations under `supabase/migrations/` | Active |
| Generated architecture diagrams | Active (regenerate from docs) |
| Full customer product modules | Future |

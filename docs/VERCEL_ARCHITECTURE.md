# Unit311 Central — Vercel Deployment Architecture

This document is the reference architecture for the **Unit311 Central** production deployment on Vercel. Generated diagrams under `public/architecture/` are produced from this file by code — do not hand-edit the SVG/PNG.

Regenerate:

```bash
npm run diagram:vercel-architecture
```

---

## Production deployment

| Field | Value |
| --- | --- |
| Vercel project | `unit311central` |
| Framework | Next.js (App Router) |
| Runtime | Vercel Edge Middleware + Node.js App Router |
| Production URL (apex) | `https://unit311central.com` |
| Production database | Supabase Unit311 Central (`kkxtvzxqmbacjatkiupq`) |
| Deploy command | `npx vercel --prod --yes` |
| Git integration | Optional deploy from `main` |

---

## Domains

| Domain | Role | Status |
| --- | --- | --- |
| `unit311central.com` | Public marketing website | Production |
| `www.unit311central.com` | Alias / redirect to apex | Production |
| `unit311central.com/login` | Shared login entry (apex path) | Production |
| `internal.unit311central.com` | Unit311 Internal operations app | Production |
| `*.unit311central.com` | Wildcard for customer workspace hosts | Required in Vercel + DNS |
| `{slug}.unit311central.com` | Future customer workspace host | Gateway ready; product UI later |

Reserved subdomains (never customer slugs): `www`, `internal`, `unit311`, `api`, `app`, `admin`, `mail`, `status`, `docs`, `cdn`, `assets`, `static`.

---

## DNS and SSL

| Item | Detail |
| --- | --- |
| Apex DNS | A / CNAME per Vercel Domains dashboard |
| `internal` DNS | CNAME → Vercel target |
| Wildcard DNS | `*.unit311central.com` CNAME → same Vercel target |
| SSL | Automatically issued by Vercel once DNS is Valid |
| Edge note | Until wildcard DNS + SSL are Valid, customer subdomains fail at the edge even if middleware is ready |

---

## Host detection

Implemented in `src/middleware.ts` and `src/lib/app-domains.ts`.

| Input | Source |
| --- | --- |
| Preferred host header | `x-forwarded-host` (Vercel custom domains) |
| Fallback | `Host` |
| Normalization | Lowercase, strip port |
| Public hosts | `unit311central.com`, `www.unit311central.com` |
| Internal hosts | `internal.unit311central.com`, `internal.localhost` |
| Workspace host | `{slug}.unit311central.com` when slug is not reserved |
| Cookie domain | `.unit311central.com` so apex login can share session with Internal / future workspaces |

---

## Middleware request flow

| Host | Path behaviour |
| --- | --- |
| Apex / www | Serve public marketing; redirect legacy Internal paths to `internal.*` |
| Apex `/login` | Public login page |
| Apex `/internaldashboard*` | Redirect → `internal.unit311central.com` |
| `internal.*` `/` | Rewrite → `/internaldashboard` |
| `internal.*` marketing paths | Redirect → apex |
| `internal.*` `/login` | Redirect → apex `/login` |
| `{slug}.*` | Rewrite → `/ws/[slug]` (workspace gateway) |
| `{slug}.*` `/login` | Redirect → apex `/login` |
| `unit311.unit311central.com` | Redirect → `internal.unit311central.com` |

Request flags set by middleware: `x-unit311-central`, `x-unit311-internal`, `x-unit311-workspace-slug`.

---

## Application surfaces

| Surface | Host / path | Implementation |
| --- | --- | --- |
| Public website | `unit311central.com` | Marketing App Router pages |
| Login | `unit311central.com/login` | Shared auth entry for all hosts |
| Internal application | `internal.unit311central.com` | `/internaldashboard` UI (components under `src/components/testflighthub/`) |
| Workspace routing | `{slug}.unit311central.com` → `/ws/[slug]` | Middleware rewrite + gateway page |
| Placeholder — missing | Unknown slug | Branded “Workspace unavailable” |
| Placeholder — existing | Known `workspaces` row | Onboarding / status placeholder (no customer product UI yet) |

---

## Customer workspace flow

| Step | Behaviour |
| --- | --- |
| 1. DNS / SSL | Wildcard `*.unit311central.com` resolves to Vercel with Valid SSL |
| 2. Browser request | User opens `https://{slug}.unit311central.com` |
| 3. Host detection | Middleware parses subdomain; reserved slugs rejected |
| 4. Rewrite | Path rewritten to `/ws/[slug]` |
| 5. Lookup | Gateway loads `public.workspaces` by `slug` |
| 6a. Missing | Show unavailable placeholder + return to apex |
| 6b. Present | Show onboarding placeholder with status (Preparing / Onboarding / Pending Activation / Active) |
| 7. Login | Always `https://unit311central.com/login` (not on workspace host) |
| Future | Customer product UI + tenancy-aware queries after provisioning |

---

## Redirects summary

| From | To |
| --- | --- |
| `unit311central.com/internaldashboard` | `internal.unit311central.com/…` |
| `internal.unit311central.com/login` | `unit311central.com/login` |
| `{slug}.unit311central.com/login` | `unit311central.com/login` |
| `unit311.unit311central.com` | `internal.unit311central.com` |
| `internal.*` public marketing paths | `unit311central.com` same path |

---

## Future customer workspaces

| Item | Plan |
| --- | --- |
| Hosting | Same Vercel project; no separate deployment per customer |
| Domain pattern | `{workspace-slug}.unit311central.com` via wildcard |
| Tenancy | Single Supabase project; `workspace_id` isolation |
| Provisioning | `provision_workspace()` then activate workspace host UI |
| Auth | Shared apex login + cookie on `.unit311central.com` |
| Not yet | Full customer application shell, RLS, signup → payment → provision |

---

## Diagram artifacts

| Artifact | Path |
| --- | --- |
| Source specification | `docs/VERCEL_ARCHITECTURE.md` |
| Generator | `src/lib/vercel-architecture-diagram.ts` |
| SVG (served) | `public/architecture/vercel-architecture.svg` |
| PNG (served) | `public/architecture/vercel-architecture.png` |
| npm script | `diagram:vercel-architecture` |
| UI entry | Unit311 Details → Vercel → View Architecture Diagram |

---

## Current status

| Item | Status |
| --- | --- |
| Vercel project `unit311central` | Production |
| Apex + login | Live |
| Internal host rewrite | Live |
| Middleware host detection | Live |
| Workspace host rewrite `/ws/[slug]` | Live |
| Placeholder pages | Live |
| Wildcard domain + DNS | Required for customer hosts at edge |
| Full customer workspace product UI | Future |

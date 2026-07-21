# MOD-900 — Platform Performance & Responsive UX

**Commit theme:** Platform-wide optimisation without changing workflows or visual design language.  
**Date:** 2026-07-21  
**Repo:** `unit311central`

---

## Summary

Largest wins landed in this sprint:

1. **Code-split internal operations workspaces** — ~72 modules load via `next/dynamic` (`lazy-workspaces.tsx`) so Home no longer parses Financials / Excalidraw / Leaflet / etc. on first paint.
2. **Command Centre progressive loading** — Wave 1 (action items, clients, projects, tickets, calendar, whoami) then Wave 2 on idle (HR, external users, financials, CRM, files, health).
3. **Query projection** — Clients / Projects / Support list APIs select required columns instead of `SELECT *`.
4. **List indexes** — Migration `100_mod900_list_query_indexes.sql`.
5. **Responsive shell** — Sidebar drawer through tablet (`lg` permanent); 44px touch targets below `lg`; mobile skips heavy BCN background + backdrop blur.
6. **Next image/font/package imports** — AVIF/WebP, device sizes through 4K, `optimizePackageImports` for lucide/recharts/date-fns, font `adjustFontFallback`.

---

## Before vs After (engineering estimate)

| Area | Before | After |
| --- | --- | --- |
| Ops dashboard JS parse | All workspaces in initial client graph | Shell + Home eager; others on demand |
| Home data | Parallel full lists (or blocking) | Progressive waves + per-tile loading flags |
| List payloads | `SELECT *` | Column projection for clients/projects/tickets |
| Tablet nav | Permanent from `md` | Collapsible drawer until `lg` |
| Mobile GPU | Full-bleed JPG + `backdrop-blur-xl` | Solid bg on phone; blur reduced |
| Icon/chart imports | Broad package entry | Optimized package imports |

> Formal Lighthouse numbers should be captured on production after deploy (lab + field). Targets remain: Perf 90+, Best Practices 95+, A11y 90+, module switch &lt;300ms when cached.

---

## Largest improvements

| Rank | Change | Impact |
| --- | --- | --- |
| 1 | Dynamic workspace imports | Cuts initial ops bundle dramatically |
| 2 | Idle-deferred Command Centre wave 2 | Faster Home first meaningful paint |
| 3 | Column projection + indexes | Less DB I/O / JSON transfer |
| 4 | Tablet drawer + touch targets | MOD-900 responsive compliance |
| 5 | Mobile blur / background skip | Smoother scrolling on phones |

---

## Remaining bottlenecks

- Marketing assets still include large hero/media files when present in `public/images` (compress/WebP offline).
- HR / CRM / files list endpoints still return full row sets (paginate next).
- Several workspaces still mount heavy charts without virtualisation.
- `BCN.jpg` (~580KB) still loads on tablet/desktop shell — candidate for WebP/`image-set`.
- Excalidraw / geotiff / leaflet remain heavy when those modules open (expected).

---

## Largest bundles (expected after split)

| Chunk family | Notes |
| --- | --- |
| Ops shell + Home / Command Centre | Eager path |
| Whiteboard (Excalidraw) | Lazy |
| Telemetry / maps (Leaflet) | Lazy |
| Financials / recharts workspaces | Lazy |
| Individual domain workspaces | Lazy per navigation |

Run `@next/bundle-analyzer` locally for exact KB (recommended follow-up).

---

## Slowest modules (when opened)

1. Whiteboard (Excalidraw)  
2. Telemetry / weather maps  
3. Financials with multi-chart Recharts  
4. File repository deep trees  
5. CRM with large lead lists  

---

## Largest queries (still to tighten)

| Query | Status |
| --- | --- |
| `listInternalClients` | Columns projected + index |
| `listProjects` | Columns projected + index |
| `listSupportTickets` | Columns projected + index |
| `listHrEmployees` | Still `SELECT *` — backlog |
| `browseFolder` / file lists | Still broad — backlog |
| CRM leads list | Full list — backlog |

---

## Unused / deferred components

- Legacy customizable home layout (`internal-dashboard-home-layout`) superseded by Command Centre preferences — keep until confirmed unused, then delete.
- Static mock seed on Home removed; assets/reps seed only when those views open.

---

## Recommendations (next sprint)

1. Add `/api/*/summary` count endpoints for Command Centre KPIs.  
2. Paginate HR, CRM, files (`limit`/`cursor`).  
3. Compress marketing media; serve `srcset`/AVIF.  
4. Virtualise tables &gt;100 rows (`@tanstack/react-virtual`).  
5. Wire `@next/bundle-analyzer` CI budget.  
6. Apply migration `100` via pending-migrations once setup secret available.  
7. Field Lighthouse on `internal.unit311central.com` post-deploy and attach scores to this doc.

---

## Files touched (primary)

- `src/components/testflighthub/lazy-workspaces.tsx`
- `src/components/testflighthub/InternalOperationsDashboard.tsx`
- `src/components/testflighthub/CommandCentreDataProvider.tsx`
- `src/components/testflighthub/SurveyOperationsSidebar.tsx`
- `src/components/testflighthub/SurveyOperationsShell.tsx`
- `src/components/testflighthub/InternalDashboardHome.tsx`
- `src/lib/internal-clients-service.ts`
- `src/lib/internal-projects-service.ts`
- `src/lib/support-tickets-service.ts`
- `next.config.ts`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `supabase/migrations/100_mod900_list_query_indexes.sql`

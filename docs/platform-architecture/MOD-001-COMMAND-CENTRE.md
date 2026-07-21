# MOD-001 — Executive Dashboard (Command Centre v2)

| Field | Value |
| --- | --- |
| **Wave ID** | MOD-001 |
| **Module** | MOD-001 Dashboard |
| **Domain** | DOM-01 Home |
| **Status** | **READY** |
| **Completion date** | 2026-07-21 |
| **Feature SHA** | `daf2a72` on `main` (Command Centre v2 UI) |
| **Closeout SHA** | `5115e41` on `main` |
| **Production deployment** | `dpl_EFxs4QKQojjLBib3s1sgUWJT5WX8` |
| **Purpose** | Configurable executive command centre — primary Unit311 Central home workspace |

---

## Delivered

- Dense 1440p-first executive layout (v3) with little/no scrolling
- **Business Snapshot KPI ribbon** across the top (Clients, Revenue, Burn Rate, Cash, Projects, Employees, Support, Contracts, Pipeline)
- Compact **Action Required** (max 5 + View All slide-over)
- **Business Health** operational issues card
- Compact agenda, Recent Activity, My Work, Quick Actions
- Per-user customisable layout: add, remove, hide, reorder, resize, collapse, reset, KPI ribbon toggle
- Content-height cards on a 12-column grid; independent async data loading
- Live data where APIs exist; honest empty states otherwise

## Persistence

`localStorage` key `unit311-command-centre-v3:{username}` — layout, sizes, collapsed state, hidden types, `showKpiRibbon`.

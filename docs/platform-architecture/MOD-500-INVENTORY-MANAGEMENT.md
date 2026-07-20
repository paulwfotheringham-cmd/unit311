# MOD-500 — Inventory Management

| Field | Value |
| --- | --- |
| **Wave ID** | MOD-500 |
| **Module** | MOD-091 Inventory Management |
| **Domain** | DOM-11 Assets |
| **Status** | **READY** |
| **Completion date** | 2026-07-21 |
| **Production deployment SHA** | `2003e8e` on `main` |
| **Production deployment** | `dpl_5iaHA5eVqavPScZN2Zu78QYWWpqp` |
| **Benchmark** | Commercial enterprise asset management (ops control centre) |
| **Purpose** | Day-to-day operational management of company assets — distinct from the Asset Register |

---

## Separation of concerns

| Surface | Role |
| --- | --- |
| **MOD-090 Assets** (Asset Register) | Master data / configuration register — **unchanged** by this wave |
| **MOD-091 Inventory Management** | Operational EAM workspace (assignment, maintenance, documents, history) |

---

## Delivered UX

- Top KPI dashboard: Total, Operational, Maintenance, Out of Service, Assigned, Unassigned, Due for Service, Expiring Certifications
- Filter bar: Search, Category, Location, Status, Assigned To, Department, Manufacturer, Model
- Main grid with operational columns + row actions
- Right-hand slide-over: Overview · Assignment · Maintenance · Documents · History · Notes
- Top actions: Add, Import, Assign, Transfer, Retire, Generate Inventory Report
- CRUD: Create, Open, Edit, Duplicate, Archive, Delete (+ Retire)

## Implementation notes

- Mock-store CRUD (demo-ready; API-shaped) — does not modify `AssetManagementWorkspace` / asset register data
- Nav “uses current implementation” banner removed for Inventory Management
- DOM-11 shared-implementation warning removed
- Module Go-Live default: **MOD-091 = Ready** (MOD-090 remains Not Started)

## Architecture links

- [Platform Module Register](./PLATFORM_MODULE_REGISTER.md)
- [FDR-DOMAIN-GO-LIVE](./FDR-DOMAIN-GO-LIVE.md) — DOM-11
- [Internal Navigation Blueprint](./INTERNAL_NAVIGATION_BLUEPRINT.md)

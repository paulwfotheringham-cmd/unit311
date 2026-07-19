# MOD-071 Phase 1 — Implementation Plans

| Field | Value |
| --- | --- |
| **Module** | MOD-071 Employees |
| **Canonical spec** | [FDR-MOD-071-EMPLOYEES.md](../FDR-MOD-071-EMPLOYEES.md) (**APPROVED**) |
| **Phase** | **Phase 1 – Employee Foundation** |
| **Status** | **APPROVED** — implementation authorised |
| **Approved** | 2026-07-19 |
| **Date** | 2026-07-19 |

## Documents

| # | Document | Purpose |
| --- | --- | --- |
| 1 | [01-DATABASE-MIGRATION-PLAN.md](./01-DATABASE-MIGRATION-PLAN.md) | Schema changes, backfill, soft archive |
| 2 | [02-API-IMPACT-ASSESSMENT.md](./02-API-IMPACT-ASSESSMENT.md) | Route/service contract changes |
| 3 | [03-UI-IMPLEMENTATION-PLAN.md](./03-UI-IMPLEMENTATION-PLAN.md) | Tabbed Employee record UX |
| 4 | [04-INTEGRATION-IMPACT-ASSESSMENT.md](./04-INTEGRATION-IMPACT-ASSESSMENT.md) | Consumers + ownership boundaries |

## Approved decisions (canonical)

1. **Pay frequency** — backfill `Annual`; profile stores annual equivalent.  
2. **Documents** — real uploads in Phase 1 (type, file, uploaded by/date, optional expiry, notes). No versioning/approval.  
3. **Default status** — existing rows → `Active`. Recruitment owns Candidate / Offer Accepted later.  
4. **DELETE** — always `405 Method Not Allowed`; archive instead.  
5. **Salary PATCH shim** — `salaryCurrent` creates compensation history; current = latest active.  
6. **Active Headcount** — include Active, Probation, Notice Given, Leave of Absence; exclude Candidate, Offer Accepted, Former Employee, Archived.  
7. **Board pack** — payroll totals exclude Former + Archived.  
8. **Reports tab** — visible placeholder only.  
9. **Employee Number** — permanent `EMP-0001`… human-readable; UUID/`hr-…` remains internal PK; never change/reuse.

## Phase 1 scope

**In scope:** tabbed Employee record; lifecycle/status; compensation profile + history; notes; timeline; offboarding metadata; document library with uploads; soft archive; Former searchable; Employee Number.

**Out of scope:** payroll engine, leave/performance/recruitment/training/QMS workflows.

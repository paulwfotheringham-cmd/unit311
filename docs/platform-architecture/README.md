# Platform Architecture — Reference Models

This folder holds **approved Platform Reference Models (PRM)** and the **module implementation tracker** for Unit311 Central.

## Baseline (frozen)

| Artifact | Status |
| --- | --- |
| [PRM-001 – Client](./PRM-001-CLIENT.md) | **LOCKED** |
| [PRM-002 – Workspace](./PRM-002-WORKSPACE.md) | **LOCKED** |
| [PRM-003 – Platform Integrations](./PRM-003-PLATFORM-INTEGRATIONS.md) | **APPROVED** |
| [Internal Navigation Blueprint](./INTERNAL_NAVIGATION_BLUEPRINT.md) | **APPROVED / IMPLEMENTED** |
| Navigation implementation | **COMPLETE / FROZEN** |
| [Platform Module Register](./PLATFORM_MODULE_REGISTER.md) | **ACTIVE** — master tracker |
| [Integration Dependency Matrix](./INTEGRATION_DEPENDENCY_MATRIX.md) | **APPROVED** |
| [Module Go-Live Structure Review](./MODULE_GO_LIVE_STRUCTURE_REVIEW.md) | **APPROVED** |
| [PAS-001 – Platform Architecture Standards](./PAS-001-PLATFORM-ARCHITECTURE-STANDARDS.md) | **DRAFT** |

**Navigation is frozen.** Do not make further structural sidebar changes unless explicitly approved in a future architecture review. All subsequent work is **module-centric** (FDR → approve → implement → verify → close).

## Rules

1. Every module Functional Design Review must conform to locked PRMs.
2. If a later module conflicts with a locked PRM, the conflict must be **identified explicitly** — never silently accepted.
3. Do not implement changes that violate a locked PRM.
4. Client Directory / **PRM-001** is the reference architecture for customer identity.
5. Workspace / **PRM-002** is the reference architecture for operational runtime; modules must distinguish Client Identity from Workspace Runtime (§9).
6. Platform Integrations / **PRM-003** (**APPROVED**; lock when settled) is the reference architecture for all third-party connectivity; modules must not invent private connection/credential models.
7. Do **not** redesign navigation while reviewing modules.

## Index

| ID | Title | Status | Approved |
| --- | --- | --- | --- |
| [PRM-001](./PRM-001-CLIENT.md) | Platform Reference Model 001 – Client | **LOCKED** | 2026-07-19 |
| [PRM-002](./PRM-002-WORKSPACE.md) | Platform Reference Model 002 – Workspace | **LOCKED** | 2026-07-19 |
| [PRM-003](./PRM-003-PLATFORM-INTEGRATIONS.md) | Platform Reference Model 003 – Platform Integrations | **APPROVED** | 2026-07-19 |
| [PAS-001](./PAS-001-PLATFORM-ARCHITECTURE-STANDARDS.md) | Platform Architecture Standards | **DRAFT** | — |
| [INTEGRATION_DEPENDENCY_MATRIX.md](./INTEGRATION_DEPENDENCY_MATRIX.md) | Integration Dependency Matrix (PRM-003) | **APPROVED** | 2026-07-19 |
| [MODULE_GO_LIVE_STRUCTURE_REVIEW.md](./MODULE_GO_LIVE_STRUCTURE_REVIEW.md) | Module Go-Live structure review (capabilities) | **APPROVED** | 2026-07-19 |
| [INTERNAL_NAVIGATION_BLUEPRINT.md](./INTERNAL_NAVIGATION_BLUEPRINT.md) | Internal Operations Navigation Blueprint | **APPROVED / FROZEN** | 2026-07-19 |
| [NAVIGATION_IMPLEMENTATION_CHECKLIST.md](./NAVIGATION_IMPLEMENTATION_CHECKLIST.md) | Nav-only implementation checklist | **IMPLEMENTED** | 2026-07-19 |
| [NAVIGATION_BEFORE_AFTER.md](./NAVIGATION_BEFORE_AFTER.md) | Before/after navigation comparison | — | 2026-07-19 |
| [PLATFORM_MODULE_REGISTER.md](./PLATFORM_MODULE_REGISTER.md) | Platform Module Register | **ACTIVE** | 2026-07-19 |
| [FDR-MOD-071-EMPLOYEES.md](./FDR-MOD-071-EMPLOYEES.md) | FDR — Employees (master Employee record) | **APPROVED** · Go-Live **Ready** (demo / MOD-200) | 2026-07-19 |
| [MOD-200-HR-DOMAIN.md](./MOD-200-HR-DOMAIN.md) | MOD-200 — Human Resources domain (demo Ready) | **READY** | 2026-07-21 |
| [HR-201-EMPLOYEE-360-DATA-INTEGRATION.md](./HR-201-EMPLOYEE-360-DATA-INTEGRATION.md) | HR-201 — Employee 360 live data integration | **Backlog** (enhancement) | 2026-07-21 |
| [FDR-MOD-092-LOGISTICS.md](./FDR-MOD-092-LOGISTICS.md) | FDR — Logistics (Shipping Providers) | **APPROVED** · Architecture **COMPLETE / FROZEN** · Go-Live **READY** | 2026-07-19 |
| [MOD-092-PRE-IMPLEMENTATION-REVIEWS.md](./MOD-092-PRE-IMPLEMENTATION-REVIEWS.md) | MOD-092 Pre-Implementation Reviews | **APPROVED** — authoritative | 2026-07-19 |
| [MOD-092-IMPLEMENTATION-READINESS.md](./MOD-092-IMPLEMENTATION-READINESS.md) | MOD-092 Implementation Readiness | **APPROVED** | 2026-07-19 |
| [MOD-092-PHASE1-SETUP-WIZARD-FREEZE.md](./MOD-092-PHASE1-SETUP-WIZARD-FREEZE.md) | Phase 1 Setup Wizard — approved & UI frozen | **FROZEN** | 2026-07-19 |
| [MOD-092-PHASE1-ENTRY-FLOW-FREEZE.md](./MOD-092-PHASE1-ENTRY-FLOW-FREEZE.md) | Phase 1 Logistics entry flow — approved & frozen | **FROZEN** | 2026-07-19 |
| [mod-071-phase1/README.md](./mod-071-phase1/README.md) | MOD-071 Phase 1 implementation plans | **APPROVED** | 2026-07-19 |
| [INTERNAL_OPERATIONS_IA.md](./INTERNAL_OPERATIONS_IA.md) | Internal Operations IA (earlier draft) | **SUPERSEDED** | — |

## Review sequence

1. ~~Lock business objects as PRMs~~ — done (PRM-001, PRM-002).
2. ~~Approve and implement internal navigation~~ — done; **frozen**.
3. **PRM-003 Platform Integrations** — **APPROVED** (lock when settled). See [Integration Dependency Matrix](./INTEGRATION_DEPENDENCY_MATRIX.md).
4. Module-by-module: FDR → PRM check (incl. PRM-003 where integrations apply) → approve → implement → verify → close (see Module Register).
5. Only after module architecture is approved for that module: implement that module alone.

**Note:** PRM-002 separates architecture (Workspace → Client required) from current operating policy (one primary Workspace per Client). Multi-workspace requires a future explicit PRM.

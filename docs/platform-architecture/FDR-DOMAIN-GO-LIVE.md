# Functional Design Review — Domain Go-Live Tracker

| Field | Value |
| --- | --- |
| **ID** | FDR-DOMAIN-GO-LIVE |
| **Title** | Domain Go-Live register (rollup of Module Go-Live) |
| **Status** | **APPROVED / IMPLEMENTED** |
| **Wave** | Internal Operations v1.0 — Wave 0 |
| **Related** | Module Go-Live · Internal Operations v1.0 Delivery Plan (approved) |
| **Navigation impact** | None — UI lives inside existing Module Go-Live workspace only |
| **Date** | 2026-07-20 |
| **Amendment** | Incorporates APPROVE WITH CHANGES (derived statuses, Module Go-Live SoT, authoritative 1:1 module→domain map, Blocked-only overrides) |

---

## Governing statement

Add a **Domain Go-Live** layer that tracks completion of frozen business domains as integrated systems, without changing navigation or inventing new product modules.

**Module Go-Live is the authoritative source of truth** for capability readiness (`Not Started` · `Needs Work` · `Ready`).

**Domain Go-Live is a roll-up only.** It must never become a competing source of truth for Ready / In Progress / Not Started.

---

## Scope (in)

1. Domain catalogue (18 frozen domains) with authoritative module membership
2. Derived domain statuses: `Not Started` · `In Progress` · `Ready`
3. Manual override only: `Blocked` (+ reason + notes)
4. Persistence of **overrides only** in Unit311 Details content store
5. UI section inside existing Module Go-Live workspace (domain board + expand to modules)
6. API GET/PATCH under `/api/domain-go-live` (same auth model as Module Go-Live)

## Scope (out)

- New sidebar / navigation items
- Manual setting of Ready / In Progress / Not Started on domains
- Automatic inference from code analysis
- Post-v1.0 out-of-nav modules (MOD-013, etc.) until a future catalogue amendment

---

## Status model

### Derived (always calculated from Module Go-Live children)

| Domain status | Rule |
| --- | --- |
| **Ready** | Every child module status is `Ready` **and** domain is not Blocked |
| **In Progress** | Not Ready, and at least one child is `Needs Work` or `Ready` |
| **Not Started** | Every child module status is `Not Started` |

### Manual only

| Field | Rule |
| --- | --- |
| **Blocked** | Operator-set override; domain display status becomes `Blocked` regardless of children |
| **blockedReason** | Required when Blocked |
| **notes** | Optional free text |

Clearing Blocked returns the domain to its **derived** status.

`PATCH` must **reject** any attempt to set Ready / In Progress / Not Started directly.

---

## Authoritative module → domain mapping

**Every Module Go-Live catalogue module belongs to exactly one domain.**

| Domain ID | Name | Child module IDs |
| --- | --- | --- |
| DOM-01 | Home | MOD-001 |
| DOM-02 | Executive Assistant | MOD-002 |
| DOM-03 | Clients | MOD-010, MOD-011 |
| DOM-04 | CRM | MOD-012, MOD-020, MOD-021, MOD-022 |
| DOM-05 | Partners | MOD-030 |
| DOM-06 | Projects | MOD-040, MOD-041, MOD-042 |
| DOM-07 | Grants | MOD-050 |
| DOM-08 | Financials | MOD-060, MOD-061, MOD-062, MOD-063, MOD-064, MOD-065, MOD-066 |
| DOM-09 | Human Resources | MOD-070, MOD-071, MOD-072, MOD-073, MOD-074 |
| DOM-10 | Corporate Information | MOD-080, MOD-081, MOD-082, MOD-083, MOD-084, MOD-085, MOD-086, MOD-087 |
| DOM-11 | Assets | MOD-090, MOD-091, MOD-092 |
| DOM-12 | Business Productivity | MOD-100, MOD-101, MOD-102, MOD-103, MOD-110, MOD-111, MOD-112, MOD-113, MOD-114 |
| DOM-13 | Training | MOD-120, MOD-121, MOD-122 |
| DOM-14 | QMS | MOD-130 |
| DOM-15 | Engineering | MOD-140, MOD-141 |
| DOM-16 | Tools | MOD-150, MOD-151, MOD-152, MOD-153 |
| DOM-17 | External Client Access | MOD-160, MOD-161 |
| DOM-18 | Settings | MOD-170, MOD-171, MOD-172 |

### Mapping notes

- **MOD-100 (File Explorer)** is a child of **DOM-12** (umbrella capability; Internal/External/Client Explorer remain MOD-101–103).
- No module appears in two domains.
- Platform Wave 0 work (e.g. Integration Framework skeleton) is **not** a domain; it is a prerequisite tracked outside this catalogue.

### Coverage check (implementation must enforce)

On load, assert every `MODULE_GO_LIVE_CATALOG` id appears in exactly one domain row; fail loud in dev / return warning in API if drift detected.

---

## Persistence

- Category id: `domain-go-live` (Unit311 Details content store)
- Store **overrides only**:

```json
{
  "version": 1,
  "updatedAt": "<iso>",
  "domains": [
    {
      "id": "DOM-08",
      "blocked": true,
      "blockedReason": "Waiting on Integration Framework Phase 0",
      "notes": "optional"
    }
  ]
}
```

- Domains with no override entry are fully derived.
- Merge with catalogue defaults like Module Go-Live (catalogue is code-defined; overrides are stored).

---

## API

Auth: **same as Module Go-Live** (`requireInternalWorkspaceSession`).

| Method | Behaviour |
| --- | --- |
| GET `/api/domain-go-live` | Returns each domain with `derivedStatus`, `blocked`, `blockedReason`, `notes`, `status` (Blocked if blocked else derived), `children[]` (module id + module status), `canReady` |
| PATCH `/api/domain-go-live` | Set/clear `blocked` + `blockedReason` + `notes` for a domain id only |

Workspace: host-resolved current workspace (same content-store scoping as Module Go-Live).

---

## UI

- Render **inside** existing Module Go-Live workspace only.
- Domain summary board (counts Ready / In Progress / Not Started / Blocked).
- Expand domain → child modules with Module Go-Live statuses (read-only links to module rows).
- Shared-implementation warning for Projects / Assets / Engineering until behavioural differentiation verified (informational only).
- **No new navigation.**

---

## Definition of Done

- Authoritative mapping implemented and coverage-checked against Module Go-Live catalogue
- Domain Ready / In Progress / Not Started always derived from modules
- Only Blocked (+ reason/notes) is writable
- Module Go-Live workspace shows domain board
- No nav changes
- Internal Operations v1.0 = 18/18 domains with display status `Ready` (none Blocked; all children Ready)

---

## Approval

Amended per APPROVE WITH CHANGES.  
Reply **CONFIRM FDR-DOMAIN-GO-LIVE** to authorise implementation.

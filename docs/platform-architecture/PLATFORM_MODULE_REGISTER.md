# Platform Module Register

| Field | Value |
| --- | --- |
| **Status** | **ACTIVE** — master implementation tracker |
| **Host** | `internal.unit311central.com` |
| **Navigation** | **FROZEN** — [Internal Navigation Blueprint](./INTERNAL_NAVIGATION_BLUEPRINT.md) (IMPLEMENTED) |
| **Baseline architecture** | PRM-001 · PRM-002 · PRM-003 (APPROVED) · Navigation Blueprint · Navigation Implementation · [Integration Dependency Matrix](./INTEGRATION_DEPENDENCY_MATRIX.md) (**APPROVED**) · [Module Go-Live Structure Review](./MODULE_GO_LIVE_STRUCTURE_REVIEW.md) (**APPROVED** — 68 modules; catalog not yet updated) |
| **Last updated** | 2026-07-19 |

---

## Governing rules

1. **Navigation is frozen.** Do not make structural sidebar changes unless explicitly approved in a future architecture review.
2. Work is **module-centric**. For each module: Review → FDR → PRM check → Recommend → Approve → Implement → Verify → **Close** before the next module.
3. Do **not** redesign navigation while reviewing modules.
4. Status values: `Not Started` · `In Review` · `Approved` · `Implementing` · `Implemented`
5. Conflicts with [PRM-001](./PRM-001-CLIENT.md) or [PRM-002](./PRM-002-WORKSPACE.md) must be called out explicitly in the module FDR.

---

## Baseline architecture (locked)

| Artifact | Status |
| --- | --- |
| [PRM-001 – Client](./PRM-001-CLIENT.md) | **LOCKED** |
| [PRM-002 – Workspace](./PRM-002-WORKSPACE.md) | **LOCKED** |
| [PRM-003 – Platform Integrations](./PRM-003-PLATFORM-INTEGRATIONS.md) | **APPROVED** |
| [Internal Navigation Blueprint](./INTERNAL_NAVIGATION_BLUEPRINT.md) | **APPROVED / IMPLEMENTED** |
| Navigation implementation | **COMPLETE** |
| [Integration Dependency Matrix](./INTEGRATION_DEPENDENCY_MATRIX.md) | **ACTIVE** |

---

## Status legend

| Status | Meaning |
| --- | --- |
| Not Started | No FDR yet |
| In Review | FDR in progress |
| Approved | FDR approved; waiting to implement |
| Implementing | Implementation authorised and in progress |
| Implemented | Verified and closed |

---

## Module register

Nav leaves that share one implementation until redesigned are noted. Each row is a trackable work item.

### HOME / EXECUTIVE

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Home Dashboard | HOME → Home Dashboard | Not Started | — | — | Ops home |
| Executive Assistant | EXECUTIVE → Executive Assistant | Not Started | PRM-001 (context) | Clients, Financials, Projects (read) | AI ops; consume Client context per PRM-001 |

### Business Central — Clients

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Clients Dashboard | Business Central → Clients → Dashboard | Not Started | PRM-001 | Client Directory | KPI surface over Clients |
| Client Directory | Business Central → Clients → Client Directory | Not Started | **PRM-001** | Workspace (PRM-002 link) | Canonical Client master — first priority candidate |

### Business Central — CRM

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| CRM Pipeline | Business Central → CRM → Pipeline | Not Started | PRM-001 | Client Directory (convert) | Stops at conversion per PRM-001 |
| Discovery & Demo Sessions | Business Central → CRM → Discovery & Demo Sessions | Not Started | PRM-001 | CRM, Calendar | Formerly Executive Strategy Sessions |
| Potential Clients | Business Central → CRM → Potential Clients | Not Started | — | — | Market sizing; not Client master |
| Client Onboarding | Business Central → CRM → Client Onboarding | Not Started | PRM-001 | Client Directory | Process under CRM; Directory remains SoT |

### Business Central — Partners / Projects / Grants

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Partners | Business Central → Partners | Not Started | — | — | Channel partners (view id `representatives`) |
| Projects Dashboard | Business Central → Projects → Dashboard | Not Started | PRM-001 | Client Directory | **Shares** Projects implementation today |
| Internal Projects | Business Central → Projects → Internal Projects | Not Started | PRM-001 | — | Same implementation; no fake Clients |
| External Projects | Business Central → Projects → External Projects | Not Started | PRM-001 | Client Directory | Same implementation; must use `client_id` when split |
| Grants | Business Central → Grants | Not Started | — | Financials (optional) | Unit311 funding |

### Business Central — Financials

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Financials Overview | Business Central → Financials → Overview | Not Started | PRM-001 | Clients | |
| General Ledger | Business Central → Financials → General Ledger | Not Started | PRM-002 | Workspace tenancy | |
| Accounts Receivable | Business Central → Financials → Accounts Receivable | Not Started | PRM-001 | Client Directory | AR keyed by Client |
| Accounts Payable | Business Central → Financials → Accounts Payable | Not Started | — | — | |
| Expenses | Business Central → Financials → Expenses | Not Started | — | — | |
| Wise | Business Central → Financials → Wise | Not Started | PRM-001, PRM-002 | AR, Client activation | Internal label; customer later = Bank |
| Financial Reports | Business Central → Financials → Reports | Not Started | PRM-001 | GL, AR, AP | |

### Business Central — Human Resources

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| HR Dashboard | Business Central → Human Resources → Dashboard | Not Started | — | Employees | |
| Employees | Business Central → Human Resources → Employees | **Implementing** | PRM-002 · **PRM-003** (optional IdP) | Internal Users (optional link) | [FDR-MOD-071](./FDR-MOD-071-EMPLOYEES.md) **APPROVED**. Phase 1 plans **APPROVED**. Go-Live **Needs Work**. |
| Leave | Business Central → Human Resources → Leave | Not Started | — | Employees | Coming Soon UI |
| Performance | Business Central → Human Resources → Performance | Not Started | — | Employees | Coming Soon UI |
| Recruitment | Business Central → Human Resources → Recruitment | Not Started | — | — | Coming Soon UI |

### Business Central — Corporate Information

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Corporate Dashboard | Business Central → Corporate Information → Dashboard | Not Started | — | Corporate children | Coming Soon UI |
| Company Details | Business Central → Corporate Information → Company Details | Not Started | PRM-002 §9 | — | Unit311 the company — not a Client |
| Office Locations | Business Central → Corporate Information → Office Locations | Not Started | — | — | Implemented UI |
| Bank Accounts | Business Central → Corporate Information → Bank Accounts | Not Started | — | — | Coming Soon UI |
| Professional Advisors | Business Central → Corporate Information → Professional Advisors | Not Started | — | — | Coming Soon UI |
| Software & Licences | Business Central → Corporate Information → Software & Licences | Not Started | — | — | Implemented UI |
| Contracts | Business Central → Corporate Information → Contracts | Not Started | — | — | Coming Soon UI |
| Unit311 Details | Business Central → Corporate Information → Unit311 Details → Overview | Not Started | PRM-002 §9 | Company Details | Nav moved; merge into Company Details is a module concern later |
| Module Go-Live | Business Central → Corporate Information → Unit311 Details → Module Go-Live | Implemented | — | — | Authoritative readiness register (ID / Module / Status). Persisted via Unit311 Details content store. Not a project tool. |

### Assets

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Assets | Assets → Assets | Not Started | PRM-001 (optional tag) | — | Asset registry |
| Inventory Management | Assets → Inventory Management | Not Started | — | Assets | **Shares** Assets implementation today |
| Logistics | Assets → Logistics | **Approved** | PRM-001 · PRM-002 · **PRM-003** | Shipping Providers | [FDR-MOD-092](./FDR-MOD-092-LOGISTICS.md) **APPROVED** · Architecture **COMPLETE / FROZEN**. Go-Live **READY**. [Readiness](./MOD-092-IMPLEMENTATION-READINESS.md) **APPROVED**. No implementation yet. |

### Business Productivity

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Internal Files | Business Productivity → File Explorer → Internal Files | Not Started | PRM-002 | Workspace | Staff files |
| External Files | Business Productivity → File Explorer → External Files | Not Started | PRM-002 | Workspace | |
| Client Explorer | Business Productivity → File Explorer → Client Explorer | Not Started | PRM-001 | Client Directory, Files | Derive from Client |
| Calendar | Business Productivity → Calendar | Not Started | PRM-001 (optional) | — | |
| Email | Business Productivity → Email | Not Started | — | — | Shared mailboxes |
| Messaging | Business Productivity → Messaging | Not Started | PRM-001 / PRM-002 | Workspace, Users | |
| Social | Business Productivity → Social | Not Started | — | — | |
| Support Desk | Business Productivity → Support Desk | Not Started | PRM-001 | Client Directory | Tickets should reference Client |

### Training / QMS

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Training Dashboard | Training → Dashboard | Not Started | — | Staff / QMS Training | Coming Soon UI |
| Staff Training | Training → Staff Training | Not Started | — | Employees | |
| QMS Training | Training → QMS Training | Not Started | — | QMS | |
| Quality Management System | QMS → Quality Management System | Not Started | — | — | |

### Engineering

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Engineering Dashboard | Engineering → Dashboard | Not Started | — | — | **Shares** Engineering implementation today |
| Engineer / Resource Breakdown | Engineering → Engineer / Resource Breakdown | Not Started | — | Engineering Dashboard | Same implementation today |

### Tools

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Website Management | Tools → Website Management | Not Started | — | — | Public site CMS |
| Testing | Tools → Testing | Not Started | — | Telemetry (optional) | Simulator |
| Telemetry | Tools → Telemetry | Not Started | — | — | Live OSD |
| Internal Users | Tools → Users | Not Started | PRM-002 | Workspace membership | Internal operators |

### External Client Access

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| External Client Access Dashboard | External Client Access → Dashboard | Not Started | PRM-001, PRM-002 | Clients, External Users | Coming Soon / portal builder |
| External Users | External Client Access → External Users | Not Started | PRM-001 | Client Directory | Portal logins; FK to Client eventually |

### Settings

| Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Profile | Settings → Profile | Not Started | — | Internal Users | Personal |
| General Settings | Settings → General | Not Started | **PRM-002** | Workspace | Runtime settings for `unit311` |
| Platform Billing | Settings → Platform Billing | Not Started | PRM-001 | Clients, subscriptions | Unit311 billing of customers |

---

## Counts

| Status | Count |
| --- | --- |
| Not Started | **59** (all register rows) |
| In Review | 0 |
| Approved | 0 |
| Implementing | 0 |
| Implemented | 0 |

*(Navigation itself is complete and frozen; it is not a module in this register.)*

---

## Suggested review order (guidance only — not authorised)

Subject to product priority. Default recommendation:

1. **Client Directory** (PRM-001)  
2. CRM Pipeline + Client Onboarding (conversion boundary)  
3. Projects (Internal / External rules)  
4. Financials (AR + Wise activation)  
5. Workspace / General Settings (PRM-002)  
6. Remaining modules by Business Central → Assets → Productivity → Organisation → Platform  

Do not start implementation of a module until its FDR is approved.

---

## Out-of-nav (not in register scope)

Reachable via deep link but **not** in frozen sidebar. Do not expand without architecture approval:

- Strategy: Board deck, Strategy, Competitors, Whiteboard  
- Corporate Insurance  
- WhatsApp Testing (`/whatsapp/support-flow`)  
- Legacy survey views (Fleet, WebODM, etc.)

---

## Document control

| Event | Date | Note |
| --- | --- | --- |
| Register created | 2026-07-19 | Post navigation freeze |
| Module statuses | — | All Not Started pending FDR cycle |

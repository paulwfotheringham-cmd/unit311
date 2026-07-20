# Platform Module Register

| Field | Value |
| --- | --- |
| **Status** | **ACTIVE** — master implementation tracker |
| **Host** | `internal.unit311central.com` |
| **Navigation** | **FROZEN** — [Internal Navigation Blueprint](./INTERNAL_NAVIGATION_BLUEPRINT.md) (IMPLEMENTED) |
| **Baseline architecture** | PRM-001 · PRM-002 · PRM-003 (APPROVED) · Navigation Blueprint · Navigation Implementation · [Integration Dependency Matrix](./INTEGRATION_DEPENDENCY_MATRIX.md) (**APPROVED**) · [Module Go-Live Structure Review](./MODULE_GO_LIVE_STRUCTURE_REVIEW.md) (**APPROVED** — HR IDs remapped 2026-07-21: MOD-074 Reports · MOD-201 Recruitment ATS) |
| **Last updated** | 2026-07-21 |

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
| Financials Overview | Financials → Overview | Not Started | PRM-001 | Clients | Top-level Financials section |
| General Ledger | Financials → General Ledger | Not Started | PRM-002 | Workspace tenancy | |
| Accounts Receivable | Financials → Accounts Receivable | Not Started | PRM-001 | Client Directory | AR keyed by Client |
| Accounts Payable | Financials → Accounts Payable | Not Started | — | — | |
| Expenses | Financials → Expenses | Not Started | — | — | |
| Bank | Financials → Bank | Not Started | PRM-001, PRM-002 | AR, Client activation | Platform term Bank; Internal impl may remain Wise |
| Financial Reports | Financials → Reports | Not Started | PRM-001 | GL, AR, AP | |

### Business Central — Human Resources

| Field | Value |
| --- | --- |
| **Domain** | Human Resources (DOM-09) |
| **Status** | **READY** |
| **Demo status** | **READY** |
| **Production status** | **READY** |
| **Completion date** | 2026-07-21 |
| **Production deployment SHA** | `7d881991d6f96c70dcfe7d36889610b00d6ed229` (`7d88199`) |
| **Production deployment** | `dpl_J93KntbeAXjrLamyyYQi2kJDkRei` |
| **Waves** | [MOD-200](./MOD-200-HR-DOMAIN.md) **CLOSED · READY** · [MOD-201](./MOD-201-RECRUITMENT-ATS.md) **CLOSED · READY** |
| **Open backlog (only)** | [HR-201 – Employee 360 Data Integration](./HR-201-EMPLOYEE-360-DATA-INTEGRATION.md) |
| **Architecture** | [FDR-MOD-071](./FDR-MOD-071-EMPLOYEES.md) · [FDR-DOMAIN-GO-LIVE](./FDR-DOMAIN-GO-LIVE.md) · [Internal Navigation Blueprint](./INTERNAL_NAVIGATION_BLUEPRINT.md) · [mod-071-phase1/](./mod-071-phase1/README.md) |

**No further work should be scheduled against the HR domain except HR-201.**

| Module ID | Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| MOD-070 | HR Dashboard | Human Resources → Dashboard | **READY** | — | Employees | Closed under [MOD-200](./MOD-200-HR-DOMAIN.md) |
| MOD-071 | Employees | Human Resources → Employees | **READY** | PRM-002 · **PRM-003** (optional IdP) | Internal Users (optional link) | [FDR-MOD-071](./FDR-MOD-071-EMPLOYEES.md). Live 360 tabs → [HR-201](./HR-201-EMPLOYEE-360-DATA-INTEGRATION.md) |
| MOD-072 | Leave | Human Resources → Leave | **READY** | — | Employees | Closed under [MOD-200](./MOD-200-HR-DOMAIN.md) |
| MOD-073 | Performance | Human Resources → Performance | **READY** | — | Employees | Closed under [MOD-200](./MOD-200-HR-DOMAIN.md) |
| MOD-074 | Reports | Human Resources → Reports | **READY** | — | Employees | Closed under [MOD-200](./MOD-200-HR-DOMAIN.md) (nav `hr-reports`) |
| MOD-201 | Recruitment ATS | Human Resources → Recruitment | **READY** | — | — | Closed under [MOD-201](./MOD-201-RECRUITMENT-ATS.md) |

### Business Central — Corporate Information

| Field | Value |
| --- | --- |
| **Domain** | Corporate Information (DOM-10) |
| **Status** | **READY** |
| **Demo status** | **READY** |
| **Production status** | **READY** |
| **Completion date** | 2026-07-21 |
| **Wave** | [MOD-400](./MOD-400-CORPORATE-INFORMATION.md) **READY** |
| **Architecture** | [FDR-DOMAIN-GO-LIVE](./FDR-DOMAIN-GO-LIVE.md) · [Internal Navigation Blueprint](./INTERNAL_NAVIGATION_BLUEPRINT.md) |

| Module ID | Module Name | Navigation Location | Status | Related PRMs | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| MOD-080 | Corporate Dashboard | Corporate Information → Dashboard | **READY** | — | Corporate children | Closed under [MOD-400](./MOD-400-CORPORATE-INFORMATION.md) |
| MOD-081 | Company Details | Corporate Information → Company Details | **READY** | PRM-002 §9 | — | Live API + polished layout |
| — | Cap Table | Corporate Information → Cap Table | **READY** | — | — | Editable equity register (mock store) |
| MOD-082 | Office Locations | Corporate Information → Office Locations | **READY** | — | — | Office register |
| MOD-083 | Bank Accounts | Corporate Information → Bank Accounts | **READY** | — | — | Multi-currency bank register |
| MOD-084 | Professional Advisors | Corporate Information → Professional Advisors | **READY** | — | — | Advisor categories register |
| MOD-085 | Software & Licences | Corporate Information → Software & Licences | **READY** | — | — | Live software asset register |
| MOD-086 | Contracts | Corporate Information → Contracts | **READY** | — | — | Contract register + renewals |
| MOD-087 | Unit311 Details | Corporate Information → Unit311 Details | **READY** | PRM-002 §9 | — | Platform admin details + Module Go-Live |

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
| HR domain closeout | 2026-07-21 | MOD-200 · MOD-201 **CLOSED · READY**. Production SHA `7d88199`. Sole HR backlog: [HR-201](./HR-201-EMPLOYEE-360-DATA-INTEGRATION.md) |
| Corporate Information Ready | 2026-07-21 | [MOD-400](./MOD-400-CORPORATE-INFORMATION.md) **READY** — DOM-10 modules MOD-080–087 |

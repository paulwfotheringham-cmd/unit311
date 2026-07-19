# Module Go-Live Structure Review

| Field | Value |
| --- | --- |
| **Status** | **APPROVED** |
| **Scope** | All 60 Module Go-Live register entries + 8 approved capability additions (**68** total) |
| **Objective** | Ensure the register represents complete **business capabilities**, not only screens |
| **Constraints** | No platform changes · No implementation · Navigation remains **FROZEN** · Preserve existing MOD IDs · Catalog updates require a separate explicit step |
| **Related** | [Platform Module Register](./PLATFORM_MODULE_REGISTER.md) · [PRM-001](./PRM-001-CLIENT.md) · [PRM-003](./PRM-003-PLATFORM-INTEGRATIONS.md) · [FDR-MOD-071](./FDR-MOD-071-EMPLOYEES.md) · [FDR-MOD-092](./FDR-MOD-092-LOGISTICS.md) · [Integration Dependency Matrix](./INTEGRATION_DEPENDENCY_MATRIX.md) (**APPROVED**) |
| **Approved** | 2026-07-19 |
| **Date** | 2026-07-19 |

---

## Governing rules for this review

1. Recommend a **new module only** when the business process is distinct enough to justify its **own FDR**.
2. Do **not** create modules for screens, tabs, filters, or sub-views of an already coherent capability.
3. Prefer expanding an existing module’s FDR over inventing a sibling ID.
4. **Preserve** all existing `MOD-xxx` IDs and names where the capability already exists (rename for clarity only when needed).
5. New IDs use **unused numbers in the existing band** — never renumber.
6. Navigation structure stays frozen; this review does **not** authorise sidebar changes. New modules are register / FDR planning items until a future navigation review.

### Classification taxonomy

| Class | Meaning |
| --- | --- |
| **Dashboard** | Aggregation / KPI surface; no primary write ownership of masters or workflows |
| **Master Data** | System of record for a durable business entity |
| **Workflow** | Multi-step process with stages, ownership handoffs, and completion criteria |
| **Operational** | Day-to-day execution against masters (create/update work items) |
| **Reporting** | Analytical / board / statutory outputs (may read many modules) |
| **Administration** | Platform, tenancy, identity, or configuration |

---

## 1. Domain assessments

### 1.1 Clients / CRM

| Existing | Keep? | Notes |
| --- | --- | --- |
| MOD-010 Clients Dashboard | **Keep** | Dashboard |
| MOD-011 Client Directory | **Keep** | Master Data (PRM-001) |
| MOD-012 Client Onboarding | **Keep** — rename clarity to **Client Onboarding Workflow** | Workflow (PRM-001 stage writer) |
| MOD-020 CRM Pipeline | **Keep** — owns commercial discovery → opportunity stages | Workflow |
| MOD-021 Discovery & Demo Sessions | **Keep** | Operational (sessions; not the whole discovery funnel) |
| MOD-022 Potential Clients | **Keep** | Master Data / market sizing (not Client SoT) |

| Candidate | Decision | Rationale |
| --- | --- | --- |
| Client Discovery Workflow | **Reject** | Commercial discovery is already MOD-020 CRM Pipeline (Lead → Opportunity). A second discovery module would duplicate PRM-001 CRM ownership. |
| Discovery & Demo Sessions | **Already present** | MOD-021 |
| Proposals & Quotations | **Approve MOD-023** | Complete commercial proposal workflow (create, pricing, quotes, versions, acceptance, conversion) — distinct from pipeline stages and Client master. |
| Client Onboarding Workflow | **Already present** | MOD-012 (rename only) |
| Client Success / Account Management | **Approve MOD-013** | Post-activation relationship ops (health, renewals, expansion) — not Directory profile edits and not Support Desk tickets. |
| Client Offboarding | **Approve MOD-014** | End-of-relationship checklist spanning access, billing, workspace, data retention — Directory owns lifecycle *status*; Offboarding owns the *process*. |
| Client Reports | **Reject (for now)** | Fold client KPIs into MOD-010. Revisit as MOD-015 only if statutory/board packs need a dedicated FDR. |

### 1.2 Projects

| Existing | Keep? | Notes |
| --- | --- | --- |
| MOD-040 Projects Dashboard | **Keep** | Dashboard |
| MOD-041 Internal Projects | **Keep** | Master Data + delivery lifecycle for internal work |
| MOD-042 External Projects | **Keep** | Master Data + delivery lifecycle; `client_id` required (PRM-001) |

| Candidate | Decision | Rationale |
| --- | --- | --- |
| Project Planning | **Approve MOD-043** | Plans, WBS/milestones, baselines — distinct FDR from project master/delivery records. |
| Resource Scheduling | **Approve MOD-044** | Cross-project capacity / assignments. Distinct from MOD-141 Engineer/Resource Breakdown (engineering utilisation view). |
| Project Delivery | **Reject as new ID** | Delivery execution belongs in MOD-041 / MOD-042 FDRs (shared implementation today). Splitting would invent screens without a second SoT. |
| Project Closure | **Reject as new ID** | Closure is a **lifecycle stage + checklist** on the project record (same pattern as Employee offboarding metadata on MOD-071). Specify in project FDRs; do not add MOD-045 unless closure later proves multi-team enough to need its own FDR. |

### 1.3 Human Resources

| Existing | Keep? | Notes |
| --- | --- | --- |
| MOD-070 HR Dashboard | **Keep** | Dashboard |
| MOD-071 Employees | **Keep** | Master Data (approved FDR) |
| MOD-072 Leave | **Keep** — clarity name **Leave Management** | Workflow / Operational |
| MOD-073 Performance | **Keep** — clarity name **Performance Management** | Workflow |
| MOD-074 Recruitment | **Keep** | Workflow |
| MOD-120–122 Training / QMS Training | **Keep** (Training domain) | Do **not** duplicate under HR; Employees displays training by reference |

| Candidate | Decision | Rationale |
| --- | --- | --- |
| Recruitment | **Already present** | MOD-074 |
| Employee Onboarding | **Approve MOD-075** | Multi-team checklist (IT, assets, access, induction) after Offer Accepted — Employees owns the person; Onboarding owns the process. Aligns with FDR-071 “display, don’t own” for related processes. |
| Leave Management | **Already present** | MOD-072 |
| Performance Management | **Already present** | MOD-073 |
| Training & Development | **Already present** | MOD-121 (+ MOD-120 / MOD-122) |
| Employee Offboarding | **Reject as new ID** | Already architected on MOD-071 (§D Offboarding Metadata). Adding MOD-076 would conflict with the approved Employees FDR. |

### 1.4 Logistics

| Existing | Keep? | Notes |
| --- | --- | --- |
| MOD-092 Logistics | **Keep as single module** | Operational — approved FDR already defines Shipment, Shipping Provider, Collections, Returns, Proof of Delivery |

| Candidate | Decision | Rationale |
| --- | --- | --- |
| Logistics Dashboard | **Reject** | KPI surface is a view inside MOD-092 (or Assets parent), not a separate FDR. |
| Shipments | **Reject** | Canonical business object **of** MOD-092 — not a sibling module. |
| Shipping Providers | **Reject** | Provider registry + connections are MOD-092 + **PRM-003** Integration Framework — not a Go-Live business module. |
| Collections / Returns / POD | **Reject** | Lifecycle / object types inside MOD-092 FDR (§A–G). Decomposing would contradict the approved Logistics FDR. |

**Conclusion:** Do **not** decompose Logistics. Sub-navigation inside Logistics may appear later without new module IDs.

### 1.5 Financials

| Existing | Keep? | Notes |
| --- | --- | --- |
| MOD-060 Financial Overview | **Keep** | Dashboard |
| MOD-061 General Ledger | **Keep** | Master Data / Operational ledger |
| MOD-062 Accounts Receivable | **Keep** | Operational — includes customer invoice *posting* / aging (invoicing document workflow may live here until proven separate) |
| MOD-063 Accounts Payable | **Keep** | Operational |
| MOD-064 Expenses | **Keep** | Operational / Workflow |
| MOD-065 Bank | **Keep** | Operational (PRM-003 Banking Providers) |
| MOD-066 Reports | **Keep** | Reporting |

| Candidate | Decision | Rationale |
| --- | --- | --- |
| Payroll | **Approve MOD-067** | FDR-071 assigns payroll **transactions** to Financials; no Go-Live ID exists. Distinct process from GL/Expenses/Employees. |
| Procurement & Purchase Orders | **Approve MOD-068** | Full procurement lifecycle (RFQ → selection → PO → approvals → goods receipt → invoice matching). Phase 1 may be PO-only; name is future-proof. |
| Sales Invoicing (separate) | **Reject (for now)** | Keep invoice create/issue inside MOD-062 AR FDR; split later only if AR aging and invoice authoring need separate ownership. |
| Budgeting / Forecasting | **Defer** | Valuable but not required for finance *operational* go-live; candidate MOD-069 later. |
| Tax / VAT engine | **Defer** | Prefer as capability of GL + localisations, not a standalone module unless multi-jurisdiction complexity forces an FDR. |

### 1.6 Other domains (no structural expansion)

Home, Executive, Partners, Grants, Corporate Information, Assets/Inventory, Files, Productivity communications, Training/QMS, Engineering, Tools, External Access, Settings — **no new modules proposed**. Gaps are implementation depth, not missing first-class capabilities.

Notable clarifications (name only, same ID):

| ID | Clarity name (optional) |
| --- | --- |
| MOD-100 | File Explorer (parent shell) |
| MOD-153 | Users → Internal Users (align register wording) |
| MOD-171 | General → General Settings |

---

## 2. Summary of new modules approved

| Approved ID | Module name | Class | Domain | Priority for FDR |
| --- | --- | --- | --- | --- |
| **MOD-013** | Client Success / Account Management | Operational | Clients | Medium |
| **MOD-014** | Client Offboarding | Workflow | Clients | Medium |
| **MOD-023** | Proposals & Quotations | Workflow | CRM | High (commercial path) |
| **MOD-043** | Project Planning | Workflow | Projects | Medium |
| **MOD-044** | Resource Scheduling | Operational | Projects | Medium |
| **MOD-067** | Payroll | Operational | Financials | High (Employees dependency) |
| **MOD-068** | Procurement & Purchase Orders | Workflow | Financials | Medium |
| **MOD-075** | Employee Onboarding | Workflow | HR | Medium (post Recruitment → Employees) |

**Count:** 8 approved additions → **68** modules total (60 existing + 8). No further modules required by this review.

**Explicitly not added:** Client Discovery Workflow, Client Reports, Project Delivery, Project Closure, Employee Offboarding, any Logistics decomposition, Sales Invoicing split, Budgeting (deferred).

---

## 3. Justification (each new module)

### MOD-013 — Client Success / Account Management

- **Problem:** After Active, no module owns renewals, expansion, health reviews, or account plans. Support Desk is ticket-centric; Directory is identity.
- **Distinct FDR?** Yes — operating model, cadences, and metrics differ from CRM and Support.
- **Does not own:** Client master fields (MOD-011).

### MOD-014 — Client Offboarding

- **Problem:** Churn/contract end touches billing, portal users, workspace, files, logistics holds — a process, not a status flip.
- **Distinct FDR?** Yes — checklist + integrations; Directory only owns lifecycle status transition to Retired/Archived (PRM-001).
- **Does not own:** Client identity.

### MOD-023 — Proposals & Quotations

- **Problem:** Pipeline stages say “Proposal” but no module owns the commercial proposal artefacts end-to-end.
- **Owns (target):** Proposal creation · Pricing · Quote generation · Version history · Customer acceptance · Conversion to Project / Client.
- **Distinct FDR?** Yes — full commercial proposal workflow vs CRM stage machine.
- **Does not own:** Lead/Client identity master; Directory remains Client SoT after conversion (PRM-001).

### MOD-043 — Project Planning

- **Problem:** Internal/External project lists do not define planning artefacts (scope baseline, milestones, plan versions).
- **Distinct FDR?** Yes — planning methodology and artefacts vs live project execution record.
- **References:** MOD-041 / MOD-042 project ids.

### MOD-044 — Resource Scheduling

- **Problem:** Who is allocated when across projects is not owned by project lists or by Engineering’s resource breakdown view.
- **Distinct FDR?** Yes — capacity rules, conflicts, and assignment ownership.
- **References:** `employee_id` (MOD-071), project ids; **does not replace** MOD-141.

### MOD-067 — Payroll

- **Problem:** Employees FDR requires Financials to own payroll transactions; register has no payroll module.
- **Distinct FDR?** Yes — pay runs, statutory outputs, payslips vs GL postings and Employee compensation *profile*.
- **References:** `employee_id`; posts to GL; never duplicates Employees compensation history ownership model.

### MOD-068 — Procurement & Purchase Orders

- **Problem:** AP without a procurement process leaves commitment and three-way match incomplete; naming the module “Purchase Orders” alone would force a later rename.
- **Owns (target):** Supplier RFQs · Supplier selection · Purchase Orders · Approvals · Goods receipt · Invoice matching.
- **Phase 1:** May implement Purchase Orders only; module name and FDR scope remain procurement-wide.
- **Distinct FDR?** Yes — procurement lifecycle distinct from MOD-064 Expenses and MOD-063 bill entry.
- **References:** Vendors/advisors, AP, Inventory/Assets as needed.

### MOD-075 — Employee Onboarding

- **Problem:** Between Offer Accepted and productive Active employee, multi-team tasks are not Leave, not Recruitment pipeline, and should not bloat Employees master FDR further.
- **Distinct FDR?** Yes — checklist orchestration; Employees remains people SoT (aligned with FDR-071 ownership map).
- **Does not own:** Creating the Employee row (Recruitment → Employees remains).

---

## 4. Recommended classifications (full revised structure)

### Numbering scheme (additions only)

| Band | Range | Rule |
| --- | --- | --- |
| Clients | MOD-010–019 | Use **013–014** next; reserve **015–019** |
| CRM | MOD-020–029 | Use **023** next; reserve **024–029** |
| Projects | MOD-040–049 | Use **043–044** next; reserve **045–049** |
| Financials | MOD-060–069 | Use **067–068** next; reserve **069** (Budgeting candidate) |
| HR | MOD-070–079 | Use **075** next; reserve **076–079** |
| Logistics | MOD-090–099 | **No new IDs** — MOD-092 remains atomic |
| All other bands | Unchanged | No renumbering of existing IDs |

---

### Revised Module Go-Live structure

*Existing IDs unchanged. Approved new rows marked **NEW**. Optional clarity renames in italics do not change IDs.*

| Module ID | Module Name | Class | Integration posture (matrix) | Notes |
| --- | --- | --- | --- | --- |
| MOD-001 | Home Dashboard | Dashboard | None | |
| MOD-002 | Executive Assistant | Operational | Optional | |
| MOD-010 | Clients Dashboard | Dashboard | None | Absorbs client KPI reporting |
| MOD-011 | Client Directory | Master Data | None | PRM-001 |
| MOD-012 | Client Onboarding *(Workflow)* | Workflow | Optional | Clarity rename only |
| **MOD-013** | **Client Success / Account Management** | **Operational** | **None / Optional later** | **NEW** |
| **MOD-014** | **Client Offboarding** | **Workflow** | **Optional** | **NEW** |
| MOD-020 | CRM Pipeline | Workflow | Optional | Owns discovery funnel |
| MOD-021 | Discovery & Demo Sessions | Operational | Optional | |
| MOD-022 | Potential Clients | Master Data | None | |
| **MOD-023** | **Proposals & Quotations** | **Workflow** | **Optional** | **NEW** |
| MOD-030 | Partners | Master Data | None | |
| MOD-040 | Projects Dashboard | Dashboard | None | |
| MOD-041 | Internal Projects | Master Data / Operational | None | Includes delivery + closure stage |
| MOD-042 | External Projects | Master Data / Operational | None | Includes delivery + closure stage |
| **MOD-043** | **Project Planning** | **Workflow** | **None** | **NEW** |
| **MOD-044** | **Resource Scheduling** | **Operational** | **None** | **NEW** |
| MOD-050 | Grants | Operational | Optional | |
| MOD-060 | Financial Overview | Dashboard | Required | |
| MOD-061 | General Ledger | Master Data / Operational | Required | |
| MOD-062 | Accounts Receivable | Operational | Required | Includes sales invoicing for now |
| MOD-063 | Accounts Payable | Operational | Required | |
| MOD-064 | Expenses | Workflow / Operational | Required | |
| MOD-065 | Bank | Operational | Required | |
| MOD-066 | Reports | Reporting | Optional | |
| **MOD-067** | **Payroll** | **Operational** | **Required** | **NEW** — PRM-003 Accounting/Banking |
| **MOD-068** | **Procurement & Purchase Orders** | **Workflow** | **Optional** | **NEW** |
| MOD-070 | Human Resources Dashboard | Dashboard | None | |
| MOD-071 | Employees | Master Data | Optional | Approved FDR; owns offboarding metadata |
| MOD-072 | Leave *(Management)* | Workflow | Optional | Clarity rename only |
| MOD-073 | Performance *(Management)* | Workflow | None | Clarity rename only |
| MOD-074 | Recruitment | Workflow | Optional | |
| **MOD-075** | **Employee Onboarding** | **Workflow** | **Optional** | **NEW** |
| MOD-080 | Corporate Information Dashboard | Dashboard | None | |
| MOD-081 | Company Details | Master Data / Administration | None | |
| MOD-082 | Office Locations | Master Data | None | |
| MOD-083 | Bank Accounts | Master Data | Required | Corporate account master |
| MOD-084 | Professional Advisors | Master Data | None | |
| MOD-085 | Software & Licences | Operational | Optional | |
| MOD-086 | Contracts | Master Data / Operational | Optional | |
| MOD-087 | Unit311 Details | Administration | None | Incl. Module Go-Live UI |
| MOD-090 | Assets | Master Data | None | |
| MOD-091 | Inventory Management | Operational | None | |
| MOD-092 | Logistics | Operational | Required | **Atomic** — shipments, providers, collections, returns, POD |
| MOD-100 | File Explorer | Administration / Operational | Optional | Parent shell |
| MOD-101 | Internal Files | Operational | Optional | |
| MOD-102 | External Files | Operational | Optional | |
| MOD-103 | Client Explorer | Operational | Optional | |
| MOD-110 | Calendar | Operational | Required | |
| MOD-111 | Email | Operational | Required | |
| MOD-112 | Messaging | Operational | Required | |
| MOD-113 | Social | Operational | Required | |
| MOD-114 | Support Desk | Operational | Optional | |
| MOD-120 | Training Dashboard | Dashboard | None | |
| MOD-121 | Staff Training | Operational | Optional | HR Training & Development surface |
| MOD-122 | QMS Training | Operational | None | |
| MOD-130 | Quality Management System | Operational | None | |
| MOD-140 | Engineering Dashboard | Dashboard | None | |
| MOD-141 | Engineer / Resource Breakdown | Reporting / Operational | None | Not a substitute for MOD-044 |
| MOD-150 | Website Management | Operational | Required | |
| MOD-151 | Testing | Operational | Optional | |
| MOD-152 | Telemetry | Operational | Required | |
| MOD-153 | Users *(Internal Users)* | Administration | Optional | |
| MOD-160 | External Client Dashboard | Dashboard | Optional | |
| MOD-161 | External Users | Administration / Master Data | Optional | |
| MOD-170 | Profile | Administration | None | |
| MOD-171 | General *(Settings)* | Administration | Optional | |
| MOD-172 | Platform Billing | Operational | Required | |

---

## 5. Rejected candidates (quick reference)

| Idea | Disposition |
| --- | --- |
| Client Discovery Workflow | Covered by MOD-020 |
| Client Reports | Covered by MOD-010 (defer MOD-015) |
| Project Delivery module | Covered by MOD-041 / MOD-042 |
| Project Closure module | Lifecycle on project FDR |
| Employee Offboarding module | Covered by MOD-071 §D |
| Logistics Dashboard / Shipments / Providers / Collections / Returns / POD as modules | Covered by MOD-092 + PRM-003 |
| Sales Invoicing module | Covered by MOD-062 for now |
| Budgeting | Deferred (candidate MOD-069) |

---

## 6. Impact of this approval

| Artefact | Status |
| --- | --- |
| This review | **APPROVED** — architecture complete |
| Module Go-Live catalog (`MODULE_GO_LIVE_CATALOG`) | **Not updated yet** — requires a separate explicit authorisation |
| Platform Module Register | **Not updated yet** — add 8 rows when catalog is updated |
| Integration Dependency Matrix | **Not updated yet** — add rows for MOD-013, 014, 023, 043, 044, 067, 068, 075 when authorised |
| Navigation Blueprint | **No change** — frozen; no sidebar changes |
| FDR-MOD-092 / FDR-MOD-071 | **No redesign** — already aligned |

---

## 7. Approval path

| Status | Meaning |
| --- | --- |
| **DRAFT** | Under review |
| **APPROVED** | **Current** — Module Go-Live architecture review complete (60 + 8 = 68). Catalog / platform updates are a separate step. |
| **LOCKED** | Optional — freeze structure against further ID additions without change control |

### Decision log

| Decision | Outcome |
| --- | --- |
| Review status | **APPROVED** 2026-07-19 |
| Module count | 60 existing + 8 new = **68** |
| Additional modules | None beyond the 8 |
| MOD-023 name | **Proposals & Quotations** (amendment) |
| MOD-068 name | **Procurement & Purchase Orders** (amendment) |
| Navigation | Unchanged / frozen |
| Catalog / platform | Not modified by this approval |

**This document authorises no implementation, no navigation changes, and no catalog updates.**

---

**End of Module Go-Live Structure Review.**  
**Status: APPROVED.**

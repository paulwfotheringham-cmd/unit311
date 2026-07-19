# Internal Operations Navigation Blueprint

| Field | Value |
| --- | --- |
| **Status** | **APPROVED / IMPLEMENTED / FROZEN** |
| **Host** | `internal.unit311central.com` |
| **Scope** | Navigation architecture — **no further structural sidebar changes** without explicit architecture approval |
| **Not in scope** | Module redesign · customer workspace nav · multi-tenancy redesign |
| **Depends on** | [PRM-001](./PRM-001-CLIENT.md), [PRM-002](./PRM-002-WORKSPACE.md) |
| **Tracker** | [PLATFORM_MODULE_REGISTER.md](./PLATFORM_MODULE_REGISTER.md) |

---

## Governing statement

This document records the **product-owner-defined** target navigation for the Unit311 Internal Operations Workspace.

**Navigation is frozen.** Do not redesign or replace this structure.  
All future work is **module-centric** via the Platform Module Register.  
Do not change the sidebar while reviewing or implementing modules unless a future architecture review explicitly authorises it.

---

## 1. Target architecture (authoritative)

```
HOME
└── Home Dashboard

EXECUTIVE
└── Executive Assistant

BUSINESS CENTRAL
├── Clients
│   ├── Dashboard
│   ├── Client Directory
│   └── Client Onboarding          → MOVE into CRM (see migration)
├── CRM
│   ├── Pipeline
│   ├── Discovery & Demo Sessions  ← rename from Executive Strategy Sessions
│   ├── Potential Clients
│   └── Client Onboarding          ← destination after move
├── Partners
├── Projects
│   ├── Dashboard                  ← NEW
│   ├── Internal Projects          ← SPLIT
│   └── External Projects          ← SPLIT
├── Grants
├── Financials
│   ├── Overview
│   ├── General Ledger
│   ├── Accounts Receivable
│   ├── Accounts Payable
│   ├── Expenses
│   ├── Wise                       ← keep label internally; customer workspaces → "Bank"
│   └── Reports
├── Human Resources
│   ├── Dashboard
│   ├── Employees
│   ├── Leave
│   ├── Performance
│   └── Recruitment
└── Corporate Information
    ├── Dashboard
    ├── Company Details
    ├── Office Locations
    ├── Bank Accounts
    ├── Professional Advisors
    ├── Software & Licences
    ├── Contracts
    └── Unit311 Details
        ├── Overview
        └── Module Go-Live             ← readiness register (ID / Module / Status)

Assets
├── Assets
├── Inventory Management           ← NEW
└── Logistics                      ← MOVE from Business Productivity

Business Productivity
├── File Explorer
│   ├── Internal Files
│   ├── External Files
│   └── Client Explorer            ← Unit311 Details REMOVED from here
├── Calendar
├── Email
├── Messaging
├── Social
└── Support Desk

Training
├── Dashboard
├── Staff Training
└── QMS Training

QMS
└── Quality Management System

Engineering
├── Dashboard                      ← NEW / expand
└── Engineer / Resource Breakdown  ← NEW / expand

Tools
├── Website Management
├── Testing
├── Telemetry
└── Users

External Client Access
├── Dashboard
└── External Users

Settings
├── Profile
├── General
└── Platform Billing               ← rename from "Billing"
```

### Explicit product rules

| Rule | Detail |
| --- | --- |
| Unit311 Details | Out of File Explorer → Corporate Information (final section/tab) |
| Executive Strategy Sessions | Rename → **Discovery & Demo Sessions** |
| Client Onboarding | Out of Clients → into **CRM** |
| Projects | Split → Dashboard + Internal Projects + External Projects |
| Inventory Management | New under Assets |
| Logistics | Under Assets (not Business Productivity) |
| Wise | Label **Wise** on internal host; future customer workspaces label **Bank** |

---

## 2. Current vs target — gap analysis

### 2.1 Already aligned (minor or label-only)

| Target item | Current | Gap |
| --- | --- | --- |
| Home Dashboard | `home` / “Home” | Rename label → “Home Dashboard” (optional) |
| Executive Assistant | `executive-assistant` | None |
| Clients Dashboard / Directory | Present | Remove Onboarding from Clients after move |
| CRM Pipeline / Potential Clients | Present | Rename meetings item |
| Partners | `representatives` | Label OK; view id still `representatives` (tech debt) |
| Grants | Present | None |
| Financials tree (except Billing placement) | Present | Overview…Reports match; Wise label OK |
| HR children | Present | Reorder to match target (Leave/Performance before Recruitment) |
| Corporate (most children) | Present | Missing Unit311 Details; Advisers spelling; Insurance extra |
| File Explorer Internal/External/Client | Present | Remove Unit311 Details |
| Calendar, Email, Messaging, Social | Present | None |
| Support Desk | Present as “Support desk” under Support | Flatten label; remove WhatsApp child |
| Training / QMS | Present | QMS label → “Quality Management System” |
| Tools (Website, Testing, Telemetry, Users) | Present | None |
| External Client Access | Present | None |
| Settings Profile / General | Present | Billing → Platform Billing |

### 2.2 Required moves

| ID | Change | From | To |
| --- | --- | --- | --- |
| **M-01** | Move Client Onboarding | Clients | CRM |
| **M-02** | Move Unit311 Details | File Explorer | Corporate Information (final tab) |
| **M-03** | Move Logistics | Business Productivity | Assets |
| **M-04** | Relabel Settings Billing | Settings → Billing | Settings → **Platform Billing** |

### 2.3 Required renames

| ID | Current | Target |
| --- | --- | --- |
| **R-01** | Executive Strategy Session Meetings | **Discovery & Demo Sessions** |
| **R-02** | Support / Support desk | **Support Desk** (section or item) |
| **R-03** | Quality Management | **Quality Management System** |
| **R-04** | Professional Advisers | **Professional Advisors** (spelling) |
| **R-05** | Billing | **Platform Billing** |
| **R-06** | HR | **Human Resources** (section label) |
| **R-07** | Inventory Management (section) | Retire section name — content under **Assets** |
| **R-08** | Home | **Home Dashboard** (optional consistency) |

### 2.4 Required merges

| ID | Change | Detail |
| --- | --- | --- |
| **G-01** | Merge Unit311 Details into Corporate Information | Final tab/section after Contracts; not a Files concern |

### 2.5 Required splits / new surfaces

| ID | Change | Detail |
| --- | --- | --- |
| **S-01** | Split Projects | Today: single `projects`. Target: **Dashboard** + **Internal Projects** + **External Projects**. Needs data rule: how a project is classified Internal vs External (see PRM notes). |
| **S-02** | New Assets → Inventory Management | New view; define vs existing Assets registry (avoid duplicate asset lists). |
| **S-03** | Expand Engineering | Today: single `engineering`. Target: **Dashboard** + **Engineer / Resource Breakdown**. |

### 2.6 Deprecations / removals from nav (present now, absent from target)

| ID | Current item | Recommendation |
| --- | --- | --- |
| **D-01** | Strategy section (Board deck, Strategy, Competitors, Whiteboard) | **Deprecate from nav** — not in owner target. Preserve components/URLs until product decides archive vs relocate. |
| **D-02** | Corporate → Insurance | **Deprecate from nav** — not in target Corporate list. Confirm data retention. |
| **D-03** | Support → WhatsApp Testing | **Deprecate from Support**. Not in target. Park under Tools/Testing later if needed (out of scope unless owner adds it). |
| **D-04** | Section “Inventory Management” as top-level | Replace with **Assets** top-level containing Assets / Inventory / Logistics. |
| **D-05** | URL-only orphans (`fleet`, `webodm`, `recent-missions`, `sector`, prototypes) | Keep out of nav; deprecate or fold later. |

### 2.7 Broken navigation & duplicated functionality

| ID | Issue | Severity |
| --- | --- | --- |
| **B-01** | Client Onboarding will exist under Clients until M-01 — risk of **duplicate** entries if move is additive without remove | High if mishandled |
| **B-02** | Projects single list vs Internal/External split — **no classification field** documented today → split will be ambiguous | High (design before code) |
| **B-03** | Assets vs new Inventory Management — overlapping “things we own” without a defined boundary | Medium |
| **B-04** | Unit311 Details + Company Details placeholders — potential **duplicate corporate identity** surfaces until merge G-01 clarifies roles | Medium |
| **B-05** | Legacy aliases `debtors`/`creditors`/`opex`/`files` still in type union — confusing for deep links | Low |
| **B-06** | Partners view id `representatives` ≠ label — cognitive mismatch | Low |
| **B-07** | Hard paths `/client-onboarding` and `/executive-assistant` must stay valid after CRM move | Medium (redirects) |
| **B-08** | HR Recruitment/Leave/Performance and most Corporate children are **placeholders** — nav will look complete but modules empty | Medium (expected) |
| **B-09** | Settings `billing` already switches Platform vs tenant Billing by host — rename label only on internal; do not break customer Billing | Medium |

---

## 3. Migration plan (current → target)

Phases are **documentation order for future implementation**. No implementation in this pass.

### Phase 0 — Blueprint lock (this document)

- [x] Record owner target as APPROVED  
- [x] Gap analysis + PRM conflict notes  
- [ ] Owner confirms Insurance / Strategy section deprecations (D-01, D-02)

### Phase 1 — Safe renames & label alignment (low risk)

1. R-01 Discovery & Demo Sessions  
2. R-02–R-06, R-08 labels  
3. R-05 Platform Billing  
4. Verify deep links and hard paths still resolve  

### Phase 2 — Structural moves (nav only)

1. **M-01** Client Onboarding: remove from Clients; add under CRM; redirect `client-onboarding` hard path  
2. **M-02 / G-01** Unit311 Details: remove from File Explorer; add as final Corporate tab  
3. **M-03** Logistics → Assets  
4. Retire top-level “Inventory Management” section title in favour of **Assets**  

### Phase 3 — Splits & new items (requires product rules first)

1. Define **Internal vs External Project** rule (recommended: External = linked to Client / delivery for customer; Internal = Unit311-only work — align with PRM-001)  
2. **S-01** Projects Dashboard + Internal + External views (or filters with stable URLs)  
3. **S-02** Inventory Management vs Assets ownership boundary  
4. **S-03** Engineering Dashboard + Resource Breakdown  

### Phase 4 — Deprecations

1. Remove Strategy section from sidebar (D-01) or relocate only if owner amends blueprint  
2. Remove Insurance from Corporate nav (D-02) if confirmed  
3. Remove WhatsApp Testing from Support (D-03)  
4. Clean legacy aliases when convenient  

### Phase 5 — Verification

- Walk every target leaf; confirm one nav path  
- No duplicate Client Onboarding / Unit311 Details  
- PRM-001 Client Directory still under Clients  
- Wise remains Wise on internal host  

---

## 4. Architectural conflicts with PRM-001 / PRM-002

| ID | Topic | Assessment |
| --- | --- | --- |
| **P-01** | Client Directory under Clients | **Aligned** with PRM-001 (master Client record). |
| **P-02** | Client Onboarding under CRM | **Acceptable** if Onboarding remains a **constrained stage writer** on Client (PRM-001), not a second client master. CRM hosts the *process*; Client Directory remains SoT for identity. **Call out in CRM module review.** |
| **P-03** | External Projects | Must reference **Client** (`client_id`), not treat Workspace or project name as customer identity (PRM-001 / PRM-002 §9). |
| **P-04** | Internal Projects | Unit311 work with **no Client** or internal-only Client policy — must not invent fake Clients. Document rule in Projects review. |
| **P-05** | Corporate Information / Unit311 Details | Describes **Unit311 the company**, not a Client — **Aligned** (not PRM-001 Client). Do not store Unit311 as a Client Directory row for “convenience.” |
| **P-06** | Platform Billing under Settings | **Aligned** with internal ops (Unit311 billing of customers). Distinct from Client commercial fields and from Workspace Name (PRM-002 §9). |
| **P-07** | Wise (internal) vs Bank (customer later) | **Aligned** with PRM-002: same capability, host-specific **label**; Workspace runtime presentation, not Client identity. |
| **P-08** | External Client Access | Category C surface inside internal nav — **OK for admin**, but must not become a second Client master (PRM-001). External Users FK → Client eventually. |
| **P-09** | File Explorer Client Explorer | **Aligned** if it derives from Client (PRM-001), not from Workspace Name. |
| **P-10** | Splitting Projects without `client_id` discipline | **Risk** — if “External” is inferred from free-text names, conflicts PRM-001. Mitigation: explicit Client link required for External Projects. |

**No conflict requires changing the owner navigation tree.** Conflicts are **module-design constraints** for later reviews, listed explicitly per platform rules.

---

## 5. Mapping cheat sheet (current view id → target)

| Target leaf | Likely view id (today / future) | Action |
| --- | --- | --- |
| Home Dashboard | `home` | Label |
| Executive Assistant | `executive-assistant` | Keep |
| Clients Dashboard / Directory | `clients-dashboard`, `clients` | Keep; drop onboarding child |
| Client Onboarding | `client-onboarding` | Move under CRM |
| Pipeline | `crm` | Keep |
| Discovery & Demo Sessions | `crm-meetings` | Rename label |
| Potential Clients | `potential-clients` | Keep |
| Partners | `representatives` | Keep (id debt) |
| Projects Dashboard | *new* / `projects` | Split |
| Internal Projects | *new* | Split |
| External Projects | *new* / filtered `projects` | Split |
| Grants | `grants` | Keep |
| Financials… | existing | Keep |
| Wise | `wise` | Keep label internal |
| HR… | existing | Reorder |
| Corporate… + Unit311 Details | + `unit311-details` | Move/merge |
| Assets / Inventory / Logistics | `assets`, *new*, `logistics` | Restructure |
| File Explorer (3) | files-* | Drop unit311-details |
| Calendar / Email / Messaging / Social | existing | Keep |
| Support Desk | `support` | Label; drop WhatsApp |
| Training / QMS | existing | Labels |
| Engineering ×2 | `engineering` + *new* | Expand |
| Tools… | existing | Keep |
| External Client Access | existing | Keep |
| Platform Billing | `billing` | Rename label |

---

## 6. Open confirmations for the product owner

These are **not redesigns** — clarifications before implementation:

1. **Strategy section (D-01):** Confirm permanent removal from nav (Board, Strategy, Competitors, Whiteboard).  
2. **Insurance (D-02):** Confirm removal from Corporate Information.  
3. **WhatsApp Testing (D-03):** Confirm removal from Support (and whether it reappears under Tools later).  
4. **Internal vs External Project definition** for S-01.  
5. **Assets vs Inventory Management** boundary for S-02.

---

## Document control

| Event | Date | Note |
| --- | --- | --- |
| Owner target defined | 2026-07-19 | Navigation architecture set by product owner |
| Gap analysis + migration plan | 2026-07-19 | This document |
| Implementation | — | **Not authorised** |

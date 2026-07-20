# Functional Design Review — MOD-071 Employees

| Field | Value |
| --- | --- |
| **Module ID** | MOD-071 |
| **Module name** | Employees |
| **Navigation** | Business Central → Human Resources → Employees |
| **View id** | `hr` |
| **Go-Live status (current)** | **Needs Work** |
| **FDR status** | **APPROVED** — canonical architectural specification for MOD-071 |
| **Approved** | 2026-07-19 |
| **Related modules** | MOD-070 HR Dashboard · MOD-072 Leave · MOD-073 Performance · MOD-074 Reports · MOD-201 Recruitment ATS |
| **Related PRMs** | PRM-002 (workspace tenancy); Internal Users (access identity — not employee master); [PRM-003 – Platform Integrations](./PRM-003-PLATFORM-INTEGRATIONS.md) (**APPROVED** — optional Identity Providers) |
| **Canonical object** | **Employee** |
| **Canonical store (current)** | `public.hr_employees` |
| **Date** | 2026-07-19 |

---

## Governing statement

**Employees is the single source of truth for every person in the Unit311 employment lifecycle — from offer acceptance through archival.**

This is **not** an HR form. It is the **master Employee record** referenced by Leave, Performance, Training, Payroll display, Projects staffing, Assets assignment, Support Desk, Calendar, Email, Executive Assistant, and related modules.

Other modules **must reference `employee_id`**. They must **not** invent parallel people identity (name/email/role copies) except where a different object is intentionally distinct (e.g. platform login account).

This document is the **approved canonical design** for MOD-071. Implementation must conform to it. Changes require an explicit FDR amendment.

---

## Approved architectural amendments (binding)

The following sections are **binding** and supersede any earlier draft wording in this FDR where they conflict.

---

## A. Employee Lifecycle

The Employee module must support the complete employment lifecycle.

### Lifecycle

```
Candidate
  → Offer Accepted
  → Employee
  → Probation
  → Active
  → Leave of Absence (optional)
  → Notice Given
  → Former Employee
  → Archived
```

| Stage | Meaning |
| --- | --- |
| **Candidate** | Exists in Recruitment; not yet an Employee master row (or soft-linked pre-hire). Owned by Recruitment until offer acceptance. |
| **Offer Accepted** | Hire decision confirmed; Employee record is created (or activated) with lineage to Recruitment. |
| **Employee** | Employment relationship established; onboarding / start pending or in progress. |
| **Probation** | Within probation period. |
| **Active** | Confirmed ongoing employment past probation (or probation not applicable). |
| **Leave of Absence** | Optional temporary absence while remaining employed. |
| **Notice Given** | Resignation or termination notice in progress; offboarding may begin. |
| **Former Employee** | Employment ended; record retained indefinitely for history and reporting. |
| **Archived** | Administrative archival of inactive former records; still searchable under archive filters; **never deleted**. |

### Retention rules

- **Employees are never deleted.**
- Former employees remain **searchable**, **reportable**, and **linked to historical records**.
- Historical references must remain intact across **all** modules (projects, payroll history, leave history, assets, support, documents, notes, timeline).
- `employee_id` is permanent and never reused.

---

## B. Master Data Ownership

The Employee record is the **master people record**.

### Employees owns

| Domain | Notes |
| --- | --- |
| Personal Details | Identity, contact, address, emergency contact, nationality, preferred name, etc. |
| Employment Details | Type, dates, probation, employment history |
| Department | Master org placement |
| Role | Job title / role on the Employee record |
| Manager | Reference to another Employee (`manager_employee_id`) |
| Office | Reference to Office Locations where applicable |
| Compensation Profile | Current package terms derived from compensation history (see §C) |
| Documents | Employee document library |
| Notes | Chronological employment log |
| Timeline | Employment timeline assembly (may ingest events from other modules) |
| Employment Status | Lifecycle stage (§A) |
| Offboarding Metadata | Employment-side offboarding record (§D); financial outcomes referenced, not recalculated |

### Employees does NOT own

| Domain | Owner |
| --- | --- |
| Payroll Transactions | **Financials / Payroll** |
| Leave Requests | **Leave** |
| Leave Balances | **Leave** |
| Performance Reviews | **Performance** |
| Recruitment Pipeline | **Recruitment** |
| Training Records | **Training** |
| QMS Certifications | **QMS** |
| Project Allocation | **Projects** |
| Engineering Allocation | **Engineering** |
| Assigned Assets | **Assets** |
| Calendar Events | **Calendar** |
| Support History | **Support Desk** |

The Employee module **should display** information from these modules where appropriate (Leave tab, Performance tab, Compensation payroll history, etc.) but **must not duplicate ownership**.

---

## C. Compensation History

**Current salary must never overwrite history.**

Maintain a complete compensation history. Each salary history record contains:

| Field | Required |
| --- | --- |
| Effective Date | Yes |
| Salary | Yes |
| Currency | Yes |
| Reason | Yes |
| Approved By | Yes |

**The current salary is simply the latest active record** (by effective date / active flag) — not a separately mutable field that erases prior values.

Apply the **same historical approach** to:

- Bonus  
- Share Options  
- Pension  
- Benefits  

Each of those domains maintains an append-oriented history; the “current” value on the Compensation profile is derived from the latest active history row(s).

Payroll **payments** and calculations remain in Financials / Payroll and are displayed by reference.

---

## D. Offboarding

Expand offboarding. The Employee record stores the employment offboarding record and **references** financial outcomes.

### Offboarding fields (Employees)

- Notice Given Date  
- Notice Period  
- Final Working Day  
- Termination Date  
- Termination Reason  
- Exit Interview  
- Company Assets Returned  
- Accounts Disabled  
- Final Payroll *(reference / status link to Financials)*  
- Outstanding Leave Paid *(reference / status link to Financials)*  
- Redundancy Payment *(reference / amount as recorded outcome — not recalculated here)*  
- Severance Payment *(same)*  
- Outstanding Expenses *(reference to Financials)*  
- Final Amount Paid *(referenced outcome)*  
- Payment Date *(referenced outcome)*  

### Ownership boundary

- **Financial calculations belong to Financials / Payroll.**
- **Employees stores the employment record and references the financial outcome.**
- Completing offboarding sets lifecycle toward **Former Employee** (then optionally **Archived**), never deletion.

---

## E. Integration Principles

1. **Employees is the master people record.**
2. **Every other module references `employee_id`.**
3. **No duplicate employee master data** should exist anywhere else in the platform (no parallel staff directories of name/email/role/status as a second source of truth).
4. The Employee record is the **authoritative source for identity and employment information.**
5. Other modules may own their own entities (leave requests, payroll runs, asset assignments) but those entities **point at** Employee — they do not redefine who the person is.
6. Optional link to Internal Users / platform accounts is for **access**, not employment identity.

### External providers (PRM-003)

Third-party connectivity must conform to [PRM-003 – Platform Integrations](./PRM-003-PLATFORM-INTEGRATIONS.md) (**APPROVED**).

| Posture | Value |
| --- | --- |
| Integration required? | **Optional** |
| Potential provider types | Identity Providers |
| Mandatory / Optional | Optional |
| Examples | Microsoft Entra ID, Google Workspace, Okta |

IdP connections must not invent a parallel employee store. Credentials live in the Integration Framework — never in module-specific HR tables.

---

## 1. Objective

Redesign the Employee Record so that:

1. One permanent Employee ID identifies a person for the life of the employment relationship (and after archival).
2. Personal, employment, compensation profile (history-backed), documents, notes, timeline, offboarding metadata, and reports are assembled around that record.
3. Leave balances/requests, performance reviews, payroll transactions, and related operational data are **displayed** from owning modules — not re-owned.
4. Former and archived employees remain searchable and reportable — **never deleted**.
5. Implementation follows the approved lifecycle, ownership, compensation history, offboarding, and integration rules above.

---

## 2. Current implementation

### 2.1 Surface

| Item | Today |
| --- | --- |
| UI | `HrWorkspace` (`mode="employees"`) — master–detail flat form |
| API | `GET/POST /api/hr/employees`, `PATCH/DELETE /api/hr/employees/[id]` |
| Service | `hr-employees-service.ts` (workspace-scoped) |
| Types | `HrEmployee` in `hr-data.ts` |
| Table | `hr_employees` (migrations 024, 034, 076 `workspace_id`) |
| Layout | Single scrollable form + three document metadata cards |
| Sibling views | Leave / Performance / Recruitment = **Coming Soon** placeholders |

### 2.2 Fields present today

| Area | Fields |
| --- | --- |
| Identity | `id`, `fullName`, `email`, `phone`, `dateJoined` |
| Org | `location`, `role`, `department`, `manager` (**free-text name**, not FK) |
| Compensation | `salaryCurrent`, `salaryPrevious`, `salaryIncreaseDate`, `salaryIncreaseAmount`, `bonus` (EUR assumed) — **overwrites; not true history** |
| Leave counters | `holidayCalendar`, `vacationDaysPerYear`, `vacationDaysTaken` — **conflicts with Leave ownership of balances** |
| Documents | JSON slots only: Resume, Contract, Share Options (`fileName`, `uploadedAt`) — **no file storage** |

### 2.3 Behaviours today

- Create / update / search / filter (role, location).
- **Hard delete** (“Remove from HR records”) — **forbidden under approved lifecycle**.
- HR Dashboard uses live headcount/location/growth; “upcoming leave” is largely **demo data**.
- Board pack consumes headcount + salary+bonus as “annual payroll”.
- Software & Licences cost/employee queries employees and expects optional `status` that **does not exist**.
- Financials payroll KPIs are **stub zeros**, not wired to Employees.

### 2.4 Maturity verdict

**Working CRUD shell** for a thin people list. **Not** yet the approved master Employee record. Implementation must close the gaps against §§A–E.

---

## 3. Gaps analysis

### 3.1 Missing information (vs approved master record)

#### Personal

| Required | Current |
| --- | --- |
| Employee ID (stable) | Technical `hr-xxxxxxxx` only |
| Full Name | Present |
| Preferred Name | Missing |
| Email / Phone | Present |
| Address | Missing |
| Emergency Contact | Missing |
| Nationality | Missing |
| Employment Status (full lifecycle §A) | Missing |
| Employment Type | Missing |

#### Employment

| Required | Current |
| --- | --- |
| Department / Role / Office / Location | Partial (`department`, `role`, `location`; no Office FK) |
| Manager | Free-text — **must become Employee FK** |
| Start Date | `dateJoined` |
| Probation | Missing |
| Employment History | Missing |
| Full offboarding set (§D) | Missing |

#### Compensation

| Required | Current |
| --- | --- |
| History rows (Effective Date, Salary, Currency, Reason, Approved By) | Missing — mutable current/previous fields only |
| Same history model for Bonus / Share Options / Pension / Benefits | Missing |
| Currency / Pay frequency | Missing (EUR hardcoded in UI) |
| Payroll history (display from Financials) | Missing |

#### Leave / Performance / Documents / Notes / Timeline / Reports

| Required | Current |
| --- | --- |
| Display of Leave-owned balances & requests | Counters incorrectly owned on Employee |
| Performance display from Performance module | Missing |
| Document library | Three metadata boxes |
| Notes / Timeline / Employee Report | Missing |

### 3.2 Missing workflows

1. Lifecycle transitions per §A (including Offer Accepted → Employee, Notice Given, Former, Archived).  
2. Org change with employment history.  
3. Compensation change via **new history row** (never overwrite).  
4. Document upload / classify / expire.  
5. Offboarding checklist per §D.  
6. Employee Report generation.  
7. Optional Employee ↔ Internal User link for access.  
8. Recruitment hire conversion (Candidate / Offer Accepted → Employee).

### 3.3 Duplicate data (must be eliminated over time)

| Store | Overlap | Approved rule |
| --- | --- | --- |
| Internal Users / operators | name, email, phone, role, status | Link for access; **Employees owns employment identity** |
| Leave counters on `hr_employees` | Allocated/taken | **Migrate ownership to Leave**; Employees displays only |
| Mutable `salaryCurrent` | Erases history | Replace with compensation history (§C) |
| Manager string | vs Employee name | `manager_employee_id` |

### 3.4 Data owned elsewhere (display only on Employees)

Per §B — Payroll Transactions, Leave Requests/Balances, Performance Reviews, Recruitment Pipeline, Training, QMS Certifications, Project/Engineering Allocation, Assigned Assets, Calendar Events, Support History.

---

## 4. Recommended architecture (approved)

### 4.1 Business object — Employee

**Employee** = the first-class person record for Unit311’s workforce across the full lifecycle (§A).

| Attribute | Rule |
| --- | --- |
| Identity | Permanent `employee_id` (never reuse; never delete) |
| Tenancy | Scoped by `workspace_id` (PRM-002) |
| Status | Lifecycle stages in §A |
| Access account | Optional link to Internal User — not required for Employee existence |
| Client distinction | Employees are **not** Clients (PRM-001) |

### 4.2 Ownership

Binding matrix is **§B Master Data Ownership**. Section 7 below restates it for implementers.

### 4.3 UI architecture — **tabs, not a single form**

**Approved: tabbed Employee record.**

| Tab | Purpose |
| --- | --- |
| **Overview** | Identity snapshot, lifecycle status, role, manager, start date, alerts, quick links |
| **Employment** | Org, type, office, probation, employment history, lifecycle controls |
| **Compensation** | Current package (derived) + full compensation histories (§C); payroll history **read-only** from Financials |
| **Leave** | **Display** Leave-owned Allocated / Taken / Remaining and sick episodes — no local ownership of balances |
| **Documents** | Document library — **replace** three fixed boxes |
| **Performance** | **Display** Performance-owned reviews / objectives / history |
| **Notes** | Chronological employment log (Employees-owned) |
| **Timeline** | Unified chronological employment events |
| **Reports** | Generate / download Employee Report |
| **Offboarding** | Full §D checklist; financial fields as references/outcomes |

List/master panel: search including Former and Archived; filter by lifecycle status, department, office.

### 4.4 Document library

Replace fixed Resume / Contract / Share Options cards with a **typed document library**:

Resume · Employment Contract · Passport · Visa · Right to Work · Driving Licence · Qualifications · Certifications · Training Certificates · Medical · Insurance · Performance Reviews · Share Option Agreement · Other

Each item: type, title, file, uploaded at, expiry (optional), notes, uploaded by.

### 4.5 Leave display (not ownership)

On Employee **Leave** tab, **display** balances from Leave:

- Annual leave · TOIL · Personal Days · Sick Leave · Compassionate Leave · Other Leave  
- Each: **Allocated · Taken · Remaining** (Leave-owned)  
- Sick Leave episodes: Date · Reason · Medical Certificate · Return to Work · Notes (Leave-owned; displayed here)

Until Leave (MOD-072) exists, the Leave tab may show empty/unavailable state or read-only interim migration data — but **target ownership is Leave**, not Employees.

### 4.6 Compensation

Implement §C. Current salary / bonus / share options / pension / benefits on the profile are **projections of latest active history rows**.

| In Employees | In Financials / Payroll |
| --- | --- |
| Compensation history + derived current profile | Payslip lines, run totals, GL postings, amounts paid |
| Offboarding outcome references (§D) | Final payroll / leave payout / severance calculations |

### 4.7 Offboarding

Implement §D in full. Lifecycle: **Notice Given → Former Employee → (optional) Archived**.

### 4.8 Reports & Timeline

**Employee Report** aggregates: Personal · Employment · Compensation · Leave (displayed) · Performance (displayed) · Documents · Notes · Timeline.

**Timeline** events (examples): Joined · Probation Complete · Training · Performance Reviews · Salary Changes · Promotions · Leave · Warnings · Notice Given · Termination · Archived.

---

## 5. Integration map

Governed by **§E Integration Principles**.

| Module | Integration pattern |
| --- | --- |
| **Financials / Payroll** | Own transactions; Employees displays history and offboarding payment outcomes by reference |
| **Leave (MOD-072)** | Owns requests & balances; Employees Leave tab displays |
| **Recruitment (MOD-201)** | Owns pipeline; creates/activates Employee at Offer Accepted |
| **Performance (MOD-073)** | Owns reviews; Employees Performance tab displays |
| **Training / QMS** | Own records/certs; reference `employee_id`; may surface docs |
| **Projects / Engineering** | Allocations reference `employee_id` |
| **Assets** | Assignments reference `employee_id`; offboarding checks returns |
| **Support Desk** | History references employee/user link |
| **Calendar** | Owns events; may reference `employee_id` |
| **Email / Executive Assistant** | Read Employee directory / context |
| **Internal Users** | Access only; optional link |
| **Office Locations** | `office_id` FK |
| **Software & Licences** | Active headcount from lifecycle status (e.g. Active / Probation as policy defines) |
| **HR Dashboard (MOD-070)** | Aggregates only — no parallel people store |
| **External Client Access** | Do not merge with Employee; link accounts if the same person has both roles |
| **Identity Providers (PRM-003)** | Optional SSO / directory sync; Employees remains people master |

---

## 6. Conflicts with current code (explicit)

| ID | Conflict | Target resolution |
| --- | --- | --- |
| E-01 | Hard delete employee | Forbidden — lifecycle to Former / Archived only |
| E-02 | Manager free-text | `manager_employee_id` FK |
| E-03 | Three document filename slots | Document library + file storage |
| E-04 | Vacation counters owned on Employee | Leave owns balances; Employees displays |
| E-05 | No employment lifecycle status | Implement §A stages |
| E-06 | Mutable salary fields overwrite history | Compensation history §C |
| E-07 | Users vs Employees dual identity | Link for access; Employees authoritative for employment |
| E-08 | Financials payroll stubs | Financials owns transactions; Employees displays |
| E-09 | Flat single form | Tabbed Employee record |
| E-10 | Incomplete offboarding | Full §D field set + financial references |
| E-11 | No Candidate / Offer Accepted path | Recruitment integration |

**PRM check:** No conflict with PRM-001 (Employees ≠ Clients). Aligns with PRM-002 workspace scoping.

---

## 7. Ownership restatement (implementers)

### Employees owns

Personal Details · Employment Details · Department · Role · Manager · Office · Compensation Profile (history-backed) · Documents · Notes · Timeline · Employment Status · Offboarding Metadata

### Employees does not own (display / reference only)

| Owner | Domain |
| --- | --- |
| Financials / Payroll | Payroll Transactions |
| Leave | Leave Requests · Leave Balances |
| Performance | Performance Reviews |
| Recruitment | Recruitment Pipeline |
| Training | Training Records |
| QMS | QMS Certifications |
| Projects | Project Allocation |
| Engineering | Engineering Allocation |
| Assets | Assigned Assets |
| Calendar | Calendar Events |
| Support Desk | Support History |

---

## 8. Implementation phases

Implementation is authorised **only** to proceed in approved phases conforming to this FDR. This update does **not** itself ship code.

### Phase 0 — Align to approved amendments

- Treat §§A–E as binding  
- Confirm document storage approach (Internal Files vs dedicated)  
- Confirm Employee ID format for new records  

### Phase 1 — Master record + lifecycle foundation

- Schema: personal depth, employment type, office FK, manager FK, probation, **lifecycle status (§A)**  
- Remove hard delete; support Former Employee (+ Archived path)  
- Tab shell: Overview + Employment + Notes  
- Search/filter including Former / Archived  
- Backfill existing rows to an appropriate lifecycle stage (typically Active)  

### Phase 2 — Compensation history (§C)

- Append-only history for Salary, Bonus, Share Options, Pension, Benefits  
- Fields: Effective Date, amount/terms, Currency (where applicable), Reason, Approved By  
- Derive current profile from latest active rows  
- Read-only payroll history panel (contract with Financials)  

### Phase 3 — Documents library

- Replace three boxes; upload/list/download/expiry; approved types  

### Phase 4 — Leave display + MOD-072 integration

- Leave tab displays Leave-owned balances and sick episodes  
- Migrate any interim counters off Employees ownership  

### Phase 5 — Performance display, Timeline, Reports

- Embed Performance-owned data  
- Timeline event model + ingestion  
- Employee Report export  

### Phase 6 — Offboarding (§D) & cross-module hooks

- Full offboarding UI and metadata  
- Reference Financials outcomes  
- Assets returned / Accounts Disabled hooks  
- Enforce `employee_id` in consuming modules as they are reviewed  

### Phase 7 — Recruitment lifecycle entry

- Candidate → Offer Accepted → Employee creation/activation  

---

## 9. Dependencies

| Dependency | Why | Blocking? |
| --- | --- | --- |
| This FDR (approved) | Canonical design | **Resolved** |
| Office Locations | Office FK | Phase 1 partial |
| Internal Files / storage | Document library | Phase 3 |
| Leave module (MOD-072) | Owns requests & balances | Phase 4 full |
| Performance (MOD-073) | Owns reviews | Phase 5 |
| Financials / Payroll | Transactions & offboarding money | Phase 2 display; Phase 6 outcomes |
| Users linking | Accounts Disabled | Phase 6 |
| Recruitment (MOD-201) | Lifecycle entry | Phase 7 |
| Projects / Engineering / Assets | Consume `employee_id` | Parallel |

---

## 10. Recommendations summary (approved)

1. **Employee is the platform master people object** — lifecycle §A, never deleted.  
2. **Tabbed Employee record** is required.  
3. **Ownership is §B** — display others; do not re-own.  
4. **Compensation is history-first (§C)** — current = latest active row.  
5. **Offboarding is §D** — employment record + financial references.  
6. **Integration is §E** — `employee_id` everywhere; no duplicate masters.  
7. **Module Go-Live (MOD-071)** is **Ready** under [MOD-200](./MOD-200-HR-DOMAIN.md) (**CLOSED** 2026-07-21, production SHA `7d88199`). The only scheduled HR follow-up is [HR-201](./HR-201-EMPLOYEE-360-DATA-INTEGRATION.md) (Employee 360 live data; not a demo blocker).

---

## 11. Acceptance criteria (Phase 1 gate)

- [ ] Employee cannot be hard-deleted; lifecycle includes Former Employee (and path to Archived)  
- [ ] Lifecycle status model implements §A (as applicable to Phase 1 scope)  
- [ ] Personal + employment core fields on tabs  
- [ ] Manager stored as Employee reference  
- [ ] Former (and Archived) employees searchable/filterable  
- [ ] Workspace scoping preserved  
- [ ] No new duplicate people master introduced  
- [ ] Ownership boundaries §B documented in API/UI copy where relevant  

---

## 12. Decision log

| Decision | Outcome |
| --- | --- |
| FDR status | **APPROVED** 2026-07-19 — canonical for MOD-071 |
| UI structure | **Tabs** (approved) |
| Lifecycle | **§A** (approved) |
| Master ownership | **§B** (approved) — Leave owns balances; Financials owns payroll transactions |
| Compensation history | **§C** (approved) — never overwrite |
| Offboarding | **§D** (approved) — reference financial outcomes |
| Integration | **§E** (approved) — `employee_id`; no duplicate masters |
| Document storage | Pending implementation choice (Internal Files vs HR bucket) — must not change ownership rules |
| Employee ID format | Pending implementation choice — must remain permanent |
| Contractors | Include via Employment Type unless a future FDR splits them |
| Module Go-Live (demo) | **Ready** / closed under [MOD-200](./MOD-200-HR-DOMAIN.md) 2026-07-21 (SHA `7d88199`); sole backlog [HR-201](./HR-201-EMPLOYEE-360-DATA-INTEGRATION.md) |

---

**End of FDR — MOD-071 Employees.**

**Status: APPROVED canonical architectural specification.**  
Implementation must follow this document; this approval message does not itself constitute a request to implement.

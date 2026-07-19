# MOD-071 Phase 1 — Database Migration Plan

| Field | Value |
| --- | --- |
| **Status** | **APPROVED** |
| **Approved** | 2026-07-19 |
| **Canonical spec** | FDR-MOD-071 §§A–E + Phase 1 approved decisions |
| **Migration id** | `091_hr_employee_foundation.sql` (+ ensure hook in `internal-db-migrations.ts`) |

---

## Approved decisions (binding)

| # | Decision |
| --- | --- |
| 1 | Backfill `pay_frequency = 'annual'`. Compensation profile stores **annual equivalent**. |
| 2 | Real document uploads in Phase 1 (not metadata-only). |
| 3 | Existing employees → `employment_status = 'active'`. Candidate / Offer Accepted owned by Recruitment later. |
| 9 | Permanent **Employee Number** `EMP-0001`, `EMP-0002`, … — never changes, never reused; UUID/`id` remains internal PK. |

---

## Goals

Extend `hr_employees` and add child tables for lifecycle, compensation history, notes, timeline, offboarding, document library (with file storage), and Employee Number. Soft archive only — never delete.

---

## Design

| Topic | Approved approach |
| --- | --- |
| Lifecycle | `employment_status` text + check constraint |
| Manager | `manager_employee_id` → `hr_employees(id)` ON DELETE SET NULL |
| Office | `office_id` text null (soft ref); keep `location` |
| Compensation history | `hr_employee_compensation_history`; current = latest non-superseded |
| Cached salary | Keep `salary_current` / `bonus` as derived cache |
| Documents | `hr_employee_documents` + real `storage_path` / upload |
| Soft archive | `archived` status + `archived_at` |
| Leave counters | Retained, deprecated |
| Employee Number | `employee_number text unique` — `EMP-####` zero-padded |

### Lifecycle enum

`candidate` · `offer_accepted` · `employee` · `probation` · `active` · `leave_of_absence` · `notice_given` · `former_employee` · `archived`

Phase 1 UI focuses on operational statuses; Candidate / Offer Accepted reserved for Recruitment.

### Compensation categories

`salary` · `bonus` · `share_options` · `pension` · `benefits`

History row: `effective_date`, `amount`, `currency`, `reason`, `approved_by`, `terms`, `superseded_at`.

Unique partial index: one current row per `(employee_id, category)` where `superseded_at is null`.

### Document types

resume · employment_contract · passport · visa · right_to_work · driving_licence · qualifications · certifications · training_certificates · medical · insurance · performance_reviews · share_option_agreement · other

Required fields: type, file, uploaded_by, uploaded_at; optional expiry, notes. No versioning/approval.

### Employee Number allocation

- Column `employee_number text not null unique`
- Format `EMP-` + 4-digit sequence (`EMP-0001` …)
- Allocate via workspace-scoped counter table `hr_employee_number_seq (workspace_id PK, next_value int)` **or** `max(existing)+1` at create time with unique constraint retry
- Backfill existing rows in stable order (`date_joined`, `id`)
- Never reuse numbers of archived/former employees

---

## Alter `hr_employees`

Add: `employee_number`, personal fields, `employment_status`, `employment_type`, `manager_employee_id`, `office_id`, probation/end dates, `pay_frequency`, `currency`, optional `platform_user_id`/`operator_id`, `archived_at`, full offboarding column set per FDR §D.

Retain deprecated: `manager`, salary cache columns, `documents` jsonb, vacation counters.

Indexes: `(workspace_id, employment_status)`, `(workspace_id, employee_number)`, `manager_employee_id`.

---

## New tables

- `hr_employee_compensation_history`
- `hr_employee_documents` (incl. `storage_path`, `file_name`, `uploaded_by`, `uploaded_at`, `expires_at`, `notes`)
- `hr_employee_notes`
- `hr_employee_timeline_events`
- `hr_employee_employment_history`
- `hr_employee_number_seq` (optional helper)

All child tables: `workspace_id` + `employee_id` FK.

---

## Backfill

1. `employment_status = 'active'` for all existing rows.  
2. `currency = 'EUR'`, `pay_frequency = 'annual'`.  
3. Assign `employee_number` sequentially `EMP-0001`….  
4. Seed salary (and prior salary / bonus) compensation history from legacy fields.  
5. Map `manager` names → `manager_employee_id` where unique.  
6. Migrate legacy JSON document **metadata** into library rows; `storage_path` null until re-upload.  
7. Timeline `joined` events at `date_joined`.  

---

## Runtime ensure

Wire `091_hr_employee_foundation.sql` into `ensureHrEmployeesTable()`.

---

## Non-goals

No payroll/leave/performance/recruitment tables. No hard delete.

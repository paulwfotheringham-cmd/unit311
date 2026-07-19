# MOD-071 Phase 1 — API Impact Assessment

| Field | Value |
| --- | --- |
| **Status** | **APPROVED** |
| **Approved** | 2026-07-19 |

---

## Approved decisions (binding)

| # | Decision |
| --- | --- |
| 4 | `DELETE /api/hr/employees/[id]` → **405 Method Not Allowed**. Archive instead. |
| 5 | PATCH `salaryCurrent` continues to work; **internally creates compensation history**. Current salary = latest active history row. |
| 3 | Manual creates default to **Active** (Recruitment owns Candidate / Offer Accepted later). |
| 9 | Responses include permanent `employeeNumber` (`EMP-####`). |

---

## Routes

| Method | Path | Behaviour |
| --- | --- | --- |
| GET | `/api/hr/employees` | List; `includeArchived`; default excludes `archived` only (Former remains) |
| POST | `/api/hr/employees` | Create; default status `active`; allocate next `EMP-####`; seed timeline + optional salary history |
| GET | `/api/hr/employees/[id]` | Full record + collections |
| PATCH | `/api/hr/employees/[id]` | Master fields; status; offboarding; salary shim → history |
| DELETE | `/api/hr/employees/[id]` | **405** always |
| POST | `/api/hr/employees/[id]/archive` | Status `archived` + `archived_at` + timeline |
| GET/POST | `/api/hr/employees/[id]/compensation-history` | Append / list history |
| GET/POST | `/api/hr/employees/[id]/documents` | Library + **multipart upload** |
| PATCH/DELETE | `/api/hr/employees/[id]/documents/[docId]` | Update metadata / remove document row (not employee) |
| GET | `/api/hr/employees/[id]/documents/[docId]/download` | Signed/download URL |
| GET/POST | `/api/hr/employees/[id]/notes` | Notes |
| GET/POST | `/api/hr/employees/[id]/timeline` | Timeline (+ manual) |
| GET/POST | `/api/hr/employees/[id]/employment-history` | Org history |

---

## Salary shim

On PATCH with `salaryCurrent` (and optional currency/reason/approvedBy):

1. Supersede current `salary` history row.  
2. Insert new history row (effective_date=today unless provided).  
3. Refresh `salary_current` cache from latest active salary.  
4. Timeline `compensation_change`.

---

## Auth

Unchanged: platform session + current workspace.

# MOD-071 Phase 1 — Integration Impact Assessment

| Field | Value |
| --- | --- |
| **Status** | **APPROVED** |
| **Approved** | 2026-07-19 |

---

## Approved decisions (binding)

### Active Headcount (platform standard)

**Included:** Active · Probation · Notice Given · Leave of Absence  

**Excluded:** Candidate · Offer Accepted · Former Employee · Archived  

Used by dashboards, Software & Licences cost/employee, and similar operational counts.

### Board pack payroll

Totals **exclude Former Employees and Archived**. Current operational payroll only.

### Ownership (unchanged)

Financials owns payroll calculations. Leave owns leave. Performance owns reviews. Employees displays / references only.

### Employee Number

`EMP-####` is the human-readable identifier for reports, payroll references, and cross-module display. Internal `id` remains PK.

---

## Consumer updates required in Phase 1

| Consumer | Change |
| --- | --- |
| `countActiveEmployees` / Software & Licences | Filter by Active Headcount statuses via `employment_status` |
| Board pack employee payroll sum | Exclude `former_employee` + `archived` |
| HrDashboard | Prefer Active Headcount for live tiles where applicable |

---

## Non-changes

No Financials/Leave/Performance/Recruitment/Training/QMS workflow implementation in Phase 1.

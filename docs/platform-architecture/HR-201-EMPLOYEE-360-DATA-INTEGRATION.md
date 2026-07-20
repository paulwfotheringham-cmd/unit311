# HR-201 — Employee 360 Data Integration

| Field | Value |
| --- | --- |
| **ID** | HR-201 |
| **Type** | Future implementation wave (enhancement) |
| **Parent** | [MOD-200](./MOD-200-HR-DOMAIN.md) (**CLOSED · READY**) |
| **Priority** | Not a demo / production blocker |
| **Status** | **Backlog** — sole open HR domain item (recorded 2026-07-21) |

---

## Scheduling rule

After MOD-200 / MOD-201 closeout: **no further work should be scheduled against the HR domain except this item (HR-201).**

## Intent

Make Employee 360 the **single authoritative employee record**, with every tab driven by live HR data rather than demo seed assumptions.

## Scope

- Replace remaining demo seed data with live API data.
- Add employee **Date of Birth** field.
- Populate **birthdays** on the HR Dashboard from employee records.
- Wire the Employee **Leave** tab to live Leave Management.
- Wire the Employee **Performance** tab to live Performance Reviews.
- Populate **Timeline** from actual HR events.
- Populate **Reports** from generated HR reports.
- Remove any remaining demo-only assumptions.

## Acceptance criteria

Employee 360 becomes the single authoritative employee record with all tabs driven by live HR data.

## Architecture links

- [Platform Module Register](./PLATFORM_MODULE_REGISTER.md) — HR domain **READY**
- [MOD-200 HR Domain](./MOD-200-HR-DOMAIN.md)
- [MOD-201 Recruitment ATS](./MOD-201-RECRUITMENT-ATS.md)
- [FDR-MOD-071 Employees](./FDR-MOD-071-EMPLOYEES.md)

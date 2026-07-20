# HR-201 — Employee 360 Data Integration

| Field | Value |
| --- | --- |
| **ID** | HR-201 |
| **Type** | Future implementation wave (enhancement) |
| **Parent** | [MOD-200](./MOD-200-HR-DOMAIN.md) (**READY**) |
| **Priority** | Not a demo blocker |
| **Status** | **Backlog** — recorded 2026-07-21 |

---

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

## Notes

- This is an **enhancement**, not a blocker for MOD-200 Ready or customer demonstrations.
- Leave, Performance, Recruitment, and Reports domain workspaces may remain mock-backed until their dedicated live APIs ship; HR-201 focuses on closing the Employee 360 integration gap against those sources once available.

# MOD-201 — Recruitment ATS

| Field | Value |
| --- | --- |
| **Wave / Module ID** | MOD-201 |
| **Module name** | Recruitment ATS |
| **Domain** | DOM-09 Human Resources |
| **Parent wave** | [MOD-200](./MOD-200-HR-DOMAIN.md) (**CLOSED · READY**) |
| **Status** | **CLOSED · READY** |
| **Completion date** | 2026-07-21 |
| **Production deployment SHA** | `7d881991d6f96c70dcfe7d36889610b00d6ed229` (`7d88199`) |
| **Production deployment** | `dpl_J93KntbeAXjrLamyyYQi2kJDkRei` |
| **Demo status** | **READY** |
| **Production status** | **READY** |

---

## Closure

MOD-201 is **closed**. Recruitment ships as a single-page Applicant Tracking System on the HR mock store, within the closed MOD-200 HR domain.

No further Recruitment UX work is scheduled. Live recruitment APIs may appear only as needed under broader HR data waves; the sole open HR backlog item remains [HR-201](./HR-201-EMPLOYEE-360-DATA-INTEGRATION.md).

### Delivered surface

Single-page ATS: KPIs, filters, vacancy management, Kanban (Vacancy Approved → Onboarding), candidate slide-over (Overview / CV / Interview Notes / Feedback / Offer / Timeline / Actions), create/edit modals, interview & offer recording, upcoming interviews / activity / recent hires.

### Architecture links

- [Platform Module Register](./PLATFORM_MODULE_REGISTER.md)
- [MOD-200 HR Domain](./MOD-200-HR-DOMAIN.md)
- [HR-201 Employee 360 Data Integration](./HR-201-EMPLOYEE-360-DATA-INTEGRATION.md)
- [FDR-DOMAIN-GO-LIVE](./FDR-DOMAIN-GO-LIVE.md) — DOM-09 includes MOD-201
- [Internal Navigation Blueprint](./INTERNAL_NAVIGATION_BLUEPRINT.md)

---

## Decision log

| Decision | Outcome |
| --- | --- |
| ATS redesign shipped | 2026-07-21 · commit `7d88199` |
| Go-Live ID | **MOD-201** (Recruitment ATS); **MOD-074** reserved for HR Reports |
| Wave closure | **CLOSED** 2026-07-21 |

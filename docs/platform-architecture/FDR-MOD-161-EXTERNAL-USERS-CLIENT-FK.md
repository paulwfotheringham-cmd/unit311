# FDR-MOD-161 — External Users Client FK

| Field | Value |
| --- | --- |
| **ID** | FDR-MOD-161-CLIENT-FK |
| **Module** | MOD-161 External Users |
| **Status** | **APPROVED / IMPLEMENTED** |
| **Wave** | Internal Operations v1.0 — Wave 1 |
| **Related** | [PRM-001](./PRM-001-CLIENT.md) · MOD-011 Client Directory |
| **Navigation** | Unchanged |
| **Date** | 2026-07-20 |

---

## Intent

Bind every external platform user to a **Client Directory** record via hard FK `client_id`, ending free-text `client_name` / organisation string as identity SoT (PRM-001 §4).

---

## Canonical model

| Field | Rule |
| --- | --- |
| `platform_users.client_id` | uuid/text FK → `internal_clients.id` (nullable only during backfill; required for new external users) |
| `client_name` / organisation display | Derived from Client Directory at read time (optional denormalised cache, never SoT) |
| Create/invite | Must pick an existing Client (or convert CRM → Client first) |

---

## Migration strategy

1. Add `client_id` column (nullable) + index.
2. Backfill: match `platform_users.client_name` / organisation to `internal_clients.company_name` (case-insensitive) within workspace where possible.
3. Leave unmatched rows nullable; UI flags “Unlinked — assign Client”.
4. New creates require `client_id`.
5. Stop writing `client_name` as identity (keep column as display cache optional).

---

## API / UI

- External Users create/edit: Client picker from Directory.
- List shows Client company name from Directory join/lookup.
- Reject create without `client_id` (400).

---

## Out of scope

- External Client Access Dashboard (MOD-160)
- SSO / IdP
- Portal module entitlements

---

## Implementation notes

| Item | Result |
| --- | --- |
| Migration | `095_platform_users_client_id.sql` — nullable FK + unique-name backfill |
| Clean / re-apply | Verified on throwaway Postgres (Acme matched; ambiguous/unknown left null; bad FK rejected; idempotent re-apply) |
| API | Create/PATCH require `clientId`; list enriches Directory name; Admin+workspace session unchanged |
| UI | Client picker; “Unlinked” banner for legacy nulls |
| Go-Live | MOD-161 → Ready |

## Approval

Reply **CONFIRM FDR-MOD-161-CLIENT-FK** to authorise implementation. (Confirmed — implemented.)

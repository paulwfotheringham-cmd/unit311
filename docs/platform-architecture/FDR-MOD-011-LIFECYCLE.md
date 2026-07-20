# FDR-MOD-011 — Client Directory Lifecycle Status

| Field | Value |
| --- | --- |
| **ID** | FDR-MOD-011-LIFECYCLE |
| **Module** | MOD-011 Client Directory |
| **Status** | **APPROVED / IMPLEMENTED** |
| **Wave** | Internal Operations v1.0 — Wave 1 |
| **Related** | [PRM-001](./PRM-001-CLIENT.md) §3 (LOCKED) |
| **Navigation** | Unchanged |
| **Date** | 2026-07-20 |

---

## Intent

Replace the legacy Directory `account_status` set (`Prospect`, `Pending`, `Pending Payment`, `On Hold`, `Inactive`, `Active`) with the **PRM-001 Client Directory lifecycle** (from **Client Created** onward). Pre-Client stages (Discovery → Won) remain CRM-owned and must not appear as Directory statuses.

---

## 1. Canonical status set

Stored on `internal_clients.account_status` (text). Directory owns these values only:

| Status | Meaning |
| --- | --- |
| **Client Created** | Directory row exists; not yet fully live |
| **Workspace Provisioned** | Customer workspace linked / provisioned; payment or onboarding may still be outstanding |
| **Onboarding** | Checklist / go-live in progress |
| **Active** | Live commercial customer |
| **Dormant** | Still a Client; commercially quiet |
| **Archived** | Relationship ended; retained; no new work |

**Removed from Directory (not selectable, not writable):**  
`Prospect`, `Pending`, `Pending Payment`, `On Hold`, `Inactive`.

---

## 2. Allowed transitions

Manual (Directory UI / Admin API) and system writers (payment, provisioning, onboarding) must use this graph. Unknown transitions → **400**.

```
Client Created
  → Workspace Provisioned
  → Onboarding
  → Active
  → Dormant
  → Archived

Workspace Provisioned
  → Onboarding
  → Active
  → Archived

Onboarding
  → Active
  → Dormant
  → Archived

Active
  → Dormant
  → Archived

Dormant
  → Active
  → Archived

Archived
  → (none)   // restore only via explicit future “unarchive” if needed; not in this FDR
```

**System writers (constrained):**

| Event | Target status |
| --- | --- |
| Manual / CRM convert create | `Client Created` (default) |
| Workspace provision success while not yet Active | `Workspace Provisioned` (if currently `Client Created`) |
| Onboarding workflow entered | `Onboarding` (from Created / Workspace Provisioned) |
| Payment matched + provision + onboarding complete (existing activation policy) | `Active` |
| Operator sets quiet | `Dormant` |
| Operator archives | `Archived` |

No automatic transitions beyond existing activation/provision hooks in this FDR — only remap their target strings.

---

## 3. Migration strategy

**One-shot SQL** (new migration, e.g. `094_client_lifecycle_status.sql`):

| Legacy `account_status` | Canonical |
| --- | --- |
| `Active` | `Active` |
| `Prospect` | `Client Created` |
| `Pending` | `Onboarding` |
| `Pending Payment` | `Workspace Provisioned` |
| `On Hold` | `Dormant` |
| `Inactive` | `Archived` |
| anything else / null | `Client Created` |

Idempotent: `update … where account_status in (legacy set)`.

Optional check constraint after backfill:

```sql
account_status in (
  'Client Created', 'Workspace Provisioned', 'Onboarding',
  'Active', 'Dormant', 'Archived'
)
```

No table rename. No dual-column period.

---

## 4. API / UI impacts

| Area | Change |
| --- | --- |
| `ClientAccountStatus` / `CLIENT_STATUS_OPTIONS` | Canonical set only |
| `POST/PATCH /api/clients*` | Accept only canonical; reject legacy with 400 |
| `normalizeClientAccountStatus()` | Read-path: map legacy → canonical until migration applied everywhere (defensive) |
| Create default | `Client Created` (not `Prospect`) |
| Payment / signup / provision services | Write canonical targets per §2 |
| Clients Dashboard tiles | Active = `Active`; onboarding bucket = `Client Created` + `Workspace Provisioned` + `Onboarding` |
| EA / filters / badges | Update status classes for six statuses |
| Client form select | Six options; Archived selectable with confirm copy (no hard-delete change) |

Out of scope: contacts 1:N, `client_id` on external users (later Wave 1 items).

---

## 5. Backward compatibility

| Layer | Policy |
| --- | --- |
| **DB after migration** | Only canonical values |
| **API writes** | Canonical only |
| **API reads** | Always return canonical (normalize if stray legacy row) |
| **UI** | Canonical labels only |
| **Bookmarks / reports** | Legacy status strings in filters stop matching; dashboards retiled |
| **Downtime** | None — migration is additive update |

---

## Definition of Done

- Migration applied; no remaining legacy status values in `internal_clients`
- Type + options + writers updated
- Transition helper enforces §2 on Directory PATCH
- Dashboard / EA counts use canonical buckets
- `tsc` clean; no Prospect creatable from Directory

---

## Approval

Reply **CONFIRM FDR-MOD-011-LIFECYCLE** to authorise implementation.

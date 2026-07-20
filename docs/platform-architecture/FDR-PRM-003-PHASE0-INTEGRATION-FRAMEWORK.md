# Functional Design Review — PRM-003 Phase 0 Integration Framework Skeleton

| Field | Value |
| --- | --- |
| **ID** | FDR-PRM-003-PHASE0 |
| **Title** | Integration Framework — Phase 0 Skeleton |
| **Status** | **APPROVED / IMPLEMENTED** (Phase 0) |
| **Wave** | Internal Operations v1.0 — Wave 0 |
| **Related** | [PRM-003](./PRM-003-PLATFORM-INTEGRATIONS.md) (**APPROVED**) · [Integration Dependency Matrix](./INTEGRATION_DEPENDENCY_MATRIX.md) |
| **Navigation impact** | None (frozen IA) |
| **Date** | 2026-07-20 |
| **Amendment** | Incorporates APPROVE WITH CHANGES (dedicated encryption key, category-only module surface, no decrypted credentials to modules, Phase 0 scope lock, schema additions) |

---

## Governing statement

Authorise a **minimal Integration Framework skeleton** so Wave 0 and later modules can attach credentials without inventing module-local vaults.

This FDR does **not** implement live provider APIs, OAuth flows, setup wizards, Settings UI, or module cutovers. It creates the shared store, encryption, connection resolution, and thin Admin/Framework APIs required by PRM-003.

**The framework is provider-agnostic.** Business modules depend only on **categories** (Email, Calendar, Banking, Payments, Storage, Shipping, AI, …). Modules never import or hard-code vendor SDKs or vendor-specific connection shapes.

---

## Scope (in) — Phase 0 only

1. Provider Registry (platform-level catalogue)
2. Workspace Integration Connections (workspace-scoped)
3. Credential encryption at rest with dedicated key + key id for rotation
4. Connection resolution (server-only; category → connection metadata)
5. Admin CRUD APIs for providers/connections
6. Framework APIs for status / capabilities / metadata (never secrets)
7. Seeded provider slots under Wave 0 categories (registry data only)

## Scope (out) — explicit

- Settings UI
- Provider setup wizards
- Live adapters (UPS, DHL, Wise, Stripe, Microsoft Graph, Google, etc.)
- Migration of `email_mailbox_credentials` / `software_asset_credentials`
- Logistics / Email / Bank / Messaging module cutovers
- New navigation leaves
- New module-local credential tables (forbidden going forward)

Those belong to future implementation waves / follow-up FDRs.

---

## Provider-agnostic module contract

| Layer | May know | Must not know |
| --- | --- | --- |
| **Business module** | Category (`email`, `banking`, …); `connectionId`; status; capabilities; non-secret config/metadata; results of framework operations | Vendor name as dependency; decrypted credentials; ciphertext; raw API keys/tokens |
| **Integration Framework** | Provider code/vendor; auth method; decrypt secrets; invoke adapters (future) | Module business objects (shipments, invoices, …) |

Modules resolve connectivity only via framework helpers such as:

- `resolveConnection(workspaceId, category)` → `{ connectionId, status, enabled, manualMode, capabilities, providerDisplayName, config }` (**no secrets**)
- Future: `framework.sendEmail(connectionId, …)` etc. — **not** in Phase 0

Phase 0 ships resolution + Admin CRUD only. Operational framework methods arrive with adapter FDRs.

---

## Data model

### `integration_providers` (platform catalogue)

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| code | text unique | Registry key, e.g. `banking.wise` — **framework-internal**; modules use `category` |
| category | text not null | Canonical category: `banking` · `email` · `calendar` · `messaging` · `payments` · `shipping` · `storage` · `ai` (extensible) |
| display_name | text | Human label |
| auth_methods | jsonb not null | e.g. `["api_key","oauth2","manual"]` |
| default_capabilities | jsonb not null default `[]` | Declared capability codes |
| is_active | boolean not null default true | |
| created_at / updated_at | timestamptz | |

### `workspace_integration_connections`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | `connectionId` returned to modules |
| workspace_id | uuid fk → workspaces | PRM-002; host-resolved current workspace on APIs |
| provider_id | uuid fk → integration_providers | |
| enabled | boolean not null default true | Soft switch (PRM-003 §5) |
| status | text not null | `disconnected` · `connected` · `error` |
| manual_mode | boolean not null default false | First-class manual fallback (PRM-003 §9); not a vendor |
| auth_method | text nullable | Selected method for this connection |
| is_default_for_category | boolean not null default false | At most one default per `(workspace_id, category)` |
| display_label | text nullable | |
| credentials_encrypted | text nullable | Ciphertext only |
| credentials_key_id | text nullable | Key version for rotation (e.g. `v1`) |
| config | jsonb not null default `{}` | Non-secret defaults only |
| capabilities | jsonb not null default `[]` | Effective capabilities (registry ± discovery later) |
| notes | text nullable | Operator notes |
| last_health_at | timestamptz nullable | |
| last_health_status | text nullable | `healthy` · `degraded` · `failed` · `unknown` |
| last_error | text nullable | Non-secret |
| last_tested_at | timestamptz nullable | |
| created_by | text nullable | Audit (operator username / sub) |
| updated_by | text nullable | Audit |
| created_at / updated_at | timestamptz | |
| unique | (workspace_id, provider_id) | One connection row per provider per workspace |

**Default provider rule:** When `is_default_for_category = true`, enforce uniqueness per workspace + provider.category (partial unique index or transactional clear-others-on-set). `resolveConnection(workspace, category)` prefers the default enabled connection; else any single enabled connection; else manual/disconnected posture.

---

## Encryption

- **Do not** use `AUTH_SECRET` for credential encryption.
- Use dedicated env: **`INTEGRATION_CREDENTIALS_SECRET`** (required in production when any credentials are stored).
- Algorithm: server-side AES-GCM (or equivalent); ciphertext stored in `credentials_encrypted`.
- Persist **`credentials_key_id`** (e.g. `v1`) on each row to support future rotation without rewriting the whole table blindly.
- Decrypt **only** inside Integration Framework server code. Never in route handlers that return JSON to browsers, never in module services.
- GET/list/detail APIs return `credentialsSet: boolean` only — never plaintext, never ciphertext.

---

## API design

### Admin APIs

Auth: `requireInternalAdministratorWorkspaceSession`.  
Workspace: host-resolved current workspace only (no client-supplied `workspaceId` body override).

| Method | Path | Behaviour |
| --- | --- | --- |
| GET | `/api/integrations/providers` | List active providers (code, category, display_name, auth_methods, default_capabilities) |
| GET | `/api/integrations/connections` | List connections for current workspace — **no secrets** |
| GET | `/api/integrations/connections/:providerCode` | Single connection detail — **no secrets** |
| PUT | `/api/integrations/connections/:providerCode` | Upsert enabled/status/manual_mode/auth_method/default/config/capabilities/notes; optional `credentials` write-once (encrypted); set audit fields |
| POST | `/api/integrations/connections/:providerCode/test` | Phase 0 stub: `{ ok: false, status: "not_implemented" }` (or honour `manual_mode`) — does not call vendors |
| DELETE | `/api/integrations/connections/:providerCode` | Disconnect; clear credentials ciphertext + key id |

### Framework resolution (server-only)

Not exposed as a module-facing HTTP API that returns secrets.

| Helper | Returns |
| --- | --- |
| `resolveConnection(workspaceId, category)` | `connectionId`, `enabled`, `status`, `manualMode`, `capabilities`, `providerDisplayName`, `providerCode` (metadata only), `config` (non-secret) |
| `getConnectionCredentials(connectionId)` | **Framework-internal only** — decrypted secrets for future adapters; **never** called from business modules |

Phase 0: `getConnectionCredentials` exists for framework completeness/tests; no production adapter may call vendors yet.

### UI

**None in Phase 0.** No Settings panel, no wizard, no nav item.

---

## Seed providers (registry data only)

Seeds populate the registry so Admin CRUD and category resolution have targets. Modules must still resolve by **category**, not by these codes.

| code | category |
| --- | --- |
| banking.wise | banking |
| email.microsoft365 | email |
| calendar.google | calendar |
| messaging.twilio | messaging |
| payments.stripe | payments |
| shipping.ups | shipping |
| storage.placeholder | storage |
| ai.placeholder | ai |

Additional providers may be added later without module changes.

---

## Definition of Done (Phase 0)

- Migrations create both tables + indexes (including default-per-category uniqueness)
- Seed providers present for categories above
- Admin can upsert a connection with encrypted credentials using `INTEGRATION_CREDENTIALS_SECRET` + `credentials_key_id`
- All HTTP GET responses omit secrets and ciphertext
- `resolveConnection` returns metadata only
- Business module code paths introduced in Phase 0 (if any) do **not** receive decrypted credentials
- Test endpoint returns explicit `not_implemented` / manual posture without vendor calls
- No Settings UI, wizards, adapters, or module cutovers shipped
- Tracked as **platform Wave 0 prerequisite** (not a Domain Go-Live domain id)

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Dual credential stores during transition | No new module vaults; Email/Software Assets remain legacy until dedicated migration FDRs |
| Secret leakage | Dedicated key; redact responses; decrypt only in framework |
| Vendor coupling in modules | Category-only resolve API; forbid module imports of provider codes as dependencies |
| Scope creep | Scope (out) list is binding for Phase 0 |

---

## Approval

Amended per APPROVE WITH CHANGES.  
Reply **CONFIRM FDR-PRM-003-PHASE0** to authorise implementation.

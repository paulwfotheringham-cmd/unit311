# Wave 0 — Complete

| Field | Value |
| --- | --- |
| **Status** | **COMPLETE** |
| **Approved** | 2026-07-20 (Wave 0 Review) |
| **Closed** | 2026-07-20 (post-verification) |
| **Host** | `internal.unit311central.com` |
| **Next** | Wave 1 authorised — Client system of record (PRM-001 spine) |

---

## Scope delivered

1. Workspace isolation + session/host binding (verified existing)
2. Users authz + Profile session binding
3. Integration Framework Phase 0 (FDR-PRM-003-PHASE0)
4. Migration / foundation health (`wave0-foundation-health`, allowlist through 093)
5. Global UX chrome (breadcrumb / loading / empty / error)
6. Nav active-state for shared leaves
7. Domain Go-Live roll-up (FDR-DOMAIN-GO-LIVE)

---

## Closeout verification (2026-07-20)

| Gate | Result |
| --- | --- |
| Migration 093 clean apply (Docker Postgres 16) | **PASS** — 8 seed providers |
| Migration 093 re-apply idempotent | **PASS** |
| Migration 093 re-apply with existing connection row | **PASS** — credentials row preserved |
| `INTEGRATION_CREDENTIALS_SECRET` in DEPLOYMENT.md | **PASS** |
| `INTEGRATION_CREDENTIALS_SECRET` + 093 in PRODUCTION_DEPLOYMENT.md | **PASS** |
| Domain status derived from Module Go-Live only | **PASS** (`scripts/verify-wave0-gates.mjs`) |
| HTTP integration APIs never decrypt / return secrets | **PASS** (`scripts/verify-wave0-gates.mjs`) |
| TypeScript | **PASS** |

Re-run gates:

```bash
node scripts/verify-wave0-gates.mjs
```

---

## Production ops still required (not blocking Wave 1 code)

- Apply `093_integration_framework_phase0.sql` to Unit311 Central Supabase
- Set Vercel Production `INTEGRATION_CREDENTIALS_SECRET`
- Confirm `GET /api/internal/wave0-foundation-health` → `ok: true`

---

## Wave 1 entry

Authorised: Clients Dashboard (MOD-010), Client Directory harden (MOD-011), External Users Client FK (MOD-161), Client Explorer prep (MOD-103 dependency).

# Release notes — Recovery closeout (July 2026)

**Status:** Recovery incident **closed**  
**Canonical repo:** `Unit311central/unit311central`  
**Production app tip (at closeout):** commit `1e6db83` / deployment `dpl_GbBLZzFyPow2mXpbgtNCqbuT36qb`  
**Production database:** Supabase Unit311 Central (`kkxtvzxqmbacjatkiupq`)

This note summarizes the recovery release line. It does not authorize further production changes by itself.

---

## Database recovery

Missing production schema for the recovery branch was applied **directly** to Unit311 Central (not via `supabase db push`), one migration at a time, with logical dumps before high-risk steps:

| Migration | Outcome |
| --- | --- |
| 067 treasury settings | Applied |
| 068 founder session booking role | Applied |
| 085 executive call WebRTC signals | Applied |
| 087 CRM / founder bookings `workspace_id` | Applied (cleared booking schema blocker) |
| 088 journal lines + treasury reshape | Applied |
| 089 messaging / email / support uniqueness | Applied |
| **090** accounts `UNIQUE(workspace_id, code)` | Applied 2026-07-19 — multi-tenant General Ledger |

`supabase_migrations.schema_migrations` was left empty; application paths do not depend on it. Prefer Management API / guarded apply routes / explicit `db query` with approval.

Local dumps from recovery live under `backups/pre-apply-*` (not committed).

---

## Edge middleware fix

**Commit:** `bf73699`  
**Issue:** Edge middleware imported Node `crypto` via the platform-auth graph → production deploy failure.  
**Fix:** Web Crypto HMAC session tokens in `platform-session-token.ts`; middleware no longer pulls Node-only password hashing.

---

## Booking fix

**Commit:** `1e6db83`  
**Issue:** Public founder-session booking returned 500 after insert when sending mailbox email resolved workspace via `requireCurrentWorkspace()` before env Zoho secrets.  
**Fix:** Env-first mailbox credentials; pass `workspaceId` on booking emails. Smoke: `POST /api/book/founder-session` → 200.

---

## Multi-tenant General Ledger fix

**Migration:** `090_accounts_workspace_code_unique.sql`  
**Issue:** Global `UNIQUE(code)` on `accounts` blocked customer Chart of Accounts seed (duplicate codes vs Unit311).  
**Fix:** Drop `accounts_code_key`; add `UNIQUE(workspace_id, code)`. Schema-only; Unit311 account rows unchanged.  
**Verified:** Empty customer workspace seeds 21 standard codes; balanced journal + trial balance succeed; Unit311 CoA fingerprint unchanged.

---

## Production acceptance (summary)

Controlled disposable-workspace QA confirmed CRM, projects (create/delete), files, calendar, messaging, HR, support, inventory, host isolation, and executive-call signaling as viable. Partners UI remains non-persistent (known debt). Full customer self-serve onboarding / RBAC remain follow-on work.

---

## Related docs

- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
- [DEPLOYMENT.md](../DEPLOYMENT.md)
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)

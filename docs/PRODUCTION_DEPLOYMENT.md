# Production deployment & rollback (Unit311 Central)

## Canonical source

| Item | Value |
| --- | --- |
| GitHub repository | **`Unit311central/unit311central`** |
| Local folder | `Desktop\unit311` only |
| Vercel project | `unit311central` (`prj_lyDcefpA3tnfzWLiZ9Ui0xVk6nJD`) |
| Production branch | `main` |
| Post-recovery production tip (2026-07-19) | `dpl_GbBLZzFyPow2mXpbgtNCqbuT36qb` (commit `1e6db83`+) |
| Earlier known-good (pre Edge/booking fixes) | `dpl_98yEC1z5opp5ad7NXhk6G4EePPJ9` |

### Production database schema (recovery closeout)

Supabase project **Unit311 Central** (`kkxtvzxqmbacjatkiupq`).

Production includes the following recovery migrations (applied directly during the Jul 2026 recovery; not via `supabase db push`):

| Migration | Purpose |
| --- | --- |
| `067_treasury_settings.sql` | Treasury settings foundation |
| `068_founder_session_booking_role.sql` | Founder booking role column |
| `085_executive_call_webrtc_signals.sql` | Executive Call WebRTC signaling |
| `087_crm_projects_workspace_isolation.sql` | CRM / founder bookings `workspace_id` |
| `088_financials_files_workspace_isolation.sql` | Journal lines + treasury workspace isolation |
| `089_messaging_email_support_workspace_isolation.sql` | Messaging / email / support tenant uniqueness |
| `090_accounts_workspace_code_unique.sql` | Multi-tenant GL: `UNIQUE(workspace_id, code)` |
| `091_hr_employee_foundation.sql` | HR employee foundation (MOD-071) |
| `092_company_details.sql` | **Company Details** table (MOD-081) — required before enabling the feature |
| `093_integration_framework_phase0.sql` | **Integration Framework Phase 0** — provider registry + workspace connections |

**Note on 090:** Applied directly to production on 2026-07-19 during recovery closeout verification. The SQL file and pending-migrations allowlist entry are kept in-repo so the repository matches production. Re-applying 090 is idempotent (safe no-op when the composite unique already exists).

**Note on 092:** Must be applied as a normal pre-deploy database step before shipping Company Details. The application never creates this table at runtime. Verify with `GET /api/internal/company-details-health` (`ok: true`).

**Note on 093:** Required before storing Integration Framework credentials. Idempotent (`create … if not exists`, seed `on conflict do nothing`). Verify with `GET /api/internal/wave0-foundation-health` (integration table checks `ok: true`). Set Vercel Production **`INTEGRATION_CREDENTIALS_SECRET`** (never reuse `AUTH_SECRET`). Optional **`INTEGRATION_CREDENTIALS_KEY_ID`** defaults to `v1` for rotation.

### Pre-deploy release checklist (database)

1. Confirm origin is `Unit311central/unit311central` (`node scripts/assert-canonical-unit311-repo.mjs`).
2. Apply pending migrations allowlist through **`097_demo_workspace.sql`** via `/api/internal/apply-unit311central-pending-migrations` (setup secret) or Supabase Management API / SQL editor.
3. Add Vercel/DNS domain **`demo.unit311central.com`** to the same `unit311central` project (same build as Internal). See [DEMO_RELEASE_MODEL.md](./DEMO_RELEASE_MODEL.md).
4. Confirm POST verification includes `company_details: true` (and Wave 0 health reports integration tables present).
5. Confirm `GET /api/internal/company-details-health` returns `{ ok: true, ready: true }`.
6. Confirm `GET /api/internal/wave0-foundation-health` returns `{ ok: true, ready: true }` after 093.
7. Confirm Production env includes `INTEGRATION_CREDENTIALS_SECRET` before any Admin credential upsert.
8. Merge/promote the app revision only after steps 2–7 pass.
9. Smoke Corporate Information → Company Details (load / save) on Internal host.
10. After deploy affecting the sales journey: `npm run demo:refresh` then smoke `https://demo.unit311central.com`.

`supabase_migrations.schema_migrations` may remain empty; this project applies SQL out-of-band. Do not run `supabase db push` against production without an explicit ops plan.

See also: [RELEASE_NOTES_RECOVERY_2026-07.md](./RELEASE_NOTES_RECOVERY_2026-07.md).

**Do not** deploy Unit311 Central from `Desktop\onwardair` or any other repository/folder.

## How production should ship

1. Work in `Desktop\unit311` with `origin` = `https://github.com/Unit311central/unit311central.git`.
2. Commit changes and push to GitHub (feature branch → review → merge to `main`).
3. Let Vercel’s **Git integration** build from the committed revision on `Unit311central/unit311central`.
4. Confirm the deployment SHA matches the Git commit before treating it as live.

CLI `vercel --prod` from local folders is **disabled in ops scripts**. Prefer Git-built deployments.

### Preflight guard

```bash
node scripts/assert-canonical-unit311-repo.mjs
```

Exits non-zero unless `origin` is `Unit311central/unit311central`.

## Rollback

If production is wrong:

1. Do **not** redeploy from a local dirty tree.
2. Use Vercel **Instant Rollback** / **Promote Existing Deployment**.
3. Prefer the latest known-good production deployment for the current release line  
   (post-recovery tip: **`dpl_GbBLZzFyPow2mXpbgtNCqbuT36qb`**).  
   Use **`dpl_98yEC1z5opp5ad7NXhk6G4EePPJ9`** only if you intentionally need the pre–Edge/booking-fix build.
4. Verify after rollback:
   - `unit311central.com`
   - `internal.unit311central.com`
   - `*.unit311central.com`
   all point at the rolled-back deployment ID
5. Confirm HTML / `_next` assets match that deployment (not a later CLI deploy).

Example (Vercel CLI promote of an existing deployment — does not rebuild):

```bash
npx vercel promote dpl_GbBLZzFyPow2mXpbgtNCqbuT36qb --scope paul-fs-projects-9f603a39 --yes
```

## Forbidden

- `npx vercel --prod` from `Desktop\onwardair`
- Linking `onwardair` to Vercel project `unit311central`
- Deploying uncommitted local changes as production
- Treating `paulwfotheringham-cmd/onwardair` as the Unit311 Central app source

## Related docs

- [DEPLOYMENT.md](../DEPLOYMENT.md) — domains, env, migrations
- [ARCHITECTURE.md](../ARCHITECTURE.md) — host / tenancy model

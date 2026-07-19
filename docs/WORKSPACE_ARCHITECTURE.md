# Unit311 Central — Workspace Architecture

This document is the reference architecture for multi-workspace support on Unit311 Central.

**Production database**

| Field | Value |
| --- | --- |
| Supabase display name | Unit311 Central |
| Project ID | `kkxtvzxqmbacjatkiupq` |
| Notes | Renamed from display name `barcelonadronecenter` only. Same project; no data migration. |

Do **not** create another Supabase project or production database for workspaces.

---

## Why workspaces were introduced

Unit311 Central must eventually support **multiple customer workspaces** in one production database:

1. **Unit311 Central (Internal)** — our own company operations.
2. **Customer workspaces** — isolated environments for each paying customer organisation.

The workspace model provides a shared tenancy key (`workspace_id`) so data can later be partitioned safely without splitting into separate databases.

Phase 1 only prepared the database. The application is **not** workspace-aware yet.

---

## Unit311 Central Internal workspace

The first workspace record represents Unit311 Central itself.

| Field | Value |
| --- | --- |
| `name` | Unit311 Central |
| `slug` | `unit311` |
| `workspace_type` | `Internal` |
| `status` | `Active` |
| Stable ID (production) | `cd5c37a5-add4-4a8b-830c-6d26b775f62c` |

Lookup should always prefer **slug** (`unit311`), not a hard-coded UUID, except where a column default must use a concrete UUID.

All existing Phase 1 business rows were backfilled to this workspace.

---

## Registry table: `workspaces`

```text
workspaces
  id              uuid pk default gen_random_uuid()
  name            text not null
  slug            text not null unique
  workspace_type  text not null
  status          text not null
  created_at      timestamptz not null default now()
  updated_at      timestamptz not null default now()
```

`workspaces` itself does **not** have `workspace_id`.

---

## Workspace foundation tables

These tables extend the workspace registry. They are **database foundation only** in this phase: no application, API, auth, UI, or RLS consumption yet.

### Relationship overview

```text
workspaces
  ├── workspace_settings     (1:1 settings / branding)
  ├── workspace_modules      (1:N enabled modules)
  ├── workspace_users        (1:N user membership + role)
  ├── workspace_audit_log    (1:N administrative events)
  └── <workspace-aware domain tables via workspace_id>
```

Internal-only tables (CRM, Discovery, Internal Messaging, Operators) remain **outside** this foundation membership model for customer workspaces.

### `workspace_settings`

Per-workspace preference and branding record.

| Column | Purpose |
| --- | --- |
| `workspace_id` | FK → `workspaces.id` (unique: one settings row per workspace) |
| `timezone` | Workspace default timezone |
| `currency` | Workspace default currency |
| `language` | Locale / language |
| `date_format` / `time_format` | Display formats |
| `logo_url` | Branding |
| `primary_colour` / `secondary_colour` | Branding colours |

**Unit311 Central seed**

| Field | Value |
| --- | --- |
| timezone | `Europe/London` |
| currency | `USD` |
| language | `en-GB` |
| date_format | `DD/MM/YYYY` |
| time_format | `24h` |
| primary_colour | `#0b2d63` |
| secondary_colour | `#2563eb` |

### `workspace_modules`

Controls which product modules a workspace may access.

| Column | Purpose |
| --- | --- |
| `workspace_id` | FK → `workspaces.id` |
| `module_key` | Stable module identifier (for example `clients`, `financials`) |
| `enabled` | Whether the module is available |

Unique on `(workspace_id, module_key)`.

**Unit311 Central seed:** all current onboarding module keys inserted with `enabled = true` for Internal only. Future customer workspaces receive a copy of those enabled modules via `provision_workspace()`.

### `workspace_users`

Membership relationship between a workspace and a user identity.

| Column | Purpose |
| --- | --- |
| `workspace_id` | FK → `workspaces.id` |
| `user_id` | Future link to a user identity (uuid; not migrated from auth yet) |
| `role` | Future workspace role |
| `is_owner` | Workspace owner flag |

This table does **not** replace authentication. Phase status:

- Table created with FKs/indexes
- **No auth migration**
- **No rows seeded** for Unit311 Central yet

### `workspace_audit_log`

Administrative event history for provisioning, onboarding, module changes, and other workspace actions.

| Column | Purpose |
| --- | --- |
| `workspace_id` | FK → `workspaces.id` |
| `event_type` | Event classification |
| `entity_type` / `entity_id` | Optional subject of the event |
| `description` | Human-readable detail |
| `performed_by` | Optional actor id |

**Unit311 Central seed:** one foundation event  
`workspace_foundation_seeded` — settings + modules defaults created.

---

## How future customer workspaces will be created

Future onboarding (not implemented yet) should:

1. Create a `workspaces` row:
   - `name` = customer company name
   - `slug` = unique slug (for example derived from company / organisation slug)
   - `workspace_type` = customer type (for example `Customer`)
   - `status` = `Active` or onboarding status as defined later
2. Create `workspace_settings` for defaults / branding.
3. Insert selected rows into `workspace_modules` for purchased/enabled modules only.
4. Create `workspace_users` membership rows (owner + invited users) — without changing the current auth system until a later approved phase.
5. Append provisioning events to `workspace_audit_log`.
6. Link `platform_organisations` (and related platform records) to that `workspace_id`.
7. Provision customer-scoped data only into tables marked **workspace-aware**.
8. Never copy Internal-only tables (CRM, Discovery, Internal Messaging, Internal Staff) into a customer workspace.

Until those phases ship, every insert that omits `workspace_id` on a workspace-aware table still defaults to Unit311 Central Internal (Phase 1 compatibility default).

---

## Which tables are workspace-aware

These tables have:

- `workspace_id uuid not null`
- foreign key to `workspaces(id)`
- index on `workspace_id`
- Phase 1 default = Unit311 Central Internal workspace

| Table | Notes |
| --- | --- |
| `accounts` | Chart of accounts / GL |
| `blog_posts` | Site content |
| `client_onboarding_records` | Customer onboarding lifecycle |
| `competitors` | Competitor research |
| `email_mailbox_credentials` | Mailbox credentials |
| `email_whatsapp_notification_log` | Mailbox notification log |
| `email_whatsapp_settings` | Mailbox WhatsApp settings |
| `file_categories` | File repository taxonomy |
| `file_folders` | File repository folders |
| `file_objects` | File repository objects |
| `financial_expenses` | Expenses |
| `hr_employees` | HR |
| `internal_action_items` | Operations action items |
| `internal_calendar_events` | Calendar |
| `internal_clients` | Client directory |
| `internal_info_email_messages` | Legacy info-email messages |
| `internal_info_email_threads` | Legacy info-email threads |
| `internal_projects` | Projects |
| `internal_scheduled_calls` | Scheduled messaging calls |
| `internal_whiteboard` | Whiteboard |
| `invoices` | Accounts receivable invoices |
| `journal_entries` | General ledger headers |
| `platform_organisation_onboarding` | Platform org onboarding config |
| `platform_organisations` | Customer organisations |
| `platform_users` | Platform users |
| `strategy_items` | Strategy board |
| `support_tickets` | Support |
| `telemetry` | Fleet telemetry |
| `whatsapp_inbound_log` | WhatsApp inbound log |
| `whatsapp_support_sessions` | WhatsApp support sessions |
| `whiteboard_projects` | Named whiteboard projects |
| `wise_payment_matches` | Wise ↔ invoice matches |

---

## Which tables remain Internal only

These tables belong to **Unit311 Central’s own business operations**.

Customers must never see or own these records. They are **not** workspace-aware in Phase 1 and must stay Internal-only.

| Table | Purpose |
| --- | --- |
| `crm_leads` | Unit311 CRM pipeline |
| `crm_activities` | CRM activity timeline |
| `crm_contact_history` | Website contact form history |
| `crm_connections` | CRM advisor/network map |
| `founder_session_bookings` | Discovery / Executive Strategy Session bookings |
| `internal_message_channels` | Internal messaging channels (for example Enquiries) |
| `internal_messages` | Internal messaging messages |
| `internal_message_read_state` | Internal messaging read state |
| `internal_operators` | Internal staff / operators |

Examples that remain Internal:

- CRM
- Discovery Calls
- Contact Forms
- Internal Messaging
- Internal Staff

### Other tables without `workspace_id`

| Table | Reason |
| --- | --- |
| `workspaces` | Workspace registry |
| `journal_lines` | Scoped via parent `journal_entry_id` |
| `platform_email_verification_tokens` | Auth tokens scoped by `platform_user_id` |
| `platform_password_reset_tokens` | Auth tokens scoped by `platform_user_id` |

---

## How future code should determine the active workspace

Do **not** implement this yet. When workspace-aware code is introduced, use this order:

1. **Explicit workspace context** from the request path / host / tenant slug when serving a customer workspace.
2. **Authenticated user → organisation → workspace** for customer platform sessions (`platform_users.organisation_id` → `platform_organisations.workspace_id`).
3. **Internal operators dashboard** defaults to the Internal workspace (`slug = unit311`) unless an internal admin tool explicitly switches context.
4. Never infer customer workspace from Internal-only tables (CRM, Discovery, Messaging, Operators).

Recommended helper (future):

```ts
// Future only — do not add until a later approved phase.
// resolveActiveWorkspace({ slug?, organisationId?, session? })
//   -> { id, slug, workspace_type, status }
```

Until then:

- Existing queries remain unchanged.
- Column defaults keep inserting into Unit311 Central Internal.

---

## Migration history

### Pre-Phase 1

- `workspaces` table created and Unit311 Central Internal row seeded (`slug = unit311`).

### `076_workspace_id_phase1.sql`

1. Ensure `workspaces` exists and Internal seed exists.
2. Add nullable `workspace_id` to every workspace-aware table.
3. Backfill all existing rows to Internal workspace `slug = unit311`.
4. Verify zero nulls before hardening.
5. Add foreign keys `*_workspace_id_fkey` → `workspaces(id)`.
6. Add indexes `*_workspace_id_idx`.
7. Set `workspace_id` to `NOT NULL`.
8. Set Phase 1 defaults so inserts without `workspace_id` still succeed.

### `077_workspace_id_phase1_defaults.sql`

Explicit follow-up that sets each workspace-aware column default to the Unit311 Central Internal workspace UUID so current application inserts continue working without query or API changes.

### `078_workspace_foundation_tables.sql`

Creates foundation tables and Unit311 Central defaults:

| Table | Action |
| --- | --- |
| `workspace_settings` | Created + Internal settings seeded |
| `workspace_modules` | Created + Internal module keys seeded (`enabled = true`) |
| `workspace_users` | Created only (empty; no auth migration) |
| `workspace_audit_log` | Created + foundation seed audit event |

### `079_provision_workspace_function.sql`

Adds database function `public.provision_workspace(company_name, workspace_slug)` as the foundation for future customer onboarding.

Also scopes `file_categories` uniqueness to `(workspace_id, name)` so each workspace can own the same default category labels (replaces the previous global unique on `name`).

**Behaviour (single transaction; full rollback on any failure)**

1. Create a `workspaces` row (`workspace_type = Customer`, `status = Active`).
2. Insert default `workspace_settings` (mirrors Unit311 Central Internal defaults; `logo_url` left null).
3. Copy all `enabled = true` rows from Unit311 Central (`slug = unit311`) into `workspace_modules`.
4. Seed default file structure stored in the database:
   - Copy `file_categories` from Internal (file-type labels only).
   - Create structural root `file_folders`: `External Files` (`external_scope = true`) and `Client Invoices`.
   - Does **not** copy Internal operational folders, client folders, or files.
5. Insert `workspace_audit_log` with `event_type = workspace_created`.
6. Return the new `workspace_id`.

**Explicitly out of scope for this function**

- Users / `workspace_users`
- Authentication records
- Client / CRM / operational data
- Subdomains
- Emails
- Application, UI, or auth behaviour

Call example:

```sql
select public.provision_workspace('Acme Aviation', 'acme-aviation');
```

### Explicitly not done yet

- No Row Level Security
- No query filtering by `workspace_id`
- No auth / session workspace binding
- No UI workspace switcher
- No application call-site for `provision_workspace()`
- No changes to Internal-only tables
- No population of `workspace_users` from existing auth directories

---

## Future phases required before customer onboarding

Complete these before enabling real customer workspaces in production:

### Phase 2 — Application workspace context

- Resolve active workspace for every write/read path that touches workspace-aware tables.
- Stop relying on column defaults for customer traffic.
- Keep Internal dashboard on `slug = unit311`.

### Phase 3 — Tenant isolation

- Scope all workspace-aware queries/mutations by `workspace_id`.
- Add automated tests proving Customer A cannot read Customer B data.
- Decide and implement RLS only after query/auth context is correct.

### Phase 4 — Customer workspace provisioning

- Call `provision_workspace()` from the onboarding path (or a thin service wrapper).
- Add owner `workspace_users` and bind `platform_organisations` / `platform_users` to that workspace.
- Seed only required customer data (never Internal CRM/Discovery/Messaging/Operators).

### Phase 5 — Onboarding & cutover

- Signup → payment → provisioning uses customer `workspace_id`.
- Operational runbooks for support and backups.
- Confirm Internal tables remain invisible to customers.

---

## Development rules

1. Use project `kkxtvzxqmbacjatkiupq` only.
2. Do not create another production Supabase project for tenancy.
3. Do not put customer data into Internal-only tables.
4. Do not enable RLS until workspace context exists in application code.
5. Treat this document as the source of truth for future workspace work.
6. Prefer additive migrations; never silently rewrite production tenancy.

---

## Current status

| Item | Status |
| --- | --- |
| `workspaces` registry | Live |
| Internal workspace `unit311` | Live |
| `workspace_id` on workspace-aware tables | Live, `NOT NULL`, indexed, FK’d |
| Existing rows backfilled | Complete (zero nulls) |
| Inserts without `workspace_id` | Still work via DB default → Internal |
| `workspace_settings` | Live + Internal seeded |
| `workspace_modules` | Live + Internal seeded (21 modules) |
| `workspace_users` | Live (empty; no auth migration) |
| `workspace_audit_log` | Live + foundation seed event |
| Application workspace-aware | **Not started** |
| Customer onboarding to own workspace | **Not started** |
| RLS | **Not enabled** |

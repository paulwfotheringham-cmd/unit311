# Contributing

This repository is the long-term home of Unit311 Central and all customer workspaces. Keep changes focused, reviewable, and safe for a shared production database.

## Ground rules

1. **One repo.** Do not split tenant code into another repository.
2. **One production database.** Use Supabase project Unit311 Central only.
3. **Additive migrations.** Prefer new migration files; never rewrite applied production SQL silently.
4. **No secrets in git.** Use `.env.local` / Vercel. Never commit PEMs, tokens, or env dumps.
5. **Scope control.** Change only what the task requires (same spirit as the product coding standards).

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Read:

- [README.md](./README.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [docs/WORKSPACE_ARCHITECTURE.md](./docs/WORKSPACE_ARCHITECTURE.md) before touching tenancy

## Branching & PRs

- Branch from `main`.
- Prefer small PRs with a clear purpose (routing, CRM, billing, docs, …).
- Describe **why** in the PR body; link related issues if any.
- Call out migration files and any Vercel/domain follow-up.

## Code layout conventions

| Concern | Put it in |
| --- | --- |
| Route / page | `src/app/...` |
| Reusable UI | `src/components/...` |
| Domain / DB / integrations | `src/lib/...` |
| Host routing | `src/middleware.ts`, `src/lib/app-domains.ts` |
| SQL | `supabase/migrations/NNN_description.sql` |
| One-off ops scripts | `scripts/` (never `scripts/_*.mjs` dump helpers) |

Ops UI components still live under `src/components/testflighthub/` for historical reasons. Prefer extending that folder over inventing a parallel dashboard tree until a deliberate rename is planned.

## Migrations

1. Add a new file under `supabase/migrations/` with the next number.
2. Make it idempotent where practical (`if not exists`, guarded inserts).
3. Document workspace impact in `docs/WORKSPACE_ARCHITECTURE.md` when relevant.
4. Apply to production via the approved ops path (see [DEPLOYMENT.md](./DEPLOYMENT.md)).

## What not to do

- Commit `.env*`, `wise-keys/`, `*.pem`, `*.tmp`, deploy logs
- Create a second Supabase project “for customers”
- Put customer data into Internal-only tables (CRM / Discovery / Internal Messaging / Operators)
- Enable RLS before application workspace context exists
- Land secret-dump or `_inspect-*` scripts

## Checks before opening a PR

```bash
npm run lint
npm run build
```

Add focused tests when changing critical money, auth, or tenancy paths (expand coverage over time).

## Documentation

- Behavioural architecture → update `ARCHITECTURE.md` and/or `docs/WORKSPACE_ARCHITECTURE.md`
- Deploy / domain process → `DEPLOYMENT.md`
- Repository layout / module map → `docs/GITHUB_ARCHITECTURE.md` (then `npm run diagram:github-architecture`)
- Long-lived debt → append a short note to `docs/TECHNICAL_DEBT.md`

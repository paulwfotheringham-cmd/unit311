# Production deployment & rollback (Unit311 Central)

## Canonical source

| Item | Value |
| --- | --- |
| GitHub repository | **`Unit311central/unit311central`** |
| Local folder | `Desktop\unit311` only |
| Vercel project | `unit311central` (`prj_lyDcefpA3tnfzWLiZ9Ui0xVk6nJD`) |
| Production branch | `main` |
| Known-good recovery deployment | `dpl_98yEC1z5opp5ad7NXhk6G4EePPJ9` |

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
3. Preferred recovery target after the Jul 2026 incident:  
   **`dpl_98yEC1z5opp5ad7NXhk6G4EePPJ9`**
4. Verify after rollback:
   - `unit311central.com`
   - `internal.unit311central.com`
   - `*.unit311central.com`
   all point at the rolled-back deployment ID
5. Confirm HTML / `_next` assets match that deployment (not a later CLI deploy).

Example (Vercel CLI promote of an existing deployment — does not rebuild):

```bash
npx vercel promote dpl_98yEC1z5opp5ad7NXhk6G4EePPJ9 --scope paul-fs-projects-9f603a39 --yes
```

## Forbidden

- `npx vercel --prod` from `Desktop\onwardair`
- Linking `onwardair` to Vercel project `unit311central`
- Deploying uncommitted local changes as production
- Treating `paulwfotheringham-cmd/onwardair` as the Unit311 Central app source

## Related docs

- [DEPLOYMENT.md](../DEPLOYMENT.md) — domains, env, migrations
- [ARCHITECTURE.md](../ARCHITECTURE.md) — host / tenancy model

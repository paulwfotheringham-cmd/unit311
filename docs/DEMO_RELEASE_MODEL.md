# Demo release model

**Rule:** Demo is not a fork, not a second app, and not a place where development happens.

Demo is the **latest stable release of Internal** — same Git commit, same Vercel deployment, same codebase. The only intentional differences are workspace content, configuration, and optional feature visibility.

---

## Architecture (one build)

| Layer | Internal | Demo |
| --- | --- | --- |
| Code | `Unit311central/unit311central` `main` | **Same** |
| Deploy | Vercel project `unit311central` | **Same deployment** |
| Host | `internal.unit311central.com` | `demo.unit311central.com` |
| Workspace | slug `unit311` (live ops data) | slug `demo` (curated content) |
| UI | Internal Operations | **Same Internal Operations UI** |

Host → surface → workspace is resolved in:

- `src/lib/app-domains.ts` / `src/lib/runtime-surface.ts`
- `src/middleware.ts`
- `src/lib/workspace-context.ts`
- `src/lib/workspace-authorization.ts` (internal operators may access Demo)

Optional Demo-only visibility (not a code fork):

```bash
DEMO_VISIBLE_MODULES=clients,crm,file-explorer
DEMO_WORKSPACE_SLUG=demo
```

Unset `DEMO_VISIBLE_MODULES` ⇒ Demo shows the same modules as Internal.

---

## Promotion workflow

```
Development (Internal only)
    → Verification (on Internal / preview)
    → Module Go-Live Ready
    → Deploy (Git → main → Vercel)
    → Demo updated (same build; refresh Demo content)
```

| Step | What you do |
| --- | --- |
| 1. Development | Build and fix only against Internal |
| 2. Verification | Exercise the change on Internal (or a PR preview of the same app) |
| 3. Module Go-Live | Mark capability Ready when Definition of Done is met |
| 4. Deploy | Merge/push to `main` (canonical repo). One production build serves apex, Internal, and Demo |
| 5. Demo updated | After deploy: refresh curated Demo data; open Demo host; walk the sales journey |

---

## Before a customer call

1. **Deploy** the latest approved `main` (if not already live).
2. **Refresh Demo content:**

   ```bash
   SUPABASE_ACCESS_TOKEN=… npm run demo:refresh
   ```

3. **Verify** the journey on `https://demo.unit311central.com` (login as an internal operator).

You must never recreate features in Demo. If Demo is missing behaviour, the build is behind — deploy Internal’s approved release.

---

## Ops checklist

- [ ] DNS / Vercel domain: `demo.unit311central.com` → same project as Internal
- [ ] Migration `097_demo_workspace.sql` applied
- [ ] `npm run demo:verify` passes in CI/local
- [ ] After each release that affects the demo journey: `npm run demo:refresh`

---

## What is forbidden

- Long-lived Demo branch or Demo-only app
- Shipping unfinished work to Demo via a separate codebase
- Pointing Demo at a different application build than Internal
- Treating live Internal production data as the Demo tenant (use the Demo workspace)

---

## Related

- Module Go-Live: Internal → Unit311 Details / Module Go-Live
- Deploy: [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
- Hosts: [VERCEL_ARCHITECTURE.md](./VERCEL_ARCHITECTURE.md)

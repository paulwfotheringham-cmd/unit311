/**
 * Verify Demo release surface wiring (no network deploy required).
 * Checks code constants and that reserved host/slug stay aligned.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const appDomains = read("src/lib/app-domains.ts");
assert.match(appDomains, /DEMO_SITE_HOST/);
assert.match(appDomains, /DEMO_WORKSPACE_SLUG\s*=\s*"demo"/);
assert.match(appDomains, /"demo"/);

const middleware = read("src/middleware.ts");
assert.match(middleware, /isDemoDomainHost/);
assert.match(middleware, /x-unit311-demo/);

const authz = read("src/lib/workspace-authorization.ts");
assert.match(authz, /internal_demo/);

const surface = read("src/lib/runtime-surface.ts");
assert.match(surface, /resolveRuntimeSurface/);
assert.match(surface, /isModuleVisibleOnSurface/);

const migration = read("supabase/migrations/097_demo_workspace.sql");
assert.match(migration, /slug = 'demo'/);

const allowlist = read("src/app/api/internal/apply-unit311central-pending-migrations/route.ts");
assert.match(allowlist, /097_demo_workspace\.sql/);

const releaseDoc = read("docs/DEMO_RELEASE_MODEL.md");
assert.match(releaseDoc, /Development/);
assert.match(releaseDoc, /Module Go-Live/);
assert.match(releaseDoc, /demo\.unit311central\.com/);

console.log("verify-demo-release: OK");

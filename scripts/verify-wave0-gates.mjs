/**
 * Wave 0 closeout verification (no network / no DB required).
 * Run: node scripts/verify-wave0-gates.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let failures = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures += 1;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(path);
  }
  return out;
}

// 1) Domain derivation — Ready/In Progress/Not Started never persisted as status
const domainData = readFileSync(join(root, "src/lib/domain-go-live-data.ts"), "utf8");
const domainApi = readFileSync(join(root, "src/app/api/domain-go-live/route.ts"), "utf8");
const domainService = readFileSync(join(root, "src/lib/domain-go-live-service.ts"), "utf8");

if (!domainData.includes("deriveDomainStatus")) fail("deriveDomainStatus missing");
else ok("deriveDomainStatus present");

if (!domainData.includes('status: DomainGoLiveDisplayStatus = blocked ? "Blocked" : derivedStatus')) {
  fail("display status must be Blocked override else derived");
} else ok("display status = Blocked | derived");

if (!domainApi.includes('body.status !== undefined')) {
  fail("API must reject direct status writes");
} else ok("domain-go-live PATCH rejects status field");

if (domainService.includes('status: "Ready"') || domainService.includes("status: 'Ready'")) {
  fail("domain service must not write Ready status");
} else ok("domain service does not persist Ready");

const serializeBlock = domainData.slice(
  domainData.indexOf("serializeDomainGoLiveOverrides"),
  domainData.indexOf("export function domainGoLiveStatusClass"),
);
if (serializeBlock.includes("derivedStatus") || /status:\s*row\.status/.test(serializeBlock)) {
  fail("serialize must persist overrides only (blocked/reason/notes)");
} else ok("serialize persists blocked/reason/notes only");

// Coverage: every MODULE id in DOMAIN catalogue once
const modMatches = [...readFileSync(join(root, "src/lib/module-go-live-data.ts"), "utf8").matchAll(/id: "(MOD-\d+)"/g)].map(
  (m) => m[1],
);
const domainModMatches = [...domainData.matchAll(/"MOD-\d+"/g)].map((m) => m[0].replace(/"/g, ""));
const uniqueDomainMods = new Set(domainModMatches);
if (uniqueDomainMods.size !== modMatches.length) {
  fail(
    `module/domain coverage mismatch: modules=${modMatches.length} domainRefs=${uniqueDomainMods.size}`,
  );
} else ok(`module↔domain coverage: ${modMatches.length} modules, 1:1`);

const dupes = domainModMatches.filter((id, i) => domainModMatches.indexOf(id) !== i);
if (dupes.length) fail(`duplicate domain module refs: ${[...new Set(dupes)].join(", ")}`);
else ok("no duplicate module→domain mappings");

if (!domainData.includes('"MOD-100"') || !domainData.includes("DOM-12")) {
  fail("MOD-100 must belong to DOM-12");
} else ok("MOD-100 mapped to DOM-12");

// 2) Credentials never returned on HTTP integration routes
const apiRoot = join(root, "src/app/api/integrations");
const apiFiles = walk(apiRoot);
for (const file of apiFiles) {
  const src = readFileSync(file, "utf8");
  if (src.includes("getConnectionCredentials")) {
    fail(`${file} must not call getConnectionCredentials`);
  }
  if (src.includes("decryptIntegrationCredentials")) {
    fail(`${file} must not call decryptIntegrationCredentials`);
  }
  if (src.includes("credentials_encrypted")) {
    fail(`${file} must not reference credentials_encrypted`);
  }
  // Response JSON must not echo credentials body
  if (/NextResponse\.json\([\s\S]*credentials\s*:/.test(src) && !src.includes("body.credentials")) {
    fail(`${file} may be returning credentials in JSON`);
  }
}
ok(`scanned ${apiFiles.length} integration API files — no decrypt/credential leak helpers`);

const putRoute = readFileSync(
  join(root, "src/app/api/integrations/connections/[providerCode]/route.ts"),
  "utf8",
);
if (!putRoute.includes("credentials: body.credentials")) {
  fail("PUT should accept credentials write-only");
} else ok("PUT accepts credentials write-only");
if (!putRoute.includes("return NextResponse.json({ connection })")) {
  fail("PUT/GET should return connection public shape");
} else ok("responses return connection object (public mapper)");

const mapper = readFileSync(join(root, "src/lib/integration-framework-service.ts"), "utf8");
if (!mapper.includes("credentialsSet: Boolean(row.credentials_encrypted)")) {
  fail("public mapper must expose credentialsSet only");
} else ok("public mapper exposes credentialsSet boolean only");
if (!mapper.includes("export async function getConnectionCredentials")) {
  fail("framework-internal getConnectionCredentials missing");
} else ok("getConnectionCredentials exists (framework-internal)");

// 3) Crypto key isolation
const crypto = readFileSync(join(root, "src/lib/integration-credentials-crypto.ts"), "utf8");
if (crypto.includes("AUTH_SECRET") && crypto.includes("process.env.AUTH_SECRET")) {
  fail("crypto must not read AUTH_SECRET");
} else ok("crypto does not use AUTH_SECRET env");
if (!crypto.includes("INTEGRATION_CREDENTIALS_SECRET")) {
  fail("INTEGRATION_CREDENTIALS_SECRET required");
} else ok("INTEGRATION_CREDENTIALS_SECRET used");
if (!crypto.includes("credentials_key_id") && !crypto.includes("KEY_ID") && !crypto.includes("keyId")) {
  fail("key id / rotation support missing");
} else ok("key id rotation support present");

// 4) Deploy docs
const deploy = readFileSync(join(root, "DEPLOYMENT.md"), "utf8");
const prodDeploy = readFileSync(join(root, "docs/PRODUCTION_DEPLOYMENT.md"), "utf8");
if (!deploy.includes("INTEGRATION_CREDENTIALS_SECRET")) {
  fail("DEPLOYMENT.md missing INTEGRATION_CREDENTIALS_SECRET");
} else ok("DEPLOYMENT.md documents INTEGRATION_CREDENTIALS_SECRET");
if (!prodDeploy.includes("INTEGRATION_CREDENTIALS_SECRET")) {
  fail("PRODUCTION_DEPLOYMENT.md missing INTEGRATION_CREDENTIALS_SECRET");
} else ok("PRODUCTION_DEPLOYMENT.md documents INTEGRATION_CREDENTIALS_SECRET");
if (!prodDeploy.includes("093_integration_framework_phase0")) {
  fail("PRODUCTION_DEPLOYMENT.md should list migration 093");
} else ok("PRODUCTION_DEPLOYMENT.md lists migration 093");

if (failures > 0) {
  console.error(`\nWave 0 gates: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\nWave 0 gates: ALL PASSED");

/**
 * End-to-end verification for:
 * "Create a new client called Acme Engineering Ltd in London."
 *
 * Run from unit311 root:
 *   npx tsx scripts/verify-create-client-e2e.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import {
  extractBusinessEntity,
  resolveBusinessActionIntent,
} from "../src/lib/ai-operating-assistant/intent-action-resolver";
import { registerClientsActions } from "../src/lib/ai-operating-assistant/actions/modules/clients/register";
import { getAssistantAction } from "../src/lib/ai-operating-assistant/actions/registry";
import { formatExecutedClientOutcome } from "../src/lib/ai-operating-assistant/action-ui-messages";
import { clientsScopeFromBusiness } from "../src/lib/ai-operating-assistant/actions/modules/clients/helpers";
import type { AssistantBusinessContext } from "../src/lib/ai-operating-assistant/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile(filePath: string, options?: { overwriteWeak?: boolean }) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Skip linked/empty placeholders (e.g. "[]", "", "env_…", "[SENSITIVE]")
    if (
      !value ||
      value.length < 8 ||
      value.startsWith("env_") ||
      value.includes("SENSITIVE")
    ) {
      continue;
    }
    const existing = process.env[key];
    if (!existing) {
      process.env[key] = value;
      continue;
    }
    if (options?.overwriteWeak && existing.length < 8) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(root, ".env.bcn-dev.tmp"), { overwriteWeak: true });
loadEnvFile(path.join(root, ".env.bcn-live.tmp"), { overwriteWeak: true });
loadEnvFile(path.join(root, ".env.vercel.pull"), { overwriteWeak: true });
loadEnvFile(path.join(root, ".env.unit311central.runtime"));
loadEnvFile(path.join(root, ".env.local"), { overwriteWeak: true });
loadEnvFile(path.join(root, ".env"), { overwriteWeak: true });

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function pass(stage: string) {
  console.log(`✓ ${stage}`);
}

async function main() {
  const USER_MESSAGE = "Create a new client called Acme Engineering Ltd in London.";
  const stages: string[] = [];

  registerClientsActions();

  const entity = extractBusinessEntity(USER_MESSAGE);
  assert(entity === "Acme Engineering Ltd", `entity expected Acme Engineering Ltd, got ${entity}`);
  pass("Intent recognised / entity extracted");
  stages.push("intent");

  const emptyScope = clientsScopeFromBusiness({
    user: { id: "u1", username: "u", displayName: "u", userType: "internal" },
    organisation: { id: null, name: null },
    workspace: { id: null, name: "x", slug: null },
    page: { activeView: "clients", label: "Clients", pathname: null },
    selection: {
      clientId: null,
      clientName: null,
      projectId: null,
      projectName: null,
      employeeId: null,
      employeeName: null,
      contractId: null,
      contractName: null,
      fileId: null,
      fileName: null,
    },
    permissions: {
      roleView: "c-suite",
      canAccessFinancials: true,
      canAccessUsers: true,
      canAccessStrategy: true,
      canAccessHr: true,
    },
    generatedAt: new Date().toISOString(),
  });
  assert(
    emptyScope.workspaceId == null || emptyScope.workspaceId === "",
    "empty workspace must be allowed (session resolve later)",
  );
  pass("Workspace scope blocker removed");

  const business: AssistantBusinessContext = {
    user: { id: "verify-user", username: "verify", displayName: "Verify", userType: "internal" },
    organisation: { id: null, name: null },
    workspace: { id: null, name: "Unit311 Central", slug: "unit311" },
    page: { activeView: "clients", label: "Clients", pathname: null },
    selection: {
      clientId: null,
      clientName: null,
      projectId: null,
      projectName: null,
      employeeId: null,
      employeeName: null,
      contractId: null,
      contractName: null,
      fileId: null,
      fileName: null,
    },
    permissions: {
      roleView: "c-suite",
      canAccessFinancials: true,
      canAccessUsers: true,
      canAccessStrategy: true,
      canAccessHr: true,
    },
    generatedAt: new Date().toISOString(),
  };

  const intent = await resolveBusinessActionIntent(USER_MESSAGE, business);
  assert(intent.kind === "propose", `expected propose, got ${JSON.stringify(intent)}`);
  assert(
    intent.actionId === "clients.createClient",
    `expected clients.createClient, got ${"actionId" in intent ? intent.actionId : "?"}`,
  );
  assert(
    intent.input?.companyName === "Acme Engineering Ltd",
    `companyName missing: ${JSON.stringify(intent.input)}`,
  );
  assert(
    intent.input?.companyCity === "London",
    `companyCity expected London, got ${JSON.stringify(intent.input)}`,
  );
  pass("Action resolved (clients.createClient + London)");
  stages.push("action");

  const definition = getAssistantAction("clients.createClient");
  assert(definition, "clients.createClient not registered");

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Production createInternalClient uses the anon server client — anon is enough when RLS allows.
  const writeKey = serviceKey && serviceKey.length > 40 ? serviceKey : anonKey;
  assert(url && writeKey, "SUPABASE_URL + SUPABASE_ANON_KEY (or service role) required for DB verify");
  assert(url.startsWith("https://"), `SUPABASE_URL invalid: ${url.slice(0, 24)}`);
  console.log("Using Supabase host:", new URL(url).host);
  if (!process.env.SUPABASE_URL && url) process.env.SUPABASE_URL = url;
  if (!process.env.SUPABASE_ANON_KEY && anonKey) process.env.SUPABASE_ANON_KEY = anonKey;

  const supabase = createClient(url!, writeKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: workspaces, error: wsError } = await supabase
    .from("workspaces")
    .select("id, slug, name")
    .eq("slug", "unit311")
    .limit(1);
  assert(!wsError, `workspace lookup failed: ${wsError?.message}`);
  let workspaceId = workspaces?.[0]?.id as string | undefined;
  if (!workspaceId) {
    const { data: anyWs, error: anyErr } = await supabase
      .from("workspaces")
      .select("id, slug, name")
      .limit(1);
    assert(!anyErr && anyWs?.[0]?.id, `no workspace found: ${anyErr?.message}`);
    workspaceId = anyWs![0]!.id as string;
  }
  pass(`Workspace resolved (${workspaceId})`);
  business.workspace.id = workspaceId!;

  const ctx = {
    business,
    planId: `plan_verify_${Date.now()}`,
    stepId: "step_verify_1",
    priorOutputs: {} as Record<string, Record<string, unknown>>,
  };
  const validation = await definition!.handler.validate(intent.input, ctx);
  assert(validation.ok, `validate failed: ${validation.errors?.join("; ")}`);
  const preview = await definition!.handler.preview(intent.input, ctx);
  assert(preview?.summary, "preview missing summary");
  pass("Plan created (validate + preview ok)");
  stages.push("plan");

  const uniqueName = `Acme Engineering Ltd VERIFY ${Date.now().toString(36)}`;
  const executeInput = { ...intent.input, companyName: uniqueName };
  const result = await definition!.handler.execute(executeInput, ctx);
  assert(result.ok, `execute failed: ${result.message || result.error}`);
  assert(result.recordId, "execute did not return recordId");
  pass(`Approve executes / clients.createClient called (${result.recordId})`);
  stages.push("execute");

  const { data: row, error: rowError } = await supabase
    .from("internal_clients")
    .select("id, company_name, company_city, workspace_id, region")
    .eq("id", result.recordId)
    .maybeSingle();
  assert(!rowError, `db read failed: ${rowError?.message}`);
  assert(row?.id === result.recordId, "row not found after insert");
  assert(row!.company_name === uniqueName, `name mismatch: ${row!.company_name}`);
  pass("Database insert succeeds");
  stages.push("db");

  const { data: listed, error: listError } = await supabase
    .from("internal_clients")
    .select("id, company_name")
    .eq("workspace_id", workspaceId!)
    .eq("id", result.recordId);
  assert(!listError, `directory list failed: ${listError?.message}`);
  assert(
    listed?.some((c) => c.id === result.recordId),
    "Client not visible in Client Directory query",
  );
  pass("Client visible in Client Directory");
  stages.push("directory");

  const outcome = formatExecutedClientOutcome({
    companyName: "Acme Engineering Ltd",
    location: "London",
    clientId: result.recordId,
  });
  const expected = [
    "✓ Client created",
    "",
    "Name",
    "Acme Engineering Ltd",
    "",
    "Location",
    "London",
    "",
    "Open Client",
    "",
    "Would you like to add a contact, billing details or an account manager?",
  ].join("\n");
  assert(outcome === expected, `outcome mismatch:\n---\n${outcome}\n---\n${expected}\n---`);
  pass("Success response returned");
  stages.push("response");

  await supabase.from("internal_clients").delete().eq("id", result.recordId);

  console.log("\nALL STAGES PASSED:", stages.join(" → "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

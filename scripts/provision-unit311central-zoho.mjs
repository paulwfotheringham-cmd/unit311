import { execSync } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PRODUCTION = "https://unit311central.com";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const infoPassword = requireEnv("ZOHO_INFO_PASSWORD");
const paulPassword = requireEnv("ZOHO_PAUL_PASSWORD");
const adminPassword = process.env.ZOHO_ADMIN_PASSWORD?.trim() || null;

const MAILBOXES = [
  { account_id: "info", email: "info@unit311central.com", password: infoPassword },
  { account_id: "paul", email: "paul@unit311central.com", password: paulPassword },
  ...(adminPassword
    ? [{ account_id: "admin", email: "admin@unit311central.com", password: adminPassword }]
    : []),
];

const ENV_VARS = {
  ZOHO_IMAP_HOST: process.env.ZOHO_IMAP_HOST?.trim() || "imap.zoho.eu",
  ZOHO_IMAP_PORT: process.env.ZOHO_IMAP_PORT?.trim() || "993",
  ZOHO_SMTP_HOST: process.env.ZOHO_SMTP_HOST?.trim() || "smtp.zoho.eu",
  ZOHO_SMTP_PORT: process.env.ZOHO_SMTP_PORT?.trim() || "465",
  ZOHO_INFO_EMAIL: "info@unit311central.com",
  ZOHO_INFO_PASSWORD: infoPassword,
  ZOHO_PAUL_EMAIL: "paul@unit311central.com",
  ZOHO_PAUL_PASSWORD: paulPassword,
  ...(adminPassword
    ? {
        ZOHO_ADMIN_EMAIL: "admin@unit311central.com",
        ZOHO_ADMIN_PASSWORD: adminPassword,
      }
    : {}),
};

function run(cmd, cwd = ROOT) {
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

function setEnv(key, value) {
  const tmp = join(ROOT, `.env-${key}.tmp`);
  writeFileSync(tmp, value, "utf8");
  try {
    run(`cmd /c type "${tmp}" | npx vercel env add ${key} production --force --yes`);
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}

async function saveCredentialsViaApi() {
  for (const mailbox of MAILBOXES) {
    const response = await fetch(`${PRODUCTION}/api/email/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: mailbox.account_id,
        email: mailbox.email,
        password: mailbox.password,
      }),
    });
    const body = await response.json().catch(() => null);
    console.log(`credentials ${mailbox.account_id}:`, response.status, body?.ok ?? body?.error ?? body);
  }
}

async function testMailbox(account) {
  const response = await fetch(`${PRODUCTION}/api/email/test?account=${account}`, {
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  console.log(`test ${account}:`, JSON.stringify(body, null, 2));
  return response.ok && body?.ok;
}

async function main() {
  run("npx vercel link --project unit311central --yes");

  console.log("Setting Zoho env vars on unit311central…");
  for (const [key, value] of Object.entries(ENV_VARS)) {
    setEnv(key, value);
  }

  console.log("Deploying unit311central…");
  run("npx vercel --prod --yes");

  console.log("Waiting for deployment…");
  await new Promise((resolve) => setTimeout(resolve, 25000));

  console.log("Saving mailbox credentials via API…");
  await saveCredentialsViaApi();

  const infoOk = await testMailbox("info");
  const paulOk = await testMailbox("paul");
  const adminOk = adminPassword ? await testMailbox("admin") : true;
  if (!infoOk || !paulOk || !adminOk) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import { createPrivateKey, createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const envFiles = [
  ".env.wise-verify.tmp",
  ".env.local",
  ".env.vercel.production",
  ".env.unit311central.prod",
];
for (const file of envFiles) {
  loadEnvFile(resolve(process.cwd(), file));
}

const WISE_API_BASE = (process.env.WISE_API_BASE_URL ?? "https://api.wise.com").replace(/\/$/, "");
const token = process.env.WISE_API_TOKEN?.trim();
const profileId = process.env.WISE_PROFILE_ID?.trim();
const privateKeyRaw = process.env.WISE_API_PRIVATE_KEY?.trim() ?? process.env.WISE_PRIVATE_KEY?.trim();

function normalizePrivateKeyPem(raw) {
  let key = raw.trim().replace(/\\n/g, "\n");
  if (!key.includes("BEGIN") && /^[A-Za-z0-9+/=\s-]+$/.test(key)) {
    try {
      const decoded = Buffer.from(key.replace(/\s/g, ""), "base64").toString("utf8");
      if (decoded.includes("BEGIN")) key = decoded.trim();
    } catch {
      // ignore
    }
  }
  return key;
}

function signOneTimeToken(oneTimeToken, privateKeyPem) {
  const privateKey = createPrivateKey(privateKeyPem);
  return createSign("RSA-SHA256").update(oneTimeToken, "utf8").sign(privateKey, "base64");
}

async function wiseGet(path, scaHeaders = null) {
  const requestUrl = `${WISE_API_BASE}${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (scaHeaders) {
    headers["x-2fa-approval"] = scaHeaders.oneTimeToken;
    headers["X-Signature"] = scaHeaders.signature;
  }

  const response = await fetch(requestUrl, { headers, cache: "no-store" });
  const bodyText = await response.text();
  const responseHeaders = {
    "x-2fa-approval-result": response.headers.get("x-2fa-approval-result"),
    "x-2fa-approval": response.headers.get("x-2fa-approval"),
  };

  console.log("[verify-wise-statements]", {
    requestUrl,
    requestSigningApplied: Boolean(scaHeaders),
    responseStatus: response.status,
    responseHeaders,
    responseBody: bodyText,
  });

  return { response, bodyText, responseHeaders };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!token) fail("WISE_API_TOKEN is not set.");
if (!profileId) fail("WISE_PROFILE_ID is not set.");
if (!privateKeyRaw) fail("WISE_API_PRIVATE_KEY is not set.");

let privateKeyPem;
try {
  privateKeyPem = normalizePrivateKeyPem(privateKeyRaw);
  createPrivateKey(privateKeyPem);
} catch (error) {
  fail(`WISE_API_PRIVATE_KEY could not be parsed: ${error instanceof Error ? error.message : error}`);
}

const balancesResponse = await wiseGet(`/v4/profiles/${profileId}/balances?types=STANDARD,SAVINGS`);
if (!balancesResponse.response.ok) {
  fail(`Balance list failed with HTTP ${balancesResponse.response.status}`);
}

const balances = JSON.parse(balancesResponse.bodyText);
const balance = Array.isArray(balances) ? balances[0] : balances.balances?.[0];
if (!balance) fail("No balances returned from Wise.");

const intervalStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
const intervalEnd = new Date().toISOString();
const params = new URLSearchParams({
  currency: balance.currency,
  intervalStart,
  intervalEnd,
  type: "COMPACT",
});
const statementPath = `/v1/profiles/${profileId}/balance-statements/${balance.id}/statement.json?${params.toString()}`;

let statementAttempt = await wiseGet(statementPath);
if (statementAttempt.response.status === 403 && statementAttempt.responseHeaders["x-2fa-approval"]) {
  const oneTimeToken = statementAttempt.responseHeaders["x-2fa-approval"];
  const signature = signOneTimeToken(oneTimeToken, privateKeyPem);
  statementAttempt = await wiseGet(statementPath, { oneTimeToken, signature });
}

if (!statementAttempt.response.ok) {
  fail(`Balance statement failed with HTTP ${statementAttempt.response.status}`);
}

const statement = JSON.parse(statementAttempt.bodyText);
const transactionCount = Array.isArray(statement.transactions) ? statement.transactions.length : 0;
console.log(
  `OK: ${balance.currency} balance ${balance.id} returned ${transactionCount} transactions in the last 14 days.`,
);

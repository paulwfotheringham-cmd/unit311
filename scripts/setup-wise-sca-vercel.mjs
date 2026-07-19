import { execSync } from "node:child_process";
import { createHash, createPublicKey, generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT = "unit311central";
const outputDir = resolve(process.cwd(), "wise-keys");
const privatePath = resolve(outputDir, "wise-private.pem");
const publicPath = resolve(outputDir, "wise-public.pem");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", shell: true });
}

function setEnvValue(key, value, target = "production") {
  const tmp = resolve(process.cwd(), `.env-${key}.tmp`);
  writeFileSync(tmp, value, "utf8");
  try {
    run(`cmd /c type "${tmp}" | npx vercel env add ${key} ${target} --force --yes`);
    console.log(`Set ${key} on ${target}`);
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}

mkdirSync(outputDir, { recursive: true });

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
});

writeFileSync(privatePath, privateKey, { encoding: "utf8", mode: 0o600 });
writeFileSync(publicPath, publicKey, { encoding: "utf8", mode: 0o644 });

const fingerprint = createHash("sha256")
  .update(createPublicKey(publicKey).export({ type: "spki", format: "der" }))
  .digest("hex")
  .slice(0, 16);

const privateKeyB64 = Buffer.from(privateKey, "utf8").toString("base64");

console.log("");
console.log("Generated Wise SCA RSA key pair:");
console.log(`  Private: ${privatePath}`);
console.log(`  Public:  ${publicPath}`);
console.log(`  Fingerprint: ${fingerprint}`);
console.log("");
console.log("Next steps:");
console.log("1. Upload wise-public.pem in Wise → API tokens → Manage public keys (same token as WISE_API_TOKEN).");
console.log("2. This script will set WISE_API_PRIVATE_KEY_B64 on Vercel production.");
console.log("3. Redeploy unit311central and test statement access in Treasury.");
console.log("");

run(`npx vercel link --project ${PROJECT} --yes`);
setEnvValue("WISE_API_PRIVATE_KEY_B64", privateKeyB64, "production");

console.log("");
console.log("Done. Upload the public key to Wise now, then ship via Git (see docs/PRODUCTION_DEPLOYMENT.md).");
console.log("  Do NOT run: npx vercel deploy --prod");
console.log("  node scripts/assert-canonical-unit311-repo.mjs");

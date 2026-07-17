import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outputDir = resolve(process.cwd(), "wise-keys");
const privatePath = resolve(outputDir, "wise-private.pem");
const publicPath = resolve(outputDir, "wise-public.pem");

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
});

console.log("Generated Wise SCA RSA key pair:");
console.log(`  Private: ${privatePath}`);
console.log(`  Public:  ${publicPath}`);
console.log("");
console.log("Next steps:");
console.log("1. Upload wise-public.pem in Wise → Settings → API tokens → Manage public keys");
console.log("2. Set WISE_API_PRIVATE_KEY on Vercel to the full private.pem contents");
console.log("   (use literal \\n between lines, or paste as multiline in Vercel dashboard)");
console.log("3. Redeploy unit311central and open /api/financials/wise/sca-diagnostic while logged in");

writeFileSync(privatePath, privateKey, { encoding: "utf8", mode: 0o600 });
writeFileSync(publicPath, publicKey, { encoding: "utf8", mode: 0o644 });

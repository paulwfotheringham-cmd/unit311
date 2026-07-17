import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const privatePath = process.argv[2];
const publicPath = process.argv[3];

if (!privatePath || !publicPath) {
  console.error("Usage: node scripts/verify-wise-keypair.mjs <private.pem> <public.pem>");
  process.exit(1);
}

const privatePem = readFileSync(resolve(privatePath), "utf8");
const publicPem = readFileSync(resolve(publicPath), "utf8");
const privateKey = createPrivateKey(privatePem);
const publicKey = createPublicKey(publicPem);
const derivedPublicKey = createPublicKey(privateKey);

const privateSpki = createHash("sha256")
  .update(derivedPublicKey.export({ type: "spki", format: "der" }))
  .digest("hex")
  .slice(0, 16);
const publicSpki = createHash("sha256")
  .update(publicKey.export({ type: "spki", format: "der" }))
  .digest("hex")
  .slice(0, 16);

const ott = "be2f6579-9426-480b-9cb7-d8f1116cc8b9";
const signature = sign("RSA-SHA256", Buffer.from(ott, "ascii"), privateKey);
const valid = verify("RSA-SHA256", Buffer.from(ott, "ascii"), publicKey, signature);

console.log({
  privateFingerprint: privateSpki,
  publicFingerprint: publicSpki,
  fingerprintsMatch: privateSpki === publicSpki,
  localSignatureValid: valid,
  privateKeyFormat: privatePem.includes("BEGIN RSA PRIVATE KEY") ? "pkcs1" : "pkcs8",
});

if (privateSpki !== publicSpki || !valid) {
  process.exit(1);
}

console.log("OK: private and public key are a matching RSA pair.");

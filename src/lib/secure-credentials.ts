import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { getAuthSecret } from "@/lib/platform-auth";

const PURPOSE = "unit311-software-credentials:v1";

export type EncryptedSecret = {
  ciphertext: string;
  nonce: string;
  tag: string;
};

function deriveKey() {
  return createHash("sha256").update(`${PURPOSE}:${getAuthSecret()}`).digest();
}

/** Encrypt a secret for at-rest storage (AES-256-GCM). */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    nonce: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/** Decrypt a secret previously stored with encryptSecret. */
export function decryptSecret(parts: EncryptedSecret): string {
  const iv = Buffer.from(parts.nonce, "base64");
  const tag = Buffer.from(parts.tag, "base64");
  const ciphertext = Buffer.from(parts.ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function hasEncryptedSecret(
  parts: Partial<EncryptedSecret> | null | undefined,
): boolean {
  return Boolean(parts?.ciphertext && parts?.nonce && parts?.tag);
}

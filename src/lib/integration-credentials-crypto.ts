import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Integration Framework credential encryption.
 * Uses INTEGRATION_CREDENTIALS_SECRET only — never AUTH_SECRET.
 * credentials_key_id supports future rotation (e.g. v1 → v2).
 */

const DEFAULT_KEY_ID = "v1";
const SCRYPT_SALT_PREFIX = "unit311-integration-credentials:";

function isProductionRuntime() {
  return (
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
  );
}

export function getIntegrationCredentialsKeyId(): string {
  const configured = process.env.INTEGRATION_CREDENTIALS_KEY_ID?.trim();
  return configured || DEFAULT_KEY_ID;
}

export function requireIntegrationCredentialsSecret(): string {
  const secret = process.env.INTEGRATION_CREDENTIALS_SECRET?.trim();
  if (secret) return secret;

  if (isProductionRuntime()) {
    throw new Error(
      "INTEGRATION_CREDENTIALS_SECRET is required in production to store integration credentials.",
    );
  }

  // Local/dev only — never use AUTH_SECRET.
  return "dev-only-integration-credentials-secret-not-for-production";
}

function deriveKey(secret: string, keyId: string): Buffer {
  return scryptSync(secret, `${SCRYPT_SALT_PREFIX}${keyId}`, 32);
}

export type EncryptedCredentialsPayload = {
  readonly ciphertext: string;
  readonly keyId: string;
};

/**
 * Encrypt JSON-serialisable credential object → storage ciphertext + key id.
 * Format: base64url(iv).base64url(tag).base64url(ciphertext)
 */
export function encryptIntegrationCredentials(
  credentials: Record<string, unknown>,
): EncryptedCredentialsPayload {
  const keyId = getIntegrationCredentialsKeyId();
  const key = deriveKey(requireIntegrationCredentialsSecret(), keyId);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(credentials), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    keyId,
    ciphertext: [
      iv.toString("base64url"),
      tag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join("."),
  };
}

/**
 * Framework-internal decrypt only. Do not call from business modules or HTTP GET handlers.
 */
export function decryptIntegrationCredentials(
  ciphertext: string,
  keyId: string | null | undefined,
): Record<string, unknown> {
  const resolvedKeyId = keyId?.trim() || DEFAULT_KEY_ID;
  const parts = ciphertext.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid integration credentials ciphertext format.");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const key = deriveKey(requireIntegrationCredentialsSecret(), resolvedKeyId);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  const parsed = JSON.parse(decrypted.toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Integration credentials payload must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

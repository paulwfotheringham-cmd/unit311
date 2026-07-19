/**
 * Edge-safe platform session tokens (Web Crypto HMAC-SHA256).
 * Used by middleware — keep this module free of Node builtins.
 *
 * Token format (unchanged): `${base64url(JSON)}.${base64url(HMAC-SHA256(secret, payload))}`
 */

export const PLATFORM_SESSION_COOKIE = "dc_platform_session";
export const PLATFORM_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type PlatformUserType = "internal" | "external";

export type PlatformSession = {
  sub: string;
  username: string;
  displayName: string;
  userType: PlatformUserType;
  redirectPath: string;
  exp: number;
  /**
   * Active workspace claim cache (RC1-C07).
   * Identity is sub/username/userType; membership is authorizeUserForWorkspace;
   * active workspace on customer hosts is derived from the request host after authz.
   */
  workspaceId?: string;
  workspaceSlug?: string;
  workspaceName?: string;
};

function isProductionRuntime() {
  return (
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
  );
}

/**
 * Dedicated secret for HMAC session signing (and related AUTH_SECRET consumers).
 * Never falls back to SUPABASE_ANON_KEY (public client key).
 * Production fails fast when unset; local/dev uses a non-public placeholder.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (isProductionRuntime()) {
    throw new Error(
      "AUTH_SECRET is required in production for session signing. A public key such as SUPABASE_ANON_KEY must not be used.",
    );
  }

  return "unit311-local-dev-auth-secret";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8ToBase64Url(text: string): string {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

function base64UrlToUtf8(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmacSha256Base64Url(secret: string, payload: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createPlatformSessionToken(session: PlatformSession): Promise<string> {
  const payload = utf8ToBase64Url(JSON.stringify(session));
  const signature = await hmacSha256Base64Url(getAuthSecret(), payload);
  return `${payload}.${signature}`;
}

export async function readPlatformSessionToken(
  token: string | undefined | null,
): Promise<PlatformSession | null> {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = await hmacSha256Base64Url(getAuthSecret(), payload);

  try {
    if (
      !timingSafeEqualBytes(
        new TextEncoder().encode(signature),
        new TextEncoder().encode(expected),
      )
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlToUtf8(payload)) as PlatformSession;
    if (!session.exp || session.exp < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

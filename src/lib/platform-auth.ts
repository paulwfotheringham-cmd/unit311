import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

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

export type PlatformUserRecord = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  user_type: PlatformUserType;
  redirect_path: string;
  client_name: string | null;
  is_active: boolean;
  email?: string | null;
  organisation_id?: string | null;
  workspace_id?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizePlatformUsername(username: string) {
  return username.trim().toLowerCase();
}

export function createSignupPlatformUsername(email: string) {
  const normalized = normalizePlatformUsername(email);
  const suffix = randomBytes(4).toString("hex");
  return `${normalized}#${suffix}`;
}

export function hashPlatformPassword(password: string, salt: string) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPlatformPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64).toString("hex");

  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
  } catch {
    return false;
  }
}

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

export function createPlatformSessionToken(session: PlatformSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readPlatformSessionToken(token: string | undefined | null): PlatformSession | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PlatformSession;
    if (!session.exp || session.exp < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function buildPlatformSession(
  user: PlatformUserRecord,
  workspace?: { id: string; slug: string; name: string } | null,
): PlatformSession {
  return {
    sub: user.id,
    username: user.username,
    displayName: user.display_name,
    userType: user.user_type,
    redirectPath: user.redirect_path,
    exp: Date.now() + PLATFORM_SESSION_MAX_AGE_SECONDS * 1000,
    ...(workspace
      ? {
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
          workspaceName: workspace.name,
        }
      : {}),
  };
}

export function generatePlatformPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function hashPlatformPasswordForUser(username: string, password: string) {
  const salt = `${normalizePlatformUsername(username)}-salt-v1`;
  return hashPlatformPassword(password, salt);
}

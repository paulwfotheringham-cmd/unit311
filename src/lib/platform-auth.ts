import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import {
  PLATFORM_SESSION_COOKIE,
  PLATFORM_SESSION_MAX_AGE_SECONDS,
  createPlatformSessionToken,
  getAuthSecret,
  readPlatformSessionToken,
  type PlatformSession,
  type PlatformUserType,
} from "@/lib/platform-session-token";

export {
  PLATFORM_SESSION_COOKIE,
  PLATFORM_SESSION_MAX_AGE_SECONDS,
  createPlatformSessionToken,
  getAuthSecret,
  readPlatformSessionToken,
  type PlatformSession,
  type PlatformUserType,
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

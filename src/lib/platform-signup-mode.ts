import { normalizePlatformUsername } from "@/lib/platform-auth";

/**
 * Development-only repeat signup for the same email address.
 *
 * Signup stores users in Supabase PostgreSQL (`platform_users`), not Supabase Auth
 * (`auth.users`). Production keeps one account per email; local dev can create many.
 */
export function isDevelopmentRepeatSignupEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (process.env.VERCEL_ENV === "production") {
    return false;
  }

  return process.env.DEV_ALLOW_REPEAT_SIGNUP !== "false";
}

/** Always allowed to create unlimited platform accounts (prod + local). */
export const UNLIMITED_SIGNUP_EMAIL = "demo@unit311central.com";

export function isUnlimitedSignupEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return normalizePlatformUsername(email) === UNLIMITED_SIGNUP_EMAIL;
}

/**
 * When true, signup skips the "email already exists" check and generates a unique
 * username suffix so multiple rows can share the same email.
 */
export function allowsRepeatSignupForEmail(email: string | null | undefined): boolean {
  return isUnlimitedSignupEmail(email) || isDevelopmentRepeatSignupEnabled();
}

export function usesUniqueSignupUsernamePerAttempt(email?: string | null): boolean {
  if (email !== undefined && email !== null) {
    return allowsRepeatSignupForEmail(email);
  }
  return isDevelopmentRepeatSignupEnabled();
}

export const DEV_REPEAT_SIGNUP_TEST_EMAIL = "paul.w.fotheringham@gmail.com";

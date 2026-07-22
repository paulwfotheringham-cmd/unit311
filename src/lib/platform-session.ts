import { cache } from "react";
import { cookies } from "next/headers";

import {
  PLATFORM_SESSION_COOKIE,
  readPlatformSessionToken,
  type PlatformSession,
} from "@/lib/platform-session-token";

export type { PlatformSession };

/**
 * Deduped per-request session read. Multiple requirePlatformSession /
 * getCurrentWorkspace calls in one RSC/route handler share one cookie parse.
 */
export const getPlatformSession = cache(async (): Promise<PlatformSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value;
  return readPlatformSessionToken(token);
});

export async function requirePlatformSession(): Promise<PlatformSession> {
  const session = await getPlatformSession();
  if (!session) {
    throw new Error("Authentication required.");
  }
  return session;
}

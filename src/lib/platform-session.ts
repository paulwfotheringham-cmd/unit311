import { cookies } from "next/headers";

import {
  PLATFORM_SESSION_COOKIE,
  readPlatformSessionToken,
  type PlatformSession,
} from "@/lib/platform-auth";

export type { PlatformSession };

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value;
  return readPlatformSessionToken(token);
}

export async function requirePlatformSession(): Promise<PlatformSession> {
  const session = await getPlatformSession();
  if (!session) {
    throw new Error("Authentication required.");
  }
  return session;
}

import { NextRequest, NextResponse } from "next/server";

import {
  PLATFORM_SESSION_COOKIE,
  PLATFORM_SESSION_MAX_AGE_SECONDS,
  createPlatformSessionToken,
  normalizePlatformUsername,
  type PlatformSession,
} from "@/lib/platform-auth";
import { loginPlatformUser } from "@/lib/platform-users-service";
import { recordPlatformUserLogin } from "@/lib/external-platform-users-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEMO_LOGIN = {
  username: "client",
  password: "client",
  redirectPath: "/internaldashboard",
  userId: "00000000-0000-4000-8000-000000000001",
} as const;

function createDemoLoginResponse() {
  const session: PlatformSession = {
    sub: DEMO_LOGIN.userId,
    username: DEMO_LOGIN.username,
    displayName: "Client",
    userType: "internal",
    redirectPath: DEMO_LOGIN.redirectPath,
    exp: Date.now() + PLATFORM_SESSION_MAX_AGE_SECONDS * 1000,
  };

  const response = NextResponse.json({
    redirectPath: DEMO_LOGIN.redirectPath,
    userType: session.userType,
    displayName: session.displayName,
  });

  response.cookies.set(PLATFORM_SESSION_COOKIE, createPlatformSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PLATFORM_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };

    if (!body.username?.trim() || !body.password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    if (
      normalizePlatformUsername(body.username) === DEMO_LOGIN.username &&
      body.password === DEMO_LOGIN.password
    ) {
      return createDemoLoginResponse();
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const result = await loginPlatformUser(body.username, body.password);
    if (!result) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    try {
      await recordPlatformUserLogin(result.session.sub);
    } catch {
      // Non-blocking if last_login_at column is not yet migrated.
    }

    const response = NextResponse.json({
      redirectPath: result.redirectPath,
      userType: result.session.userType,
      displayName: result.session.displayName,
    });

    response.cookies.set(PLATFORM_SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PLATFORM_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { requestPlatformPasswordReset } from "@/lib/password-reset/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; email?: string };

    if (!body.username?.trim() || !body.email?.trim()) {
      return NextResponse.json({ error: "Username and email are required." }, { status: 400 });
    }

    const result = await requestPlatformPasswordReset({
      username: body.username,
      email: body.email,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process password reset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { requestPlatformPasswordReset } from "@/lib/password-reset/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; username?: string };

    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const result = await requestPlatformPasswordReset({
      email: body.email,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process password reset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

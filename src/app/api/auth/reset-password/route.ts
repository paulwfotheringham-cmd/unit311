import { NextRequest, NextResponse } from "next/server";

import { completePlatformPasswordReset } from "@/lib/password-reset/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
      confirmPassword?: string;
    };

    if (!body.token?.trim() || !body.password || !body.confirmPassword) {
      return NextResponse.json(
        { error: "Reset token and both password fields are required." },
        { status: 400 },
      );
    }

    const result = await completePlatformPasswordReset({
      token: body.token,
      password: body.password,
      confirmPassword: body.confirmPassword,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset password.";
    const status =
      message.includes("invalid") || message.includes("expired") || message.includes("match")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

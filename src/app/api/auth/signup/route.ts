import { NextRequest, NextResponse } from "next/server";

import { registerPlatformSignup, type PlatformSignupInput } from "@/lib/platform-signup-service";
import { sendPlatformEmailVerification } from "@/lib/platform-email-verification-service";
import { findPlatformUserById } from "@/lib/platform-users-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as PlatformSignupInput;

    const result = await registerPlatformSignup(body);

    const user = await findPlatformUserById(result.userId);
    if (user) {
      await sendPlatformEmailVerification(user).catch(() => undefined);
    }

    return NextResponse.json({
      ok: true,
      userId: result.userId,
      organisationId: result.organisationId,
      organisationSlug: result.organisationSlug,
      email: result.email,
      displayName: result.displayName,
      requiresEmailVerification: true,
      developmentRepeatSignup: result.developmentRepeatSignup,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete sign-up.";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

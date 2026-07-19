import { NextRequest, NextResponse } from "next/server";

import { registerCrmInviteSignup } from "@/lib/crm-invite-signup-service";
import { sendPlatformEmailVerification } from "@/lib/platform-email-verification-service";
import { findPlatformUserById } from "@/lib/platform-users-service";
import type { SignupBillingProfile } from "@/lib/signup-billing-profile";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CrmInviteSignupBody = {
  token?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: boolean;
  billingProfile?: Partial<SignupBillingProfile>;
};

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as CrmInviteSignupBody;
    const result = await registerCrmInviteSignup({
      token: String(body.token ?? ""),
      password: String(body.password ?? ""),
      confirmPassword: String(body.confirmPassword ?? ""),
      acceptedTerms: Boolean(body.acceptedTerms),
      billingProfile: body.billingProfile ?? {},
    });

    const user = await findPlatformUserById(result.userId);
    if (!user) {
      throw new Error("Account was created but could not be loaded for verification.");
    }

    await sendPlatformEmailVerification(user);

    return NextResponse.json({
      ok: true,
      userId: result.userId,
      email: result.email,
      displayName: result.displayName,
      crmLeadId: result.crmLeadId,
      emailVerificationStatus: result.emailVerificationStatus,
      requiresEmailVerification: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete sign-up.";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

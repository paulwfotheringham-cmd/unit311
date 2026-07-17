import { NextRequest, NextResponse } from "next/server";

import { applyPlatformSessionCookie } from "@/lib/platform-session-cookie";
import { verifyPlatformEmailToken } from "@/lib/platform-email-verification-service";
import { completePostEmailVerificationOnboarding } from "@/lib/post-email-verification-onboarding";
import { createSessionForUser } from "@/lib/platform-users-service";
import { resolveWorkspaceBinding } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(new URL("/signup?error=invalid-verification", request.url));
  }

  try {
    const user = await verifyPlatformEmailToken(token);

    try {
      await completePostEmailVerificationOnboarding(user);
    } catch (onboardingError) {
      console.error("Post-email-verification onboarding failed:", onboardingError);
      // Still continue to payment so the customer is not blocked on the verify link.
    }

    const workspace = await resolveWorkspaceBinding({
      userWorkspaceId: user.workspace_id ?? null,
      fallbackInternal: user.user_type === "internal",
    });
    const sessionBundle = createSessionForUser(user, workspace);
    const response = NextResponse.redirect(new URL("/payment", request.url));

    applyPlatformSessionCookie(response, sessionBundle.token, request);

    return response;
  } catch {
    return NextResponse.redirect(new URL("/signup?error=verification-failed", request.url));
  }
}
import { NextRequest, NextResponse } from "next/server";

import { getPlatformSession } from "@/lib/platform-session";
import {
  completeWorkspaceOnboarding,
  isWorkspaceOnboardingPrototypeSlug,
} from "@/lib/workspace-customer-onboarding-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { slug } = await context.params;
  if (!isWorkspaceOnboardingPrototypeSlug(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      selectedModules?: string[];
      primaryColour?: string;
      secondaryColour?: string;
      companyDisplayName?: string;
      inviteEmails?: string[];
    };
    const result = await completeWorkspaceOnboarding(slug, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete onboarding." },
      { status: 400 },
    );
  }
}

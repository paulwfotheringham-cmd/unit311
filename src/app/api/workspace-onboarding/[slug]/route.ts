import { NextRequest, NextResponse } from "next/server";

import { getPlatformSession } from "@/lib/platform-session";
import {
  getWorkspaceOnboardingState,
  isWorkspaceOnboardingPrototypeSlug,
  saveWorkspaceOnboardingDraft,
} from "@/lib/workspace-customer-onboarding-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { slug } = await context.params;
  if (!isWorkspaceOnboardingPrototypeSlug(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const state = await getWorkspaceOnboardingState(slug);
    if (!state) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load onboarding." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { slug } = await context.params;
  if (!isWorkspaceOnboardingPrototypeSlug(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as {
      selectedModules?: string[];
      primaryColour?: string;
      secondaryColour?: string;
      companyDisplayName?: string;
      inviteEmails?: string[];
    };
    const state = await saveWorkspaceOnboardingDraft(slug, body);
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save onboarding." },
      { status: 400 },
    );
  }
}

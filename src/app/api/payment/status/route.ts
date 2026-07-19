import { NextResponse } from "next/server";

import { getOrganisationForUser } from "@/lib/organisation-service";
import { ensureSubscriptionInvoice } from "@/lib/payment-submission-service";
import {
  findPlatformUserById,
  isPlatformEmailVerified,
  resolveUserEmail,
} from "@/lib/platform-email-verification-service";
import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getPlatformSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const verified = await isPlatformEmailVerified(session.sub);
    if (!verified) {
      return NextResponse.json({ error: "Email not verified." }, { status: 403 });
    }

    const user = await findPlatformUserById(session.sub);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const email = resolveUserEmail(user) ?? session.username;
    const invoice = await ensureSubscriptionInvoice({
      userId: session.sub,
      username: session.username,
      displayName: session.displayName,
      email,
    });

    const organisation = await getOrganisationForUser(session.sub, email);

    return NextResponse.json({
      ...invoice,
      organisationSlug: organisation?.slug ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load payment details.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { ensureSubscriptionInvoice, getInvoicePdfForUser } from "@/lib/payment-submission-service";
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
    await ensureSubscriptionInvoice({
      userId: session.sub,
      username: session.username,
      displayName: session.displayName,
      email,
    });

    const pdf = await getInvoicePdfForUser(session.sub, email, {
      displayName: session.displayName,
    });
    if (!pdf) {
      return NextResponse.json({ error: "Invoice not available." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(pdf.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdf.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load invoice.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

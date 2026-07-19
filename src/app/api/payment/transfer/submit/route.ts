import { NextRequest, NextResponse } from "next/server";

import { submitBankTransferPayment } from "@/lib/payment-submission-service";
import {
  findPlatformUserById,
  isPlatformEmailVerified,
  resolveUserEmail,
} from "@/lib/platform-email-verification-service";
import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const receipt = formData.get("receipt");
    if (!(receipt instanceof File) || receipt.size === 0) {
      return NextResponse.json({ error: "Transfer screenshot is required." }, { status: 400 });
    }

    const email = resolveUserEmail(user) ?? session.username;
    await submitBankTransferPayment({
      userId: session.sub,
      username: session.username,
      displayName: session.displayName,
      email,
      receiptFile: receipt,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit payment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

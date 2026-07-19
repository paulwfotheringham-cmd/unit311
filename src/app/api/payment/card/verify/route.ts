import { NextResponse } from "next/server";

import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";

/** Card payment remains a UI placeholder until Stripe is wired. */
export async function POST() {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in to complete payment." }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "Card payments are not available yet. Please pay by bank transfer.",
    },
    { status: 501 },
  );
}

export async function GET() {
  return NextResponse.json({ verified: false, placeholder: true });
}

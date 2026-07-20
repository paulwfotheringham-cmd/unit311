import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Catch-all for unmatched /api/* paths.
 *
 * Next.js otherwise serves the HTML `_not-found` page (and POST can even
 * return status 200). Client Directory and other fetch() callers parse JSON;
 * HTML bodies surface as `Unexpected token '<'` / red banners.
 *
 * Specific App Router handlers always win over this catch-all.
 */
function notFoundJson() {
  return NextResponse.json(
    { error: "API route not found." },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET() {
  return notFoundJson();
}

export async function POST() {
  return notFoundJson();
}

export async function PUT() {
  return notFoundJson();
}

export async function PATCH() {
  return notFoundJson();
}

export async function DELETE() {
  return notFoundJson();
}

export async function HEAD() {
  return notFoundJson();
}

export async function OPTIONS() {
  return notFoundJson();
}

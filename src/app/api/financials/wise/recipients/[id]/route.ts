import { NextRequest, NextResponse } from "next/server";

import { deleteWiseRecipient } from "@/lib/wise-service";
import { upsertRecipientMeta } from "@/lib/treasury/treasury-store";
import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const { id } = await context.params;
    const recipientId = Number(id);
    const body = (await request.json()) as {
      favourite?: boolean;
      label?: string | null;
    };

    const meta = await upsertRecipientMeta(recipientId, {
      favourite: body.favourite,
      label: body.label ?? null,
    });

    return NextResponse.json({ meta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update recipient.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const { id } = await context.params;
    await deleteWiseRecipient(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete recipient.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import {
  createWiseRecipient,
  deleteWiseRecipient,
  listWiseRecipients,
} from "@/lib/wise-service";
import {
  getRecipientMetaMap,
  upsertRecipientMeta,
} from "@/lib/treasury/treasury-store";
import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const params = request.nextUrl.searchParams;
    const recipients = await listWiseRecipients({
      profileId: gate.status.profileId ?? undefined,
      currency: params.get("currency") ?? undefined,
      search: params.get("search") ?? undefined,
    });
    const meta = await getRecipientMetaMap();

    return NextResponse.json({
      recipients: recipients.map((recipient) => ({
        ...recipient,
        favourite: meta.get(recipient.id)?.favourite ?? false,
        lastUsedAt: meta.get(recipient.id)?.lastUsedAt ?? null,
        label: meta.get(recipient.id)?.label ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recipients.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const body = (await request.json()) as {
      currency?: string;
      type?: string;
      accountHolderName?: string;
      legalType?: "PRIVATE" | "BUSINESS";
      details?: Record<string, unknown>;
      favourite?: boolean;
    };

    if (!body.currency || !body.type || !body.accountHolderName || !body.details) {
      return NextResponse.json({ error: "Missing recipient fields." }, { status: 400 });
    }

    const recipient = await createWiseRecipient({
      currency: body.currency,
      type: body.type,
      accountHolderName: body.accountHolderName,
      legalType: body.legalType ?? "BUSINESS",
      details: body.details,
    });

    if (body.favourite) {
      await upsertRecipientMeta(recipient.id, { favourite: true });
    }

    return NextResponse.json({ recipient });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create recipient.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

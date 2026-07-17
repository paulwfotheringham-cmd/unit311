import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import {
  appendTreasuryAudit,
  addTreasuryActivity,
  addTreasuryNotification,
  createTreasuryApproval,
  getDailyTransferTotal,
  getTreasurySettings,
  upsertRecipientMeta,
} from "@/lib/treasury/treasury-store";
import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";
import {
  createWiseTransfer,
  fundWiseTransfer,
  getWiseTransfer,
  mapWiseTransferStage,
} from "@/lib/wise-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const body = (await request.json()) as {
      quoteId?: string;
      recipientId?: number;
      balanceId?: number;
      reference?: string;
      sourceCurrency?: string;
      targetCurrency?: string;
      sourceAmount?: number;
      targetAmount?: number;
      exchangeRate?: number;
      fee?: number;
      estimatedArrival?: string | null;
      skipApproval?: boolean;
    };

    if (
      !body.quoteId ||
      !body.recipientId ||
      !body.balanceId ||
      !body.sourceCurrency ||
      !body.targetCurrency ||
      body.sourceAmount === undefined
    ) {
      return NextResponse.json({ error: "Missing transfer fields." }, { status: 400 });
    }

    const settings = await getTreasurySettings();
    const dailyTotal = await getDailyTransferTotal(body.sourceCurrency);
    if (dailyTotal + body.sourceAmount > settings.dailyTransferLimit) {
      return NextResponse.json(
        { error: "Daily transfer limit exceeded." },
        { status: 400 },
      );
    }

    const payload = {
      quoteId: body.quoteId,
      recipientId: body.recipientId,
      sourceCurrency: body.sourceCurrency,
      targetCurrency: body.targetCurrency,
      sourceAmount: body.sourceAmount,
      targetAmount: body.targetAmount ?? body.sourceAmount,
      reference: body.reference ?? settings.defaultReference,
      balanceId: body.balanceId,
      exchangeRate: body.exchangeRate,
      fee: body.fee,
      estimatedArrival: body.estimatedArrival ?? null,
    };

    if (!body.skipApproval && body.sourceAmount >= settings.approvalThreshold) {
      const approval = await createTreasuryApproval({
        requestedBy: gate.session.sub,
        requestedByName: gate.session.displayName,
        payload,
      });

      await addTreasuryNotification({
        type: "approval_required",
        title: "Transfer approval required",
        message: `${gate.session.displayName} requested a ${body.sourceCurrency} ${body.sourceAmount.toFixed(2)} transfer.`,
        metadata: { approvalId: approval.id },
      });

      await appendTreasuryAudit({
        actor: gate.session.sub,
        actorName: gate.session.displayName,
        action: "transfer_approval_requested",
        details: JSON.stringify(payload),
      });

      return NextResponse.json({ approvalRequired: true, approval });
    }

    const transfer = await createWiseTransfer({
      targetAccount: body.recipientId,
      quoteUuid: body.quoteId,
      customerTransactionId: randomUUID(),
      reference: payload.reference,
    });

    await fundWiseTransfer({
      transferId: transfer.id,
      balanceId: body.balanceId,
      profileId: gate.status.profileId ?? undefined,
    });

    const latest = await getWiseTransfer(transfer.id);
    const stage = mapWiseTransferStage(latest.status);

    await upsertRecipientMeta(body.recipientId, { lastUsedAt: new Date().toISOString() });

    await addTreasuryActivity({
      type: stage === "failed" ? "transfer_failed" : "money_sent",
      title: stage === "failed" ? "Transfer failed" : "Money sent",
      subtitle: payload.reference,
      amount: body.sourceAmount,
      currency: body.sourceCurrency,
      metadata: { transferId: latest.id, stage },
    });

    await appendTreasuryAudit({
      actor: gate.session.sub,
      actorName: gate.session.displayName,
      action: "transfer_executed",
      details: JSON.stringify({ transferId: latest.id, payload }),
    });

    if (stage === "failed") {
      await addTreasuryNotification({
        type: "transfer_failed",
        title: "Transfer failed",
        message: `Transfer ${latest.id} failed with status ${latest.status}.`,
        metadata: { transferId: latest.id },
      });
    } else {
      await addTreasuryNotification({
        type: "transfer_completed",
        title: "Transfer completed",
        message: `${body.sourceCurrency} ${body.sourceAmount.toFixed(2)} sent successfully.`,
        metadata: { transferId: latest.id },
      });

      if (body.sourceAmount >= settings.approvalThreshold) {
        await addTreasuryNotification({
          type: "large_transfer",
          title: "Large transfer executed",
          message: `${body.sourceCurrency} ${body.sourceAmount.toFixed(2)} transfer completed.`,
          metadata: { transferId: latest.id },
        });
      }
    }

    return NextResponse.json({ transfer: latest, stage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to execute transfer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

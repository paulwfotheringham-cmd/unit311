import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import {
  addTreasuryActivity,
  addTreasuryNotification,
  appendTreasuryAudit,
  createTreasuryApproval,
  listTreasuryApprovals,
  resolveTreasuryApproval,
  upsertRecipientMeta,
} from "@/lib/treasury/treasury-store";
import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";
import { requirePlatformSession } from "@/lib/platform-session";
import {
  createWiseTransfer,
  fundWiseTransfer,
  getWiseTransfer,
  mapWiseTransferStage,
} from "@/lib/wise-service";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    await requireCurrentWorkspace();
    const approvals = await listTreasuryApprovals();
    return NextResponse.json({ approvals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load approvals.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformSession();
    await requireCurrentWorkspace();

    const body = (await request.json()) as {
      payload?: Parameters<typeof createTreasuryApproval>[0]["payload"];
    };
    if (!body.payload) {
      return NextResponse.json({ error: "Missing approval payload." }, { status: 400 });
    }

    const approval = await createTreasuryApproval({
      requestedBy: session.sub,
      requestedByName: session.displayName,
      payload: body.payload,
    });

    return NextResponse.json({ approval });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create approval.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const gate = await requireWiseTreasuryConnection();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      id?: string;
      action?: "approve" | "reject";
      reason?: string;
    };

    if (!body.id || !body.action) {
      return NextResponse.json({ error: "id and action are required." }, { status: 400 });
    }

    const approval = await resolveTreasuryApproval({
      id: body.id,
      status: body.action === "approve" ? "approved" : "rejected",
      approver: gate.session.sub,
      approverName: gate.session.displayName,
      reason: body.reason,
    });

    if (approval.status === "rejected") {
      return NextResponse.json({ approval });
    }

    const { payload } = approval;
    const transfer = await createWiseTransfer({
      targetAccount: payload.recipientId,
      quoteUuid: payload.quoteId,
      customerTransactionId: randomUUID(),
      reference: payload.reference,
    });

    if (payload.balanceId) {
      await fundWiseTransfer({
        transferId: transfer.id,
        balanceId: payload.balanceId,
        profileId: gate.status.profileId ?? undefined,
      });
    }

    const latest = await getWiseTransfer(transfer.id);
    const stage = mapWiseTransferStage(latest.status);

    await upsertRecipientMeta(payload.recipientId, { lastUsedAt: new Date().toISOString() });
    await addTreasuryActivity({
      type: stage === "failed" ? "transfer_failed" : "transfer_completed",
      title: stage === "failed" ? "Approved transfer failed" : "Approved transfer completed",
      subtitle: payload.reference,
      amount: payload.sourceAmount,
      currency: payload.sourceCurrency,
      metadata: { transferId: latest.id, approvalId: approval.id },
    });

    await appendTreasuryAudit({
      actor: gate.session.sub,
      actorName: gate.session.displayName,
      action: "approved_transfer_executed",
      details: JSON.stringify({ approvalId: approval.id, transferId: latest.id }),
    });

    await addTreasuryNotification({
      type: stage === "failed" ? "transfer_failed" : "transfer_completed",
      title: stage === "failed" ? "Approved transfer failed" : "Approved transfer completed",
      message: `${payload.sourceCurrency} ${payload.sourceAmount.toFixed(2)} transfer ${stage}.`,
      metadata: { transferId: latest.id, approvalId: approval.id },
    });

    return NextResponse.json({ approval, transfer: latest, stage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve approval.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

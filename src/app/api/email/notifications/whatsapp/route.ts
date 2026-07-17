import { NextRequest, NextResponse } from "next/server";

import { emailErrorResponse } from "@/lib/email/api-utils";
import {
  getWhatsAppNotificationStatus,
  processInfoMailboxWhatsAppNotifications,
  sendWhatsAppTestNotification,
  setWhatsAppNotificationsEnabled,
} from "@/lib/email/whatsapp-notifications";
import { ensureEmailInfrastructureTables } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace, resolveWorkspaceBinding } from "@/lib/workspace-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authErrorStatus(message: string) {
  return message.includes("Authentication required") || message.includes("Workspace context")
    ? 401
    : 500;
}

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.WHATSAPP_CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function resolveScopeForRequest(request: NextRequest) {
  if (isAuthorizedCron(request)) {
    const workspace = await resolveWorkspaceBinding({ fallbackInternal: true });
    if (!workspace) {
      throw new Error("Workspace context is required.");
    }
    return { workspaceId: workspace.id };
  }

  await requirePlatformSession();
  const workspace = await requireCurrentWorkspace();
  return { workspaceId: workspace.id };
}

export async function GET(request: NextRequest) {
  if (isAuthorizedCron(request)) {
    try {
      const scope = await resolveScopeForRequest(request);
      const result = await processInfoMailboxWhatsAppNotifications(undefined, scope);
      return NextResponse.json({ ok: true, cron: true, ...result });
    } catch (error) {
      if (error instanceof Error && authErrorStatus(error.message) === 401) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      return emailErrorResponse(error, "WhatsApp cron check failed.");
    }
  }

  try {
    const scope = await resolveScopeForRequest(request);
    await ensureEmailInfrastructureTables();
    const status = await getWhatsAppNotificationStatus(scope);
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof Error && authErrorStatus(error.message) === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return emailErrorResponse(error, "Failed to load WhatsApp notification status.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await resolveScopeForRequest(request);
    await ensureEmailInfrastructureTables();
    const body = (await request.json().catch(() => ({}))) as {
      action?: "check" | "enable" | "disable" | "test";
      enabled?: boolean;
    };

    const cron = isAuthorizedCron(request);

    if (body.action === "enable" || body.action === "disable") {
      await setWhatsAppNotificationsEnabled(body.action === "enable", scope);
      const status = await getWhatsAppNotificationStatus(scope);
      return NextResponse.json({ ok: true, ...status });
    }

    if (body.action === "test") {
      const result = await sendWhatsAppTestNotification();
      return NextResponse.json(result);
    }

    if (body.action === "check" || cron || body.action == null) {
      const result = await processInfoMailboxWhatsAppNotifications(undefined, scope);
      return NextResponse.json({ ok: true, ...result });
    }

    if (typeof body.enabled === "boolean") {
      await setWhatsAppNotificationsEnabled(body.enabled, scope);
      const status = await getWhatsAppNotificationStatus(scope);
      return NextResponse.json({ ok: true, ...status });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && authErrorStatus(error.message) === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return emailErrorResponse(error, "WhatsApp notification request failed.");
  }
}

import { NextRequest, NextResponse } from "next/server";

import { processSupportTicketFromWhatsApp } from "@/lib/support-intake";
import { logWhatsAppInbound } from "@/lib/whatsapp/inbound-log";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveWorkspaceBinding } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type TextMeBotPayload = {
  type?: string;
  from?: string;
  from_name?: string;
  to?: string;
  file?: string | null;
  message?: string;
  text?: string;
};

function extractFromQuery(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return {
    text: (
      params.get("text") ??
      params.get("message") ??
      params.get("msg") ??
      params.get("body") ??
      params.get("comment") ??
      params.get("query") ??
      ""
    ).trim(),
    phone: params.get("from"),
    fromName: params.get("from_name"),
  };
}

function verifyWebhookSecret(request: NextRequest) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET?.trim();
  if (!secret) return true;

  const provided =
    request.headers.get("x-whatsapp-webhook-secret") ??
    request.nextUrl.searchParams.get("secret");

  return provided === secret;
}

async function parsePostPayload(request: NextRequest): Promise<TextMeBotPayload> {
  const contentType = request.headers.get("content-type") ?? "";
  const raw = await request.text();

  if (!raw) return {};

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw) as TextMeBotPayload;
    } catch {
      return {};
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded") || raw.includes("=")) {
    const params = new URLSearchParams(raw);
    return {
      type: params.get("type") ?? undefined,
      from: params.get("from") ?? undefined,
      from_name: params.get("from_name") ?? undefined,
      to: params.get("to") ?? undefined,
      file: params.get("file") ?? undefined,
      message: params.get("message") ?? undefined,
      text: params.get("text") ?? undefined,
    };
  }

  try {
    return JSON.parse(raw) as TextMeBotPayload;
  } catch {
    return { message: raw };
  }
}

function shouldSkipMessage(text: string) {
  const normalized = text.trim();
  if (!normalized) return true;
  if (/^new email to info@/i.test(normalized)) return true;
  if (/^textmebot\s*->/i.test(normalized)) return true;
  if (/^bcn support intake/i.test(normalized)) return true;
  return false;
}

type InboundPayload = TextMeBotPayload & {
  preview?: boolean;
};

async function handleInboundText(
  text: string,
  phone?: string | null,
  fromName?: string | null,
  suppressWhatsApp = false,
) {
  const workspace = await resolveWorkspaceBinding({ fallbackInternal: true });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace context is required." }, { status: 401 });
  }
  const scope = { workspaceId: workspace.id };

  if (shouldSkipMessage(text)) {
    await logWhatsAppInbound(
      {
        fromPhone: phone,
        fromName,
        message: text,
        result: "skipped_noise",
      },
      scope,
    );
    return NextResponse.json({ ok: true, skipped: true, reason: "noise_message" });
  }

  try {
    const result = await processSupportTicketFromWhatsApp(text, {
      phone,
      suppressWhatsApp,
      workspaceId: workspace.id,
    });
    const mode = "mode" in result ? result.mode : "unknown";

    await logWhatsAppInbound(
      {
        fromPhone: phone,
        fromName,
        message: text,
        result: mode,
      },
      scope,
    );

    if (result.mode === "ignored") {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
        reply: "reply" in result ? result.reply : undefined,
      });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process WhatsApp ticket";
    await logWhatsAppInbound(
      {
        fromPhone: phone,
        fromName,
        message: text,
        error: message,
      },
      scope,
    );
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  const { text, phone, fromName } = extractFromQuery(request);
  if (!text) {
    return NextResponse.json(
      {
        error: "Missing message text.",
        hint: 'Start with "Open new ticket" and answer each question.',
      },
      { status: 400 },
    );
  }

  return handleInboundText(text, phone, fromName);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  const body = (await parsePostPayload(request)) as InboundPayload;
  const query = extractFromQuery(request);
  const text = (body.message ?? body.text ?? query.text).trim();
  const phone = body.from ?? query.phone;
  const fromName = body.from_name ?? query.fromName;
  const suppressWhatsApp = body.preview === true;

  console.info("[whatsapp/inbound] received", {
    from: phone,
    fromName,
    preview: text.slice(0, 120),
  });

  if (!text) {
    const workspace = await resolveWorkspaceBinding({ fallbackInternal: true });
    await logWhatsAppInbound(
      {
        fromPhone: phone,
        fromName,
        message: "",
        error: "missing_message_text",
      },
      workspace ? { workspaceId: workspace.id } : undefined,
    );
    return NextResponse.json({ error: "Missing message text." }, { status: 400 });
  }

  return handleInboundText(text, phone, fromName, suppressWhatsApp);
}

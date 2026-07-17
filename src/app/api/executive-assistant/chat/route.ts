import { NextRequest, NextResponse } from "next/server";

import { completeExecutiveAssistantChat, type ExecutiveAssistantChatTurn } from "@/lib/executive-assistant-ai";
import {
  buildExecutivePlatformSnapshot,
  formatExecutivePlatformSnapshot,
} from "@/lib/executive-assistant-context";
import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 24;

function parseMessages(raw: unknown): ExecutiveAssistantChatTurn[] | null {
  if (!Array.isArray(raw)) return null;

  const messages = raw
    .filter(
      (entry): entry is ExecutiveAssistantChatTurn =>
        Boolean(entry) &&
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string",
    )
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim(),
    }))
    .filter((entry) => entry.content.length > 0)
    .slice(-MAX_MESSAGES);

  return messages.length > 0 ? messages : null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getPlatformSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json()) as { messages?: unknown };
    const messages = parseMessages(body.messages);

    if (!messages) {
      return NextResponse.json({ error: "messages array is required." }, { status: 400 });
    }

    if (messages[messages.length - 1]?.role !== "user") {
      return NextResponse.json({ error: "Last message must be from the user." }, { status: 400 });
    }

    const snapshot = await buildExecutivePlatformSnapshot();
    const platformContext = formatExecutivePlatformSnapshot(snapshot);
    const { content: reply, model, authMode } = await completeExecutiveAssistantChat(
      messages,
      platformContext,
    );

    return NextResponse.json({
      reply,
      model,
      authMode,
      dataAvailable: snapshot.dataAvailable,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate reply";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";

import {
  createAssistantSseResponse,
  runAssistantTurn,
  type AssistantChatMessage,
  type AssistantChatRequest,
  type AssistantPageSelection,
} from "@/lib/ai-operating-assistant";
import {
  createEaCorrelationId,
  eaStage,
  eaStop,
  getEaCorrelationId,
  resolveIncomingCorrelationId,
  runWithEaTraceAsync,
} from "@/lib/ai-operating-assistant/ea-forensic-trace";
import {
  completeExecutiveAssistantChat,
  type ExecutiveAssistantChatTurn,
} from "@/lib/executive-assistant-ai";
import {
  buildExecutivePlatformSnapshot,
  formatExecutivePlatformSnapshot,
} from "@/lib/executive-assistant-context";
import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_LEGACY_MESSAGES = 24;

function parseSelection(raw: unknown): AssistantPageSelection | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  return {
    clientId: typeof value.clientId === "string" ? value.clientId : null,
    clientName: typeof value.clientName === "string" ? value.clientName : null,
    projectId: typeof value.projectId === "string" ? value.projectId : null,
    projectName: typeof value.projectName === "string" ? value.projectName : null,
    employeeId: typeof value.employeeId === "string" ? value.employeeId : null,
    employeeName: typeof value.employeeName === "string" ? value.employeeName : null,
    contractId: typeof value.contractId === "string" ? value.contractId : null,
    contractName: typeof value.contractName === "string" ? value.contractName : null,
    fileId: typeof value.fileId === "string" ? value.fileId : null,
    fileName: typeof value.fileName === "string" ? value.fileName : null,
  };
}

function parseOperatingMessages(raw: unknown): AssistantChatMessage[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter(
      (entry): entry is AssistantChatMessage =>
        Boolean(entry) &&
        typeof entry === "object" &&
        (entry.role === "user" || entry.role === "assistant" || entry.role === "tool") &&
        typeof entry.content === "string",
    )
    .map((entry) => {
      const artifacts = Array.isArray(entry.artifacts)
        ? entry.artifacts
            .filter(
              (artifact): artifact is NonNullable<AssistantChatMessage["artifacts"]>[number] =>
                Boolean(artifact) &&
                typeof artifact === "object" &&
                typeof artifact.id === "string" &&
                typeof artifact.filename === "string",
            )
            .map((artifact) => ({
              id: artifact.id,
              kind: artifact.kind === "pdf" ? ("pdf" as const) : ("pdf" as const),
              title: typeof artifact.title === "string" ? artifact.title : artifact.filename,
              filename: artifact.filename,
              downloadUrl:
                typeof artifact.downloadUrl === "string"
                  ? artifact.downloadUrl
                  : `/api/executive-assistant/artifacts/${artifact.id}?disposition=attachment`,
              openUrl:
                typeof artifact.openUrl === "string"
                  ? artifact.openUrl
                  : `/api/executive-assistant/artifacts/${artifact.id}?disposition=inline`,
              contentBase64:
                typeof artifact.contentBase64 === "string" ? artifact.contentBase64 : undefined,
            }))
        : undefined;

      return {
        id: typeof entry.id === "string" ? entry.id : `msg_${Math.random().toString(36).slice(2)}`,
        role: entry.role,
        content: entry.content,
        createdAt:
          typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
        toolName: typeof entry.toolName === "string" ? entry.toolName : undefined,
        toolCallId: typeof entry.toolCallId === "string" ? entry.toolCallId : undefined,
        followUpActions: Array.isArray(entry.followUpActions)
          ? entry.followUpActions
          : undefined,
        artifacts: artifacts && artifacts.length > 0 ? artifacts : undefined,
      };
    });
}

function parseLegacyMessages(raw: unknown): ExecutiveAssistantChatTurn[] | null {
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
    .slice(-MAX_LEGACY_MESSAGES);

  return messages.length > 0 ? messages : null;
}

async function handleLegacyChat(messages: ExecutiveAssistantChatTurn[]) {
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
}

async function handleOperatingAssistantChat(
  body: Record<string, unknown>,
  session: NonNullable<Awaited<ReturnType<typeof getPlatformSession>>>,
  correlationId: string,
) {
  const chatRequest: AssistantChatRequest = {
    conversationId: typeof body.conversationId === "string" ? body.conversationId : null,
    message: typeof body.message === "string" ? body.message : "",
    messages: parseOperatingMessages(body.messages),
    activeView: typeof body.activeView === "string" ? body.activeView : null,
    pathname: typeof body.pathname === "string" ? body.pathname : null,
    selection: parseSelection(body.selection),
    roleView: typeof body.roleView === "string" ? body.roleView : null,
    stream: body.stream !== false,
    structuredJson: body.structuredJson === true,
  };

  if (!chatRequest.message.trim()) {
    eaStop("Chat request received", "message is required.", { correlationId });
    return NextResponse.json(
      { error: "message is required.", correlationId },
      { status: 400 },
    );
  }

  return runWithEaTraceAsync(
    {
      correlationId,
      conversationId: chatRequest.conversationId,
    },
    async () => {
      eaStage("Chat request received", {
        conversationId: chatRequest.conversationId,
        "user message": chatRequest.message,
      });

      const generator = runAssistantTurn({ session, request: chatRequest });

      if (chatRequest.stream === false) {
        let finalText = "";
        let conversationId = chatRequest.conversationId ?? "";
        let error: string | null = null;
        let errorStack: string | null = null;

        for await (const event of generator) {
          if (event.type === "delta") finalText += event.text;
          if (event.type === "done") {
            finalText = event.message.content;
            conversationId = event.conversationId;
          }
          if (event.type === "error") {
            error = event.error;
            errorStack = event.stack ?? null;
          }
        }

        if (error) {
          eaStop("Chat request received", error, { stack: errorStack });
          return NextResponse.json(
            { error, stack: errorStack, correlationId: getEaCorrelationId() },
            { status: 502 },
          );
        }

        return NextResponse.json({
          reply: finalText,
          conversationId,
          correlationId: getEaCorrelationId(),
        });
      }

      const response = createAssistantSseResponse(generator);
      response.headers.set("x-ea-correlation-id", getEaCorrelationId());
      return response;
    },
  );
}

/**
 * Dual contract:
 * - Legacy panel: `{ messages: [...] }` → `{ reply, model, authMode, dataAvailable }`
 * - Operating Assistant: `{ message, ... }` → SSE stream or `{ reply, conversationId }`
 */
export async function POST(request: NextRequest) {
  const correlationId = resolveIncomingCorrelationId({
    header: request.headers.get("x-ea-correlation-id"),
    body: null,
  });

  try {
    const session = await getPlatformSession();
    if (!session) {
      eaStop("Chat request received", "Authentication required.", { correlationId });
      return NextResponse.json(
        { error: "Authentication required.", correlationId },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const operatingMessage =
      typeof body.message === "string" ? body.message.trim() : "";
    const bodyCorrelation =
      typeof body.correlationId === "string" ? body.correlationId.trim() : null;
    const effectiveCorrelation = bodyCorrelation || correlationId || createEaCorrelationId();

    if (operatingMessage) {
      return handleOperatingAssistantChat(body, session, effectiveCorrelation);
    }

    const legacyMessages = parseLegacyMessages(body.messages);
    if (!legacyMessages) {
      return NextResponse.json(
        {
          error: "message is required, or provide a legacy messages array.",
          correlationId: effectiveCorrelation,
        },
        { status: 400 },
      );
    }

    if (legacyMessages[legacyMessages.length - 1]?.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from the user.", correlationId: effectiveCorrelation },
        { status: 400 },
      );
    }

    return handleLegacyChat(legacyMessages);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[EA] EXCEPTION — Chat POST");
    console.error(`- correlationId: ${correlationId}`);
    console.error(`- message: ${err.message}`);
    console.error(`- stack: ${err.stack ?? "(no stack)"}`);
    if (err.stack) console.error(err.stack);
    const status =
      err.message.includes("not configured") || err.message.includes("OPENAI_API_KEY")
        ? 503
        : 500;
    return NextResponse.json(
      { error: err.message, stack: err.stack ?? null, correlationId },
      { status },
    );
  }
}

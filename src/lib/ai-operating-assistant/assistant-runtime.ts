import { resolveDirectIntent, topicHintFromHistory } from "./intent-router";
import {
  createAssistantResponse,
  formatOpenAIError,
  getAssistantModel,
  isRetryableOpenAIError,
} from "./openai-client";
import { buildBusinessContext } from "./context-service";
import { buildStructuredJsonHint, buildSystemInstructions } from "./prompt-service";
import { executeAssistantTool, getOpenAIToolSchemas } from "./tool-service";
import {
  createConversation,
  createMessageId,
  getConversationForUser,
  titleFromMessages,
  updateConversation,
} from "./conversation-service";
import { recordQualityEvent } from "./feedback-service";
import type {
  AssistantBusinessContext,
  AssistantChatMessage,
  AssistantChatRequest,
  AssistantStreamEvent,
} from "./types";
import type { PlatformSession } from "@/lib/platform-auth";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/server";

type EasyInputMessage = {
  role: "user" | "assistant" | "system" | "developer";
  content: string;
};

function toInputMessages(
  history: AssistantChatMessage[],
  latestUserMessage: string,
): EasyInputMessage[] {
  const prior = history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-24)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

  return [...prior, { role: "user", content: latestUserMessage }];
}

function encodeSse(event: AssistantStreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

async function resolveHistory(
  session: PlatformSession,
  request: AssistantChatRequest,
  _context: AssistantBusinessContext,
): Promise<{ conversationId: string | null; history: AssistantChatMessage[]; title: string }> {
  const clientPrior = (request.messages ?? [])
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.id !== "welcome" && message.content.trim().length > 0);

  if (request.conversationId && isSupabaseServiceRoleConfigured()) {
    const existing = await getConversationForUser(request.conversationId, session.sub);
    if (existing) {
      const dbHistory = existing.messages.filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          message.id !== "welcome" &&
          message.content.trim().length > 0,
      );
      // Prefer the longer continuous thread so client/server never drop context.
      // Prefer client copies when they carry durable artifact bytes (base64).
      const base = dbHistory.length >= clientPrior.length ? dbHistory : clientPrior;
      const clientById = new Map(clientPrior.map((message) => [message.id, message]));
      const history = base.map((message) => {
        const client = clientById.get(message.id);
        if (client?.artifacts?.some((artifact) => Boolean(artifact.contentBase64))) {
          return client;
        }
        return message;
      });
      // Append any newer client-only turns not yet in DB.
      const knownIds = new Set(history.map((message) => message.id));
      for (const message of clientPrior) {
        if (!knownIds.has(message.id)) history.push(message);
      }
      return {
        conversationId: existing.id,
        history,
        title: existing.title,
      };
    }
  }

  if (clientPrior.length) {
    return {
      conversationId: request.conversationId ?? null,
      history: clientPrior,
      title: titleFromMessages(clientPrior),
    };
  }

  return {
    conversationId: null,
    history: [],
    title: "New conversation",
  };
}

function formatSearchEmployeesReply(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const status = String((result as { status?: string }).status ?? "");
  if (status === "error" || status === "forbidden") {
    return (
      (typeof (result as { error?: string }).error === "string" &&
        (result as { error: string }).error) ||
      "I could not load employees."
    );
  }
  const items = (result as { items?: Array<Record<string, unknown>> }).items;
  if (!Array.isArray(items)) return null;
  const summary = (result as { summary?: Record<string, unknown> }).summary;
  const headcount =
    typeof summary?.headcount === "number" ? summary.headcount : items.length;
  if (items.length === 0) {
    return `No employees matched. Headcount on file: ${headcount}.`;
  }
  const lines = items.slice(0, 40).map((item, index) => {
    const name = String(item.fullName ?? "—");
    const department = String(item.department ?? "—");
    const role = String(item.role ?? "—");
    return `${index + 1}. ${name} — ${department} — ${role}`;
  });
  const more =
    items.length > 40 ? `\n…and ${items.length - 40} more.` : "";
  return `Here are the employees on file (${items.length} shown, headcount ${headcount}):\n\n${lines.join("\n")}${more}`;
}

function extractArtifactsFromToolResult(
  result: unknown,
  toolName?: string,
): {
  followUps: NonNullable<AssistantChatMessage["followUpActions"]>;
  artifacts: NonNullable<AssistantChatMessage["artifacts"]>;
  successText: string | null;
  errorText: string | null;
} {
  if (!result || typeof result !== "object") {
    return { followUps: [], artifacts: [], successText: null, errorText: null };
  }
  const status = String((result as { status?: string }).status ?? "");
  const followUps = Array.isArray((result as { followUpActions?: unknown }).followUpActions)
    ? ((result as { followUpActions: NonNullable<AssistantChatMessage["followUpActions"]> })
        .followUpActions ?? [])
    : [];
  const summary = (result as { summary?: Record<string, unknown> }).summary;
  const items = (result as { items?: Array<Record<string, unknown>> }).items;
  const artifactId =
    (typeof summary?.artifactId === "string" && summary.artifactId) ||
    (typeof items?.[0]?.artifactId === "string" && items[0].artifactId) ||
    null;

  if (status === "error" || status === "forbidden") {
    return {
      followUps: [],
      artifacts: [],
      successText: null,
      errorText:
        (typeof (result as { error?: string }).error === "string" &&
          (result as { error: string }).error) ||
        (typeof summary?.message === "string" && summary.message) ||
        "That action could not be completed.",
    };
  }

  if (toolName === "searchEmployees") {
    return {
      followUps,
      artifacts: [],
      successText: formatSearchEmployeesReply(result),
      errorText: null,
    };
  }

  if (toolName === "emailAssistantArtifact") {
    return {
      followUps,
      artifacts: [],
      successText:
        typeof summary?.message === "string"
          ? summary.message
          : "Email sent.",
      errorText: null,
    };
  }

  if (!artifactId) {
    return {
      followUps,
      artifacts: [],
      successText:
        typeof summary?.message === "string"
          ? summary.message
          : status === "ok"
            ? "Done."
            : null,
      errorText: null,
    };
  }

  const title =
    (typeof summary?.title === "string" && summary.title) ||
    (typeof items?.[0]?.title === "string" && String(items[0].title)) ||
    "Document";
  const filename =
    (typeof summary?.filename === "string" && summary.filename) ||
    (typeof items?.[0]?.filename === "string" && String(items[0].filename)) ||
    "document.pdf";
  const contentBase64 =
    (typeof items?.[0]?.contentBase64 === "string" && String(items[0].contentBase64)) ||
    undefined;

  return {
    followUps,
    artifacts: [
      {
        id: artifactId,
        kind: "pdf",
        title,
        filename,
        downloadUrl: `/api/executive-assistant/artifacts/${artifactId}?disposition=attachment`,
        openUrl: `/api/executive-assistant/artifacts/${artifactId}?disposition=inline`,
        contentBase64,
      },
    ],
    successText:
      (typeof summary?.message === "string" && summary.message) ||
      `${filename}\n\nGenerated successfully.`,
    errorText: null,
  };
}

function extractActiveArtifact(history: AssistantChatMessage[]) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const artifacts = history[index]?.artifacts;
    if (artifacts && artifacts.length > 0) {
      return artifacts[artifacts.length - 1] ?? null;
    }
  }
  return null;
}

async function persistTurn(input: {
  session: PlatformSession;
  conversationId: string | null;
  history: AssistantChatMessage[];
  userMessage: AssistantChatMessage;
  assistantMessage: AssistantChatMessage;
  context: AssistantBusinessContext;
  title: string;
}) {
  if (!isSupabaseServiceRoleConfigured()) {
    return {
      conversationId: input.conversationId ?? `local_${createMessageId()}`,
      title: input.title,
    };
  }

  const messages = [...input.history, input.userMessage, input.assistantMessage];
  const title = titleFromMessages(messages);

  if (input.conversationId) {
    const updated = await updateConversation({
      conversationId: input.conversationId,
      userId: input.session.sub,
      messages,
      workspaceContext: input.context,
      title,
    });
    return { conversationId: updated.id, title: updated.title };
  }

  const created = await createConversation({
    userId: input.session.sub,
    workspaceId: input.context.workspace.id,
    organisationId: input.context.organisation.id,
    messages,
    workspaceContext: input.context,
    title,
  });
  return { conversationId: created.id, title: created.title };
}

/**
 * Runs one assistant turn via the OpenAI Responses API with optional tool loop.
 * Yields SSE-friendly stream events.
 */
export async function* runAssistantTurn(input: {
  session: PlatformSession;
  request: AssistantChatRequest;
}): AsyncGenerator<AssistantStreamEvent> {
  const message = input.request.message?.trim();
  if (!message) {
    yield { type: "error", error: "message is required", retryable: false };
    return;
  }

  const context = await buildBusinessContext({
    session: input.session,
    activeView: input.request.activeView,
    pathname: input.request.pathname,
    selection: input.request.selection,
    roleView: input.request.roleView,
  });

  const resolved = await resolveHistory(input.session, input.request, context);
  const activeArtifact = extractActiveArtifact(resolved.history);
  const userMessage: AssistantChatMessage = {
    id: createMessageId(),
    role: "user",
    content: message,
    createdAt: new Date().toISOString(),
  };

  yield {
    type: "meta",
    conversationId: resolved.conversationId ?? "pending",
    title: resolved.title,
  };

  const instructions = [
    buildSystemInstructions(context, {
      activeArtifact: activeArtifact
        ? {
            artifactId: activeArtifact.id,
            title: activeArtifact.title,
            filename: activeArtifact.filename,
            downloadUrl: activeArtifact.downloadUrl,
            openUrl: activeArtifact.openUrl,
          }
        : null,
      topicHint: topicHintFromHistory(resolved.history),
    }),
    input.request.structuredJson ? buildStructuredJsonHint() : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const turnStartedAt = Date.now();
  let recordedDataGaps = 0;

  const tools = getOpenAIToolSchemas();
  let inputItems: EasyInputMessage[] = toInputMessages(resolved.history, message);
  let assistantText = "";
  let toolLoops = 0;
  let turnFollowUps: NonNullable<AssistantChatMessage["followUpActions"]> = [];
  let turnArtifacts: NonNullable<AssistantChatMessage["artifacts"]> = [];

  try {
    const directIntent = resolveDirectIntent(message, resolved.history);
    if (directIntent) {
      const toolArgs =
        directIntent.tool === "emailAssistantArtifact" && activeArtifact
          ? {
              ...directIntent.args,
              artifactId:
                (typeof directIntent.args.artifactId === "string" &&
                  directIntent.args.artifactId) ||
                activeArtifact.id,
              contentBase64: activeArtifact.contentBase64,
              title: activeArtifact.title,
              filename: activeArtifact.filename,
            }
          : directIntent.args;
      yield {
        type: "tool_call",
        name: directIntent.tool,
        arguments: toolArgs,
      };
      const result = await executeAssistantTool(
        directIntent.tool,
        toolArgs,
        context,
      );
      yield { type: "tool_result", name: directIntent.tool, result };
      const extracted = extractArtifactsFromToolResult(result, directIntent.tool);
      turnFollowUps = extracted.followUps;
      turnArtifacts = extracted.artifacts;
      assistantText =
        extracted.errorText ??
        extracted.successText ??
        "Done.";
      yield { type: "delta", text: assistantText };

      const assistantMessage: AssistantChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
        followUpActions: turnFollowUps.length > 0 ? turnFollowUps : undefined,
        artifacts: turnArtifacts.length > 0 ? turnArtifacts : undefined,
      };

      const saved = await persistTurn({
        session: input.session,
        conversationId: resolved.conversationId,
        history: resolved.history,
        userMessage,
        assistantMessage,
        context,
        title: resolved.title,
      });

      yield {
        type: "done",
        message: assistantMessage,
        conversationId: saved.conversationId,
      };
      return;
    }

    while (toolLoops < 4) {
      const stream = await createAssistantResponse({
        model: getAssistantModel(),
        instructions,
        input: inputItems,
        tools,
        stream: true,
        store: false,
        ...(input.request.structuredJson
          ? {
              text: {
                format: { type: "json_object" as const },
              },
            }
          : {}),
      });

      let pendingToolCalls: Array<{ callId: string; name: string; arguments: string }> = [];
      let responseId: string | null = null;

      for await (const event of stream as AsyncIterable<{
        type: string;
        delta?: string;
        response?: { id?: string; output?: unknown[] };
        item?: { type?: string; name?: string; call_id?: string; arguments?: string; id?: string };
        name?: string;
        arguments?: string;
        call_id?: string;
      }>) {
        if (event.type === "response.created" && event.response?.id) {
          responseId = event.response.id;
        }

        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          assistantText += event.delta;
          yield { type: "delta", text: event.delta };
        }

        if (event.type === "response.output_item.done" && event.item?.type === "function_call") {
          const name = event.item.name ?? "unknown";
          const args = event.item.arguments ?? "{}";
          const callId = event.item.call_id ?? event.item.id ?? createMessageId();
          pendingToolCalls.push({ callId, name, arguments: args });
          yield { type: "tool_call", name, arguments: safeParse(args) };
        }

        if (event.type === "response.function_call_arguments.done") {
          // Some SDK versions emit this; prefer output_item.done when both appear.
          if (event.name && event.arguments && event.call_id) {
            if (!pendingToolCalls.some((call) => call.callId === event.call_id)) {
              pendingToolCalls.push({
                callId: event.call_id,
                name: event.name,
                arguments: event.arguments,
              });
              yield {
                type: "tool_call",
                name: event.name,
                arguments: safeParse(event.arguments),
              };
            }
          }
        }

        if (event.type === "response.failed") {
          yield {
            type: "error",
            error: "OpenAI response failed",
            retryable: true,
          };
          return;
        }

        void responseId;
      }

      if (pendingToolCalls.length === 0) {
        break;
      }

      toolLoops += 1;
      const toolOutputs: Array<{ type: "function_call_output"; call_id: string; output: string }> =
        [];

      for (const call of pendingToolCalls) {
        const toolStarted = Date.now();
        const result = await executeAssistantTool(call.name, call.arguments, context);
        const status =
          result && typeof result === "object" && "status" in result
            ? String((result as { status?: string }).status)
            : "ok";
        const success = status === "ok" || status === "partial";
        void recordQualityEvent({
          kind: success ? "tool_success" : "tool_error",
          toolName: call.name,
          durationMs: Date.now() - toolStarted,
          success,
          meta: { status },
        });
        const gaps =
          result && typeof result === "object" && Array.isArray((result as { dataGaps?: unknown }).dataGaps)
            ? ((result as { dataGaps: string[] }).dataGaps?.length ?? 0)
            : 0;
        if (gaps > 0) {
          recordedDataGaps += gaps;
          void recordQualityEvent({
            kind: "data_gap",
            toolName: call.name,
            meta: { count: gaps },
          });
        }
        yield { type: "tool_result", name: call.name, result };
        const extracted = extractArtifactsFromToolResult(result, call.name);
        if (extracted.followUps.length > 0) turnFollowUps = extracted.followUps;
        if (extracted.artifacts.length > 0) turnArtifacts = extracted.artifacts;
        toolOutputs.push({
          type: "function_call_output",
          call_id: call.callId,
          output: JSON.stringify(result),
        });
      }

      // Continue the turn with tool outputs as additional input context.
      inputItems = [
        ...inputItems,
        {
          role: "assistant",
          content:
            assistantText ||
            `Calling tools: ${pendingToolCalls.map((call) => call.name).join(", ")}`,
        },
        {
          role: "user",
          content: `Tool results (JSON):\n${JSON.stringify(
            toolOutputs.map((output) => ({
              call_id: output.call_id,
              output: safeParse(output.output),
            })),
            null,
            2,
          )}\nIf a tool executed successfully and created a file, reply ONLY with a short confirmation like "Done." and the filename. Do not invent success. Do not suggest Excel/Email/Report unless the user asked. Do not ask what PDF to generate when context already established employees.`,
        },
      ];
      assistantText = "";
      pendingToolCalls = [];
    }

    if (!assistantText.trim()) {
      if (turnArtifacts.length > 0) {
        assistantText = `Done.\n\n${turnArtifacts[0]!.filename} is ready.`;
      } else {
        assistantText = "I could not complete that just now. Please try again.";
      }
      yield { type: "delta", text: assistantText };
      void recordQualityEvent({ kind: "hallucination_guard", meta: { reason: "empty_assistant_text" } });
    }

    // Never claim a PDF was generated unless we have a real artifact.
    if (/generated|created|ready/i.test(assistantText) && /pdf/i.test(assistantText) && turnArtifacts.length === 0) {
      assistantText =
        "I could not create the PDF. Please try again, or say “Create a PDF of all employees.”";
    }

    // Prefer concise confirmation when we have a real artifact.
    if (turnArtifacts.length > 0) {
      assistantText = `Done.\n\n${turnArtifacts[0]!.filename} is ready.`;
    }

    void recordQualityEvent({
      kind: "turn",
      durationMs: Date.now() - turnStartedAt,
      success: true,
      meta: { dataGaps: recordedDataGaps, view: context.page.activeView },
    });

    const assistantMessage: AssistantChatMessage = {
      id: createMessageId(),
      role: "assistant",
      content: assistantText,
      createdAt: new Date().toISOString(),
      followUpActions: turnFollowUps.length > 0 ? turnFollowUps : undefined,
      artifacts: turnArtifacts.length > 0 ? turnArtifacts : undefined,
    };

    const saved = await persistTurn({
      session: input.session,
      conversationId: resolved.conversationId,
      history: resolved.history,
      userMessage,
      assistantMessage,
      context,
      title: resolved.title,
    });

    yield {
      type: "done",
      message: assistantMessage,
      conversationId: saved.conversationId,
    };
  } catch (error) {
    yield {
      type: "error",
      error: formatOpenAIError(error),
      retryable: isRetryableOpenAIError(error),
    };
  }
}

function safeParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function createAssistantSseResponse(
  generator: AsyncGenerator<AssistantStreamEvent>,
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of generator) {
          controller.enqueue(encoder.encode(encodeSse(event)));
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            encodeSse({
              type: "error",
              error: formatOpenAIError(error),
              retryable: isRetryableOpenAIError(error),
            }),
          ),
        );
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

import {
  ensureActionModulesRegistered,
  formatPlanReadyMessage,
  redirectManualGuidanceToActionPlan,
  resolveOrchestrationRoute,
} from "./action-orchestration";
import { getAssistantAction } from "./actions/registry";
import { cardsFromArtifacts } from "./execution-card-adapters";
import { eaStage, eaStop, getEaCorrelationId, setEaConversationId } from "./ea-forensic-trace";
import { topicHintFromHistory } from "./intent-router";
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
    return (
      (typeof summary?.message === "string" && summary.message) ||
      `There are currently no employees matching that request. Headcount on file: ${headcount}.`
    );
  }
  const lines = items.slice(0, 40).map((item, index) => {
    const name = String(item.fullName ?? "—");
    const department = String(item.department ?? "—");
    const role = String(item.role ?? "—");
    return `${index + 1}. ${name} — ${department} — ${role}`;
  });
  const more =
    items.length > 40 ? `\n…and ${items.length - 40} more.` : "";
  const lead =
    (typeof summary?.message === "string" && summary.message) ||
    `I found ${items.length} employee${items.length === 1 ? "" : "s"}.`;
  return `${lead}\n\n${lines.join("\n")}${more}`;
}

function formatListedToolReply(
  result: unknown,
  options: {
    emptyFallback: string;
    line: (item: Record<string, unknown>, index: number) => string;
    maxLines?: number;
  },
): string | null {
  if (!result || typeof result !== "object") return null;
  const status = String((result as { status?: string }).status ?? "");
  const summary = (result as { summary?: Record<string, unknown> }).summary;
  if (status === "error" || status === "forbidden") {
    return (
      (typeof (result as { error?: string }).error === "string" &&
        (result as { error: string }).error) ||
      (typeof summary?.message === "string" && summary.message) ||
      "That query could not be completed."
    );
  }
  const items = (result as { items?: Array<Record<string, unknown>> }).items;
  if (!Array.isArray(items)) {
    return typeof summary?.message === "string" ? summary.message : null;
  }
  if (items.length === 0) {
    return (typeof summary?.message === "string" && summary.message) || options.emptyFallback;
  }
  const max = options.maxLines ?? 40;
  const lines = items.slice(0, max).map((item, index) => options.line(item, index));
  const more = items.length > max ? `\n…and ${items.length - max} more.` : "";
  const lead =
    (typeof summary?.message === "string" && summary.message) ||
    `I found ${items.length} result${items.length === 1 ? "" : "s"}.`;
  return `${lead}\n\n${lines.join("\n")}${more}`;
}

function formatDirectListReply(toolName: string, result: unknown): string | null {
  switch (toolName) {
    case "searchEmployees":
      return formatSearchEmployeesReply(result);
    case "searchPerformanceReviews":
      return formatListedToolReply(result, {
        emptyFallback: "There are currently no performance reviews.",
        line: (item, index) =>
          `${index + 1}. ${String(item.employeeName ?? "—")} — ${String(item.reviewPeriod ?? "—")} — ${String(item.status ?? "—")}${
            item.overallRating ? ` — ${String(item.overallRating)}` : ""
          }`,
      });
    case "searchLeave":
      return formatListedToolReply(result, {
        emptyFallback: "There are currently no leave requests matching that request.",
        line: (item, index) =>
          `${index + 1}. ${String(item.employeeName ?? "—")} — ${String(item.type ?? "—")} — ${String(item.startDate ?? "")} → ${String(item.endDate ?? "")} — ${String(item.status ?? "")}`,
      });
    case "searchClients":
      return formatListedToolReply(result, {
        emptyFallback: "There are currently no clients matching that request.",
        line: (item, index) =>
          `${index + 1}. ${String(item.companyName ?? "—")} — ${String(item.accountStatus ?? "—")} — ${String(item.region ?? item.companyCountry ?? "—")} — ${String(item.activeProjects ?? 0)} active projects`,
      });
    case "searchProjects":
      return formatListedToolReply(result, {
        emptyFallback: "There are currently no projects matching that request.",
        line: (item, index) =>
          `${index + 1}. ${String(item.name ?? "—")} — ${String(item.clientName ?? "Internal")} — ${String(item.phase ?? "—")}`,
      });
    case "searchInvoices":
      return formatListedToolReply(result, {
        emptyFallback: "There are currently no outstanding invoices.",
        line: (item, index) =>
          `${index + 1}. ${String(item.clientName ?? "—")} — ${String(item.number ?? "")} — ${Number(item.amount ?? 0).toLocaleString("en-GB", {
            style: "currency",
            currency: String(item.currency ?? "GBP"),
            maximumFractionDigits: 0,
          })} — due ${String(item.dueDate ?? "—")} — ${String(item.status ?? "")}`,
      });
    case "searchExpenses":
      return formatListedToolReply(result, {
        emptyFallback: "There are currently no expenses matching that request.",
        line: (item, index) =>
          `${index + 1}. ${String(item.supplier ?? "—")} — ${Number(item.amount ?? 0).toLocaleString("en-GB", {
            style: "currency",
            currency: String(item.currency ?? "GBP"),
            maximumFractionDigits: 0,
          })} — ${String(item.date ?? "—")}${item.description ? ` — ${String(item.description)}` : ""}`,
      });
    case "platformSearch":
      return formatListedToolReply(result, {
        emptyFallback: "No platform matches.",
        line: (item, index) =>
          `${index + 1}. [${String(item.module ?? "Module")}] ${String(item.label ?? "—")}${
            item.detail ? ` — ${String(item.detail)}` : ""
          }`,
      });
    case "getCashPosition":
    case "getMonthlyPayrollObligation": {
      const summary = (result as { summary?: Record<string, unknown> }).summary;
      return typeof summary?.message === "string" ? summary.message : null;
    }
    default:
      return null;
  }
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

  if (toolName) {
    const listed = formatDirectListReply(toolName, result);
    if (listed) {
      return {
        followUps,
        artifacts: [],
        successText: listed,
        errorText: null,
      };
    }
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
  const messages = [...input.history, input.userMessage, input.assistantMessage];
  const title = titleFromMessages(messages);
  const localId = input.conversationId?.startsWith("local_")
    ? input.conversationId
    : `local_${createMessageId()}`;

  if (!isSupabaseServiceRoleConfigured()) {
    return {
      conversationId: localId,
      title,
    };
  }

  // Only update conversations that already exist in the database (explicit Save Chat).
  // Never auto-create list entries from ordinary chat turns.
  if (input.conversationId && !input.conversationId.startsWith("local_") && input.conversationId !== "pending") {
    const existing = await getConversationForUser(input.conversationId, input.session.sub);
    if (existing) {
      const updated = await updateConversation({
        conversationId: input.conversationId,
        userId: input.session.sub,
        messages,
        workspaceContext: input.context,
        title,
        isSaved: true,
      });
      return { conversationId: updated.id, title: updated.title };
    }
  }

  return {
    conversationId: localId,
    title,
  };
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
    correlationId: getEaCorrelationId(),
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
    ensureActionModulesRegistered();

    // Intent → registered action → propose/execute. Never fall through to workflow teaching.
    const route = await resolveOrchestrationRoute(message, resolved.history, context);
    setEaConversationId(resolved.conversationId);

    if (route.kind === "need_info") {
      eaStage("Intent resolved", {
        actionId: route.actionId,
        confidence: null,
        "extracted input": route.input,
        kind: "need_info",
      });
      eaStop("Intent resolved", "missing required fields — asking user before plan", {
        actionId: route.actionId,
        question: route.message,
      });
      assistantText = route.message;
      yield { type: "delta", text: assistantText };
      const assistantMessage: AssistantChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
        executionCards: route.executionCards,
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
        correlationId: getEaCorrelationId(),
      };
      return;
    }

    if (route.kind === "workflow_read") {
      eaStage("Intent resolved", {
        actionId: null,
        confidence: null,
        "extracted input": null,
        kind: "workflow_read",
      });
      assistantText = route.message;
      yield { type: "delta", text: assistantText };
      const assistantMessage: AssistantChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
        executionCards: route.executionCards,
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
        correlationId: getEaCorrelationId(),
      };
      return;
    }

    if (route.kind === "platform_answer") {
      eaStage("Intent resolved", {
        actionId: null,
        confidence: null,
        "extracted input": null,
        kind: "platform_answer",
      });
      assistantText = route.message;
      yield { type: "delta", text: assistantText };
      const assistantMessage: AssistantChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
        executionCards: route.executionCards,
        followUpActions: route.executionCards
          ?.flatMap((card) =>
            (card.actions ?? [])
              .filter((a) => a.intent === "navigate" && a.href)
              .map((a) => ({
                id: a.id,
                label: a.label,
                kind: "navigate" as const,
                href: a.href,
              })),
          ),
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
        correlationId: getEaCorrelationId(),
      };
      return;
    }

    if (route.kind === "capability_answer") {
      eaStage("Intent resolved", {
        actionId: null,
        confidence: null,
        "extracted input": null,
        kind: "capability_answer",
      });
      assistantText = route.message;
      yield { type: "delta", text: assistantText };
      const assistantMessage: AssistantChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
        executionCards: route.executionCards,
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
        correlationId: getEaCorrelationId(),
      };
      return;
    }

    if (route.kind === "none") {
      eaStage("Intent resolved", {
        actionId: null,
        confidence: null,
        "extracted input": null,
        kind: "none",
      });
      eaStop("Intent resolved", "no executable business action matched — continuing to model tools", {
        message,
      });
    }

    if (route.kind === "tool") {
      const directIntent = route.intent;
      const intentSteps = Array.isArray(directIntent.args.steps)
        ? (directIntent.args.steps as Array<{ actionId?: string; input?: Record<string, unknown> }>)
        : [];
      const intentFirst = intentSteps[0];
      eaStage("Intent resolved", {
        actionId:
          typeof intentFirst?.actionId === "string" ? intentFirst.actionId : directIntent.tool,
        confidence: (() => {
          const match =
            typeof directIntent.reason === "string"
              ? directIntent.reason.match(/confidence=([0-9.]+)/)
              : null;
          return match ? Number(match[1]) : directIntent.reason ?? null;
        })(),
        "extracted input": intentFirst?.input ?? directIntent.args,
        tool: directIntent.tool,
        reason: directIntent.reason,
      });
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

      if (
        (directIntent.tool === "proposeBusinessActionPlan" ||
          directIntent.tool === "planBusinessGoal") &&
        !extracted.errorText
      ) {
        const steps = Array.isArray(directIntent.args.steps)
          ? (directIntent.args.steps as Array<{ actionId?: string; input?: Record<string, unknown> }>)
          : [];
        const first = steps[0];
        const actionId = typeof first?.actionId === "string" ? first.actionId : "";
        const definition = actionId ? getAssistantAction(actionId) : null;
        const primaryFields =
          definition?.capability.entityExtraction?.primaryNameFields ?? [];
        let entityLabel: string | null = null;
        let detail: string | null = null;
        if (first?.input) {
          for (const field of primaryFields) {
            const value = first.input[field];
            if (typeof value === "string" && value.trim()) {
              entityLabel = value.trim();
              break;
            }
          }
          for (const rule of definition?.capability.entityExtraction?.fields ?? []) {
            if (rule.from === "location") {
              const value = first.input[rule.field];
              if (typeof value === "string" && value.trim()) {
                detail = value.trim();
                break;
              }
            }
          }
        }
        const actionName =
          (typeof (result as { items?: Array<{ confirmation?: { title?: string } }> }).items?.[0]
            ?.confirmation?.title === "string" &&
            (result as { items: Array<{ confirmation: { title: string } }> }).items[0].confirmation
              .title) ||
          definition?.name ||
          actionId ||
          "complete that";
        assistantText = formatPlanReadyMessage({
          actionName,
          entityLabel,
          detail,
        });
      } else {
        assistantText =
          extracted.errorText ??
          extracted.successText ??
          "Done.";
      }
      yield { type: "delta", text: assistantText };

      const executionCards = [
        ...(route.executionCards ?? []),
        ...cardsFromArtifacts(turnArtifacts),
      ];

      const assistantMessage: AssistantChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
        followUpActions: turnFollowUps.length > 0 ? turnFollowUps : undefined,
        artifacts: turnArtifacts.length > 0 ? turnArtifacts : undefined,
        executionCards: executionCards.length > 0 ? executionCards : undefined,
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
        correlationId: getEaCorrelationId(),
      };
      return;
    }

    while (toolLoops < 6) {
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

        // Never let workflow/page guidance bypass registered executable actions.
        const redirected = await redirectManualGuidanceToActionPlan(
          call.name,
          message,
          context,
        );
        const effectiveName = redirected?.tool ?? call.name;
        const effectiveArgs = redirected?.args ?? call.arguments;

        if (redirected) {
          yield {
            type: "tool_call",
            name: effectiveName,
            arguments: effectiveArgs,
          };
        }

        const result = await executeAssistantTool(effectiveName, effectiveArgs, context);
        const status =
          result && typeof result === "object" && "status" in result
            ? String((result as { status?: string }).status)
            : "ok";
        const success = status === "ok" || status === "partial";
        void recordQualityEvent({
          kind: success ? "tool_success" : "tool_error",
          toolName: effectiveName,
          durationMs: Date.now() - toolStarted,
          success,
          meta: {
            status,
            redirectedFrom: redirected ? call.name : undefined,
          },
        });
        const gaps =
          result && typeof result === "object" && Array.isArray((result as { dataGaps?: unknown }).dataGaps)
            ? ((result as { dataGaps: string[] }).dataGaps?.length ?? 0)
            : 0;
        if (gaps > 0) {
          recordedDataGaps += gaps;
          void recordQualityEvent({
            kind: "data_gap",
            toolName: effectiveName,
            meta: { count: gaps },
          });
        }
        yield { type: "tool_result", name: effectiveName, result };
        const extracted = extractArtifactsFromToolResult(result, effectiveName);
        if (extracted.followUps.length > 0) turnFollowUps = extracted.followUps;
        if (extracted.artifacts.length > 0) turnArtifacts = extracted.artifacts;

        // Action Framework / Planning Engine proposals end the turn — do not let the
        // model continue with manual navigation instructions.
        if (
          effectiveName === "proposeBusinessActionPlan" ||
          effectiveName === "planBusinessGoal"
        ) {
          assistantText =
            extracted.errorText ??
            extracted.successText ??
            (typeof (result as { summary?: { message?: string } })?.summary?.message ===
            "string"
              ? (result as { summary: { message: string } }).summary.message
              : "Action plan ready for approval.");
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
          )}\nIf tools returned live business data (queryBusiness, search*, brief, health, insights), answer the user's question directly with those facts — never refuse as out of scope. If a tool created a file (status=ok + artifact), reply briefly that the filename is ready. Do not invent success. Do not suggest Excel/Email/Report menus unless asked.`,
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
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("[EA] EXCEPTION — SSE stream");
        console.error(`- correlationId: ${getEaCorrelationId()}`);
        console.error(`- message: ${err.message}`);
        console.error(`- stack: ${err.stack ?? "(no stack)"}`);
        if (err.stack) console.error(err.stack);
        controller.enqueue(
          encoder.encode(
            encodeSse({
              type: "error",
              error: err.message,
              stack: err.stack ?? null,
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

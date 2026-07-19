import { getVercelOidcToken } from "@vercel/oidc";

export const EXECUTIVE_ASSISTANT_MODEL = "openai/gpt-4o-mini";
export const EXECUTIVE_ASSISTANT_OPENAI_MODEL = "gpt-4o-mini";

const AI_GATEWAY_CHAT_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export type ExecutiveAssistantChatRole = "user" | "assistant";

export type ExecutiveAssistantChatTurn = {
  role: ExecutiveAssistantChatRole;
  content: string;
};

export type ExecutiveAssistantAuthMode = "ai_gateway_key" | "vercel_oidc" | "openai_direct";

const SYSTEM_PROMPT_BASE = `You are the Executive Assistant for Unit311 Central, an internal operations platform for leadership.

Help with pipeline, CRM, clients, projects, finance, operations, and board materials. Be concise and professional — usually 2–4 short paragraphs unless the user asks for more detail.

Platform areas (direct users here when relevant):
- CRM & pipeline: Business Central → CRM
- Clients: Client Directory
- Projects: Projects workspace
- Finance: Business Central → Financials (Debtors, Creditors, Expenses)
- Board packs: Strategy → Board deck
- Strategy: Strategy matrix and whiteboard

Rules:
- When a live platform snapshot is provided, use those figures and names for operational answers.
- Do not invent financial figures, client names, or metrics that are not in the snapshot or user message.
- If live data is missing or a module is unavailable, say so and point to the relevant workspace.
- Prefer actionable, board-ready language.`;

function buildSystemPrompt(platformContext?: string) {
  if (!platformContext?.trim()) {
    return SYSTEM_PROMPT_BASE;
  }

  return `${SYSTEM_PROMPT_BASE}

Live platform snapshot (JSON, server-fetched at request time):
${platformContext}`;
}

async function resolveExecutiveAssistantCredentials(): Promise<{
  url: string;
  token: string;
  model: string;
  authMode: ExecutiveAssistantAuthMode;
}> {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    return {
      url: AI_GATEWAY_CHAT_URL,
      token: gatewayKey,
      model: EXECUTIVE_ASSISTANT_MODEL,
      authMode: "ai_gateway_key",
    };
  }

  let oidcError: string | null = null;
  try {
    const oidcToken = (await getVercelOidcToken()).trim();
    if (oidcToken) {
      return {
        url: AI_GATEWAY_CHAT_URL,
        token: oidcToken,
        model: EXECUTIVE_ASSISTANT_MODEL,
        authMode: "vercel_oidc",
      };
    }
  } catch (error) {
    oidcError = error instanceof Error ? error.message : "OIDC token unavailable";
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    return {
      url: OPENAI_CHAT_URL,
      token: openAiKey,
      model: EXECUTIVE_ASSISTANT_OPENAI_MODEL,
      authMode: "openai_direct",
    };
  }

  if (process.env.VERCEL) {
    throw new Error(
      oidcError ??
        "Vercel AI Gateway OIDC token unavailable. Enable OIDC for this project or set AI_GATEWAY_API_KEY in Vercel env.",
    );
  }

  throw new Error(
    "No AI credentials configured. Run `vercel env pull` after `vercel link`, or set AI_GATEWAY_API_KEY / OPENAI_API_KEY.",
  );
}

export async function completeExecutiveAssistantChat(
  messages: ExecutiveAssistantChatTurn[],
  platformContext?: string,
): Promise<{ content: string; model: string; authMode: ExecutiveAssistantAuthMode }> {
  const credentials = await resolveExecutiveAssistantCredentials();

  const response = await fetch(credentials.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: credentials.model,
      messages: [{ role: "system", content: buildSystemPrompt(platformContext) }, ...messages],
      max_tokens: 512,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (errorBody.includes("customer_verification_required")) {
      throw new Error(
        "Vercel AI Gateway needs a payment method on your Vercel account. Add a card once at vercel.com → AI to unlock free credits.",
      );
    }
    throw new Error(errorBody || `AI request failed (${response.status})`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty response from AI.");
  }

  return {
    content,
    model: credentials.model,
    authMode: credentials.authMode,
  };
}

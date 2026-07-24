/**
 * Production forensic trace for Executive Assistant executable actions.
 * One correlationId per chat→approve→execute chain. Logs are the source of truth.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";

export type EaTraceStore = {
  correlationId: string;
  conversationId: string | null;
  planId: string | null;
  stopped: boolean;
  stopReason: string | null;
};

const storage = new AsyncLocalStorage<EaTraceStore>();

/** Survives within a warm isolate so Approve can reattach to the chat correlation. */
const planCorrelation = new Map<string, string>();
const MAX_PLAN_BINDINGS = 200;

export function createEaCorrelationId(): string {
  return `ea_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

export function runWithEaTrace<T>(
  init: { correlationId: string; conversationId?: string | null },
  fn: () => T,
): T {
  return storage.run(
    {
      correlationId: init.correlationId,
      conversationId: init.conversationId ?? null,
      planId: null,
      stopped: false,
      stopReason: null,
    },
    fn,
  );
}

export async function runWithEaTraceAsync<T>(
  init: { correlationId: string; conversationId?: string | null },
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(
    {
      correlationId: init.correlationId,
      conversationId: init.conversationId ?? null,
      planId: null,
      stopped: false,
      stopReason: null,
    },
    fn,
  );
}

export function getEaTrace(): EaTraceStore | undefined {
  return storage.getStore();
}

export function getEaCorrelationId(): string {
  return storage.getStore()?.correlationId ?? "MISSING_CORRELATION_ID";
}

export function setEaConversationId(conversationId: string | null | undefined) {
  const store = storage.getStore();
  if (store && conversationId) store.conversationId = conversationId;
}

export function setEaPlanId(planId: string) {
  const store = storage.getStore();
  if (store) store.planId = planId;
  bindPlanCorrelation(planId, getEaCorrelationId());
}

export function bindPlanCorrelation(planId: string, correlationId: string) {
  if (!planId || !correlationId || correlationId === "MISSING_CORRELATION_ID") return;
  planCorrelation.set(planId, correlationId);
  if (planCorrelation.size > MAX_PLAN_BINDINGS) {
    const oldest = planCorrelation.keys().next().value;
    if (oldest) planCorrelation.delete(oldest);
  }
}

export function correlationForPlan(planId: string): string | undefined {
  return planCorrelation.get(planId);
}

function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Exact multi-line stage log the operator greps in Vercel.
 * Title matches the checklist names (without the [EA] prefix argument).
 */
export function eaStage(title: string, fields: Record<string, unknown> = {}) {
  const store = storage.getStore();
  const correlationId =
    (typeof fields.correlationId === "string" && fields.correlationId) ||
    store?.correlationId ||
    "MISSING_CORRELATION_ID";

  console.info(`[EA] ${title}`);
  console.info(`- correlationId: ${correlationId}`);
  for (const [key, value] of Object.entries(fields)) {
    if (key === "correlationId") continue;
    console.info(`- ${key}: ${formatValue(value)}`);
  }
}

/** Stage did not / cannot continue. Logs why. Does not throw. */
export function eaStop(stage: string, reason: string, fields: Record<string, unknown> = {}) {
  const store = storage.getStore();
  if (store) {
    store.stopped = true;
    store.stopReason = reason;
  }
  console.error(`[EA] STOPPED — ${stage}`);
  console.error(`- correlationId: ${getEaCorrelationId()}`);
  console.error(`- reason: ${reason}`);
  for (const [key, value] of Object.entries(fields)) {
    console.error(`- ${key}: ${formatValue(value)}`);
  }
}

/** Never swallow — always log full stack, then rethrow. */
export function eaRethrow(stage: string, error: unknown, fields: Record<string, unknown> = {}): never {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[EA] EXCEPTION — ${stage}`);
  console.error(`- correlationId: ${getEaCorrelationId()}`);
  console.error(`- message: ${err.message}`);
  for (const [key, value] of Object.entries(fields)) {
    console.error(`- ${key}: ${formatValue(value)}`);
  }
  console.error(`- stack: ${err.stack ?? "(no stack)"}`);
  if (err.stack) {
    console.error(err.stack);
  }
  throw err;
}

export function resolveIncomingCorrelationId(input: {
  header?: string | null;
  body?: string | null;
  planId?: string | null;
}): string {
  const fromHeader = input.header?.trim();
  if (fromHeader) return fromHeader;
  const fromBody = input.body?.trim();
  if (fromBody) return fromBody;
  if (input.planId) {
    const bound = correlationForPlan(input.planId);
    if (bound) return bound;
  }
  return createEaCorrelationId();
}

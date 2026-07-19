import { randomUUID } from "node:crypto";

import {
  DEFAULT_TREASURY_SETTINGS,
  type TreasuryActivityItem,
  type TreasuryAuditEntry,
  type TreasuryNotification,
  type TreasuryRecipientMeta,
  type TreasurySettings,
  type TreasuryTransferApproval,
  type TreasuryTransferRequestPayload,
} from "@/lib/treasury/treasury-types";
import {
  resolveFinancialsWorkspaceId,
  type FinancialsWorkspaceScope,
} from "@/lib/financials-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type MemoryStore = {
  settingsByWorkspace: Map<string, TreasurySettings>;
  approvals: TreasuryTransferApproval[];
  notifications: TreasuryNotification[];
  recipientMeta: Map<number, TreasuryRecipientMeta>;
  auditLog: TreasuryAuditEntry[];
  activity: TreasuryActivityItem[];
};

const memory: MemoryStore = {
  settingsByWorkspace: new Map(),
  approvals: [],
  notifications: [],
  recipientMeta: new Map(),
  auditLog: [],
  activity: [],
};

function nowIso() {
  return new Date().toISOString();
}

function supabaseClient() {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseServerClient();
}

async function loadSettingsFromDb(workspaceId: string): Promise<TreasurySettings | null> {
  const supabase = supabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("treasury_settings")
    .select("data")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error?.message?.includes("treasury_settings")) return null;
  if (error?.message?.includes("workspace_id")) {
    // Pre-migration fallback: legacy single row.
    const legacy = await supabase.from("treasury_settings").select("data").eq("id", 1).maybeSingle();
    if (legacy.error) return null;
    if (!legacy.data?.data) return null;
    return { ...DEFAULT_TREASURY_SETTINGS, ...(legacy.data.data as Partial<TreasurySettings>) };
  }
  if (error) throw new Error(error.message);
  if (!data?.data) return null;

  return { ...DEFAULT_TREASURY_SETTINGS, ...(data.data as Partial<TreasurySettings>) };
}

async function saveSettingsToDb(workspaceId: string, settings: TreasurySettings) {
  const supabase = supabaseClient();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from("treasury_settings")
    .select("id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("treasury_settings")
      .update({
        data: settings,
        updated_at: nowIso(),
      })
      .eq("id", existing.id)
      .eq("workspace_id", workspaceId);
    if (error && !error.message.includes("treasury_settings")) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("treasury_settings").insert({
    workspace_id: workspaceId,
    data: settings,
    updated_at: nowIso(),
  });

  if (error && !error.message.includes("treasury_settings")) {
    throw new Error(error.message);
  }
}

export async function getTreasurySettings(
  scope?: FinancialsWorkspaceScope,
): Promise<TreasurySettings> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  try {
    const fromDb = await loadSettingsFromDb(workspaceId);
    if (fromDb) {
      memory.settingsByWorkspace.set(workspaceId, fromDb);
      return fromDb;
    }
  } catch {
    // fall back to memory
  }
  return memory.settingsByWorkspace.get(workspaceId) ?? { ...DEFAULT_TREASURY_SETTINGS };
}

export async function saveTreasurySettings(
  settings: TreasurySettings,
  scope?: FinancialsWorkspaceScope,
): Promise<TreasurySettings> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  memory.settingsByWorkspace.set(workspaceId, settings);
  try {
    await saveSettingsToDb(workspaceId, settings);
  } catch {
    // memory fallback
  }
  return settings;
}

export async function listTreasuryNotifications(limit = 50): Promise<TreasuryNotification[]> {
  return memory.notifications
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function addTreasuryNotification(
  input: Omit<TreasuryNotification, "id" | "read" | "createdAt">,
): Promise<TreasuryNotification> {
  const notification: TreasuryNotification = {
    id: randomUUID(),
    read: false,
    createdAt: nowIso(),
    ...input,
  };
  memory.notifications = [notification, ...memory.notifications].slice(0, 200);
  return notification;
}

export async function markTreasuryNotificationRead(id: string) {
  memory.notifications = memory.notifications.map((entry) =>
    entry.id === id ? { ...entry, read: true } : entry,
  );
}

export async function listTreasuryActivity(limit = 30): Promise<TreasuryActivityItem[]> {
  return memory.activity
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function addTreasuryActivity(
  input: Omit<TreasuryActivityItem, "id" | "createdAt">,
): Promise<TreasuryActivityItem> {
  const item: TreasuryActivityItem = {
    id: randomUUID(),
    createdAt: nowIso(),
    ...input,
  };
  memory.activity = [item, ...memory.activity].slice(0, 500);
  return item;
}

export async function appendTreasuryAudit(input: {
  actor: string;
  actorName: string;
  action: string;
  details: string;
}) {
  const entry: TreasuryAuditEntry = {
    id: randomUUID(),
    createdAt: nowIso(),
    ...input,
  };
  memory.auditLog = [entry, ...memory.auditLog].slice(0, 1000);
  return entry;
}

export async function listTreasuryApprovals(): Promise<TreasuryTransferApproval[]> {
  return memory.approvals
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTreasuryApproval(id: string) {
  return memory.approvals.find((entry) => entry.id === id) ?? null;
}

export async function createTreasuryApproval(input: {
  requestedBy: string;
  requestedByName: string;
  payload: TreasuryTransferRequestPayload;
}): Promise<TreasuryTransferApproval> {
  const approval: TreasuryTransferApproval = {
    id: randomUUID(),
    status: "pending",
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    approver: null,
    approverName: null,
    approvedAt: null,
    rejectionReason: null,
    payload: input.payload,
    auditTrail: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  memory.approvals = [approval, ...memory.approvals];
  return approval;
}

export async function resolveTreasuryApproval(input: {
  id: string;
  status: "approved" | "rejected";
  approver: string;
  approverName: string;
  reason?: string;
}) {
  const existing = memory.approvals.find((entry) => entry.id === input.id);
  if (!existing) throw new Error("Approval request not found.");
  if (existing.status !== "pending") throw new Error("Approval request is no longer pending.");

  const auditEntry = await appendTreasuryAudit({
    actor: input.approver,
    actorName: input.approverName,
    action: input.status === "approved" ? "approval_granted" : "approval_rejected",
    details: input.reason ?? `${input.status} transfer approval ${input.id}`,
  });

  const next: TreasuryTransferApproval = {
    ...existing,
    status: input.status,
    approver: input.approver,
    approverName: input.approverName,
    approvedAt: nowIso(),
    rejectionReason: input.status === "rejected" ? input.reason ?? "Rejected" : null,
    auditTrail: [...existing.auditTrail, auditEntry],
    updatedAt: nowIso(),
  };

  memory.approvals = memory.approvals.map((entry) => (entry.id === input.id ? next : entry));
  return next;
}

export async function getRecipientMetaMap(): Promise<Map<number, TreasuryRecipientMeta>> {
  return new Map(memory.recipientMeta);
}

export async function upsertRecipientMeta(
  wiseRecipientId: number,
  patch: Partial<Omit<TreasuryRecipientMeta, "wiseRecipientId">>,
) {
  const existing = memory.recipientMeta.get(wiseRecipientId) ?? {
    wiseRecipientId,
    favourite: false,
    lastUsedAt: null,
    label: null,
  };

  const next: TreasuryRecipientMeta = {
    ...existing,
    ...patch,
    wiseRecipientId,
  };

  memory.recipientMeta.set(wiseRecipientId, next);
  return next;
}

export async function getDailyTransferTotal(currency: string) {
  const today = new Date().toISOString().slice(0, 10);
  return memory.activity
    .filter(
      (item) =>
        item.type === "money_sent" &&
        item.currency === currency &&
        item.createdAt.slice(0, 10) === today,
    )
    .reduce((sum, item) => sum + (item.amount ?? 0), 0);
}

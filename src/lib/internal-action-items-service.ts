import {
  ensureInternalActionItemsTable,
  withInternalActionItemsTable,
} from "@/lib/internal-db-migrations";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  INTERNAL_WORKSPACE_SLUG,
  requireCurrentWorkspace,
  resolveWorkspaceBinding,
} from "@/lib/workspace-context";

export type InternalActionItem = {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  task: string;
  assignedTo: string;
  due: string;
  href: string | null;
  crmLeadId: string | null;
  bookingId: string | null;
  dueAt: string | null;
  createdAt: string;
};

export type ActionItemsWorkspaceScope = {
  workspaceId?: string | null;
  limit?: number;
};

type DbActionItem = {
  id: string;
  priority: string;
  task: string;
  assigned_to: string;
  due_label: string;
  due_at: string | null;
  href: string | null;
  crm_lead_id: string | null;
  booking_id: string | null;
  completed_at: string | null;
  created_at: string;
  workspace_id?: string | null;
};

type DbFounderSessionBooking = {
  id: string;
  name: string;
  organization: string;
  starts_at: string;
  crm_lead_id: string | null;
  status: string | null;
  created_at: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function mapActionItem(row: DbActionItem): InternalActionItem {
  return {
    id: row.id,
    priority:
      row.priority === "critical" ||
      row.priority === "high" ||
      row.priority === "medium" ||
      row.priority === "low"
        ? row.priority
        : "high",
    task: row.task,
    assignedTo: row.assigned_to,
    due: row.due_label,
    href: row.href,
    crmLeadId: row.crm_lead_id,
    bookingId: row.booking_id,
    dueAt: row.due_at,
    createdAt: row.created_at,
  };
}

async function resolveActionItemsWorkspaceId(
  scope?: ActionItemsWorkspaceScope,
): Promise<string> {
  const explicit = scope?.workspaceId?.trim();
  if (explicit) return explicit;

  try {
    return (await requireCurrentWorkspace()).id;
  } catch {
    // System writers (e.g. booking hooks without a platform session) stamp Internal.
    const workspace = await resolveWorkspaceBinding({ fallbackInternal: true });
    if (!workspace) throw new Error("Workspace context is required.");
    return workspace.id;
  }
}

/**
 * List open action items for the current workspace only.
 * Accepts legacy `listOpenActionItems(8)` numeric limit for existing callers.
 */
export async function listOpenActionItems(
  limitOrScope: number | ActionItemsWorkspaceScope = 20,
): Promise<InternalActionItem[]> {
  const scope: ActionItemsWorkspaceScope =
    typeof limitOrScope === "number" ? { limit: limitOrScope } : limitOrScope ?? {};
  const limit = scope.limit ?? 20;
  const workspaceId = await resolveActionItemsWorkspaceId(scope);

  await ensureInternalActionItemsTable().catch(() => false);

  // Booking sync is Internal-workspace only (founder sessions are platform ops).
  try {
    const workspace = await requireCurrentWorkspace().catch(() => null);
    if (workspace?.slug === INTERNAL_WORKSPACE_SLUG) {
      await syncBookingActionItems({ workspaceId: workspace.id }).catch(() => undefined);
    }
  } catch {
    // Ignore sync failures — list still returns workspace-scoped rows.
  }

  try {
    return await withInternalActionItemsTable(async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("internal_action_items")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("completed_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return ((data ?? []) as DbActionItem[]).map(mapActionItem);
    });
  } catch {
    return [];
  }
}

export async function createActionItem(input: {
  priority?: InternalActionItem["priority"];
  task: string;
  assignedTo?: string;
  dueLabel: string;
  dueAt?: string | null;
  href?: string | null;
  crmLeadId?: string | null;
  bookingId?: string | null;
  workspaceId?: string | null;
}) {
  const workspaceId = await resolveActionItemsWorkspaceId({
    workspaceId: input.workspaceId,
  });

  return withInternalActionItemsTable(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("internal_action_items")
      .insert({
        workspace_id: workspaceId,
        priority: input.priority ?? "high",
        task: input.task.trim(),
        assigned_to: input.assignedTo?.trim() || "Team",
        due_label: input.dueLabel.trim(),
        due_at: input.dueAt ?? null,
        href: input.href ?? null,
        crm_lead_id: input.crmLeadId ?? null,
        booking_id: input.bookingId ?? null,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapActionItem(data as DbActionItem);
  });
}

async function autoCompleteActionItemsForFinishedBookings(
  workspaceId: string,
): Promise<number> {
  const tableReady = await ensureInternalActionItemsTable().catch(() => false);
  if (!tableReady) return 0;

  const supabase = requireSupabase();
  const now = new Date().toISOString();

  const { data: finishedBookings, error: bookingsError } = await supabase
    .from("founder_session_bookings")
    .select("id")
    .in("status", ["completed", "cancelled"]);

  if (bookingsError) {
    if (bookingsError.message.includes("founder_session_bookings")) return 0;
    throw new Error(bookingsError.message);
  }

  const bookingIds = (finishedBookings ?? [])
    .map((row) => row.id as string)
    .filter(Boolean);
  if (bookingIds.length === 0) return 0;

  const { data, error } = await supabase
    .from("internal_action_items")
    .update({ completed_at: now })
    .eq("workspace_id", workspaceId)
    .is("completed_at", null)
    .in("booking_id", bookingIds)
    .select("id");

  if (error) {
    if (error.message.includes("internal_action_items")) return 0;
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

export async function syncBookingActionItems(
  scope?: ActionItemsWorkspaceScope,
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const tableReady = await ensureInternalActionItemsTable().catch(() => false);
  if (!tableReady) return 0;

  const workspaceId = await resolveActionItemsWorkspaceId(scope);
  await autoCompleteActionItemsForFinishedBookings(workspaceId).catch(() => undefined);

  const supabase = requireSupabase();
  const { data: bookings, error: bookingsError } = await supabase
    .from("founder_session_bookings")
    .select("id, name, organization, starts_at, crm_lead_id, status")
    .or("status.is.null,status.eq.scheduled,status.eq.postponed")
    .order("created_at", { ascending: false })
    .limit(50);

  if (bookingsError) {
    if (bookingsError.message.includes("founder_session_bookings")) return 0;
    throw new Error(bookingsError.message);
  }

  const { data: existingItems, error: existingError } = await supabase
    .from("internal_action_items")
    .select("booking_id")
    .eq("workspace_id", workspaceId)
    .is("completed_at", null)
    .not("booking_id", "is", null);

  if (existingError) {
    if (existingError.message.includes("internal_action_items")) return 0;
    throw new Error(existingError.message);
  }

  const coveredBookingIds = new Set(
    (existingItems ?? [])
      .map((row) => row.booking_id as string | null)
      .filter((value): value is string => Boolean(value)),
  );

  let created = 0;
  for (const booking of (bookings ?? []) as DbFounderSessionBooking[]) {
    if (coveredBookingIds.has(booking.id)) continue;

    const gmtWhen = formatLondonDateTime(booking.starts_at);
    await createActionItem({
      priority: "high",
      task: `Executive session booked — ${booking.organization} (${booking.name})`,
      assignedTo: "Team",
      dueLabel: gmtWhen,
      dueAt: booking.starts_at,
      href: "/internaldashboard?view=crm-meetings",
      crmLeadId: booking.crm_lead_id,
      bookingId: booking.id,
      workspaceId,
    });
    created += 1;
    coveredBookingIds.add(booking.id);
  }

  return created;
}

export async function completeActionItemsForLead(
  crmLeadId: string,
  bookingIds: string[] = [],
  scope?: ActionItemsWorkspaceScope,
): Promise<number> {
  const workspaceId = await resolveActionItemsWorkspaceId(scope);

  return withInternalActionItemsTable(async () => {
    const supabase = requireSupabase();
    const now = new Date().toISOString();
    const filters = [`crm_lead_id.eq.${crmLeadId}`];
    for (const bookingId of bookingIds) {
      filters.push(`booking_id.eq.${bookingId}`);
    }

    const { data, error } = await supabase
      .from("internal_action_items")
      .update({ completed_at: now })
      .eq("workspace_id", workspaceId)
      .is("completed_at", null)
      .or(filters.join(","))
      .select("id");

    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  });
}

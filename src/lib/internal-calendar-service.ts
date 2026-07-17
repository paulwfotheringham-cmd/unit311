import {
  createBlankEventInput,
  mapCalendarEvent,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/calendar-data";
import type { CalendarWorkspaceScope } from "@/lib/calendar-workspace";
import { resolveCalendarWorkspaceId } from "@/lib/calendar-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbCalendarEvent = Parameters<typeof mapCalendarEvent>[0];

function requireCalendarSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

export async function listCalendarEvents(
  from?: string,
  to?: string,
  scope?: CalendarWorkspaceScope,
): Promise<CalendarEvent[]> {
  const workspaceId = await resolveCalendarWorkspaceId(scope);
  const supabase = requireCalendarSupabase();
  let query = supabase
    .from("internal_calendar_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("starts_at", { ascending: true });

  if (from) query = query.gte("starts_at", from);
  if (to) query = query.lte("starts_at", to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as DbCalendarEvent[]).map(mapCalendarEvent);
}

export async function getCalendarEvent(
  id: string,
  scope?: CalendarWorkspaceScope,
): Promise<CalendarEvent | null> {
  const workspaceId = await resolveCalendarWorkspaceId(scope);
  const supabase = requireCalendarSupabase();
  const { data, error } = await supabase
    .from("internal_calendar_events")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapCalendarEvent(data as DbCalendarEvent) : null;
}

/** Throws if the event is missing or belongs to another workspace. */
export async function requireCalendarEventInWorkspace(
  id: string,
  scope?: CalendarWorkspaceScope,
): Promise<CalendarEvent> {
  const event = await getCalendarEvent(id, scope);
  if (!event) {
    throw new Error("Calendar event not found.");
  }
  return event;
}

export async function createCalendarEvent(
  input: {
    title: string;
    eventType?: CalendarEventType;
    startsAt: string;
    endsAt: string;
    clientName?: string;
    location?: string;
    notes?: string;
  },
  scope?: CalendarWorkspaceScope,
): Promise<CalendarEvent> {
  const workspaceId = await resolveCalendarWorkspaceId(scope);
  const supabase = requireCalendarSupabase();
  const blank = createBlankEventInput();

  const { data, error } = await supabase
    .from("internal_calendar_events")
    .insert({
      workspace_id: workspaceId,
      title: input.title.trim(),
      event_type: input.eventType ?? blank.eventType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      client_name: input.clientName?.trim() || null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCalendarEvent(data as DbCalendarEvent);
}

export async function updateCalendarEvent(
  id: string,
  patch: Partial<{
    title: string;
    eventType: CalendarEventType;
    startsAt: string;
    endsAt: string;
    clientName: string;
    location: string;
    notes: string;
  }>,
  scope?: CalendarWorkspaceScope,
): Promise<CalendarEvent> {
  const workspaceId = await resolveCalendarWorkspaceId(scope);
  const supabase = requireCalendarSupabase();
  await requireCalendarEventInWorkspace(id, { workspaceId });

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.eventType !== undefined) payload.event_type = patch.eventType;
  if (patch.startsAt !== undefined) payload.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) payload.ends_at = patch.endsAt;
  if (patch.clientName !== undefined) payload.client_name = patch.clientName.trim() || null;
  if (patch.location !== undefined) payload.location = patch.location.trim() || null;
  if (patch.notes !== undefined) payload.notes = patch.notes.trim() || null;

  const { data, error } = await supabase
    .from("internal_calendar_events")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCalendarEvent(data as DbCalendarEvent);
}

export async function deleteCalendarEvent(id: string, scope?: CalendarWorkspaceScope) {
  const workspaceId = await resolveCalendarWorkspaceId(scope);
  const supabase = requireCalendarSupabase();
  await requireCalendarEventInWorkspace(id, { workspaceId });

  const { error } = await supabase
    .from("internal_calendar_events")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

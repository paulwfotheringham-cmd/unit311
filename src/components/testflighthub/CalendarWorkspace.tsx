"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CALENDAR_EVENT_TYPE_OPTIONS,
  combineDateAndTime,
  createBlankEventInput,
  dateKeyFromIso,
  eventTypeClass,
  eventTypeLabel,
  formatEventTimeRange,
  getMonthGrid,
  isSameDay,
  toDateInputValue,
  toDateKey,
  toTimeInputValue,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/calendar-data";
import type { ManagedClient } from "@/lib/client-management-data";
import { createInitialUsers, type ManagedUser } from "@/lib/user-management-data";
import { cn } from "@/lib/utils";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

type EventDraft = {
  id: string | null;
  title: string;
  eventType: CalendarEventType;
  date: string;
  startTime: string;
  endTime: string;
  clientName: string;
  location: string;
  notes: string;
};

function eventToDraft(event: CalendarEvent): EventDraft {
  return {
    id: event.id,
    title: event.title,
    eventType: event.eventType,
    date: toDateInputValue(event.startsAt),
    startTime: toTimeInputValue(event.startsAt),
    endTime: toTimeInputValue(event.endsAt),
    clientName: event.clientName ?? "",
    location: event.location ?? "",
    notes: event.notes ?? "",
  };
}

function blankDraft(date: Date): EventDraft {
  const blank = createBlankEventInput(date);
  return {
    id: null,
    title: "",
    eventType: blank.eventType,
    date: toDateInputValue(blank.startsAt),
    startTime: toTimeInputValue(blank.startsAt),
    endTime: toTimeInputValue(blank.endsAt),
    clientName: "",
    location: "",
    notes: "",
  };
}

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type TimeRangeView = "today" | "week" | "month" | "quarter";

const TIME_RANGE_OPTIONS: { value: TimeRangeView; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
];

type CalendarWorkspaceProps = {
  users?: ManagedUser[];
  clients?: ManagedClient[];
};

function getWeekStart(date: Date) {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekDays(date: Date) {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function getQuarterMonths(date: Date) {
  const quarterStart = Math.floor(date.getMonth() / 3) * 3;
  return [0, 1, 2].map((offset) => new Date(date.getFullYear(), quarterStart + offset, 1));
}

function matchesEventFilters(
  event: CalendarEvent,
  searchQuery: string,
  filterUserId: string,
  eventTypeFilter: string,
  clientInteractionsOnly: boolean,
  users: ManagedUser[],
) {
  const query = searchQuery.trim().toLowerCase();
  if (query) {
    const haystack =
      `${event.title} ${event.notes ?? ""} ${event.location ?? ""} ${event.clientName ?? ""}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (eventTypeFilter !== "all" && event.eventType !== eventTypeFilter) return false;

  if (clientInteractionsOnly) {
    const isClientEvent = event.eventType === "onsite" || Boolean(event.clientName?.trim());
    if (!isClientEvent) return false;
  }

  if (filterUserId !== "all") {
    const user = users.find((entry) => entry.id === filterUserId);
    if (!user) return false;
    const haystack = `${event.title} ${event.notes ?? ""}`.toLowerCase();
    const fullName = user.fullName.trim().toLowerCase();
    const username = user.username.trim().toLowerCase();
    if (!haystack.includes(fullName) && !(username.length > 0 && haystack.includes(username))) {
      return false;
    }
  }

  return true;
}

export default function CalendarWorkspace({
  users = createInitialUsers(),
  clients = [],
}: CalendarWorkspaceProps) {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date(today));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventDraft>(() => blankDraft(today));
  const [editing, setEditing] = useState(false);
  const [timeRangeView, setTimeRangeView] = useState<TimeRangeView>("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUserId, setFilterUserId] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [clientInteractionsOnly, setClientInteractionsOnly] = useState(false);
  const { showDetail, openDetail, closeDetail } = useMobileDetailPanel();

  const periodLabel = useMemo(() => {
    if (timeRangeView === "today") {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(selectedDate);
    }
    if (timeRangeView === "week") {
      const days = getWeekDays(selectedDate);
      const start = days[0];
      const end = days[6];
      const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
      return `${fmt.format(start)} – ${fmt.format(end)}, ${end.getFullYear()}`;
    }
    if (timeRangeView === "quarter") {
      const months = getQuarterMonths(viewDate);
      const fmt = new Intl.DateTimeFormat(undefined, { month: "short" });
      return `Q${Math.floor(viewDate.getMonth() / 3) + 1} · ${fmt.format(months[0])} – ${fmt.format(months[2])} ${viewDate.getFullYear()}`;
    }
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(viewDate);
  }, [selectedDate, timeRangeView, viewDate]);

  const monthGrid = useMemo(
    () => getMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const quarterMonths = useMemo(() => getQuarterMonths(viewDate), [viewDate]);

  const visibleDates = useMemo(() => {
    if (timeRangeView === "today") return [selectedDate];
    if (timeRangeView === "week") return weekDays;
    if (timeRangeView === "quarter") {
      return quarterMonths.flatMap((monthStart) =>
        getMonthGrid(monthStart.getFullYear(), monthStart.getMonth()),
      );
    }
    return monthGrid;
  }, [monthGrid, quarterMonths, selectedDate, timeRangeView, weekDays]);

  const rangeFrom = useMemo(() => {
    const start = visibleDates[0];
    return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0).toISOString();
  }, [visibleDates]);

  const rangeTo = useMemo(() => {
    const end = visibleDates[visibleDates.length - 1];
    return new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString();
  }, [visibleDates]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (
        !matchesEventFilters(
          event,
          searchQuery,
          filterUserId,
          eventTypeFilter,
          clientInteractionsOnly,
          users,
        )
      ) {
        continue;
      }
      const key = dateKeyFromIso(event.startsAt);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return map;
  }, [clientInteractionsOnly, eventTypeFilter, events, filterUserId, searchQuery, users]);

  const selectedDateKey = toDateKey(selectedDate);
  const selectedDayEvents = eventsByDate.get(selectedDateKey) ?? [];

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ from: rangeFrom, to: rangeTo });
      const response = await fetch(`/api/calendar/events?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await readApiJson<{ events?: CalendarEvent[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load calendar");

      setEvents(data.events ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load calendar");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  function goToPreviousPeriod() {
    if (timeRangeView === "today") {
      setSelectedDate((current) => {
        const next = new Date(current);
        next.setDate(next.getDate() - 1);
        return next;
      });
      return;
    }
    if (timeRangeView === "week") {
      setSelectedDate((current) => {
        const next = new Date(current);
        next.setDate(next.getDate() - 7);
        return next;
      });
      return;
    }
    if (timeRangeView === "quarter") {
      setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 3, 1));
      return;
    }
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function goToNextPeriod() {
    if (timeRangeView === "today") {
      setSelectedDate((current) => {
        const next = new Date(current);
        next.setDate(next.getDate() + 1);
        return next;
      });
      return;
    }
    if (timeRangeView === "week") {
      setSelectedDate((current) => {
        const next = new Date(current);
        next.setDate(next.getDate() + 7);
        return next;
      });
      return;
    }
    if (timeRangeView === "quarter") {
      setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 3, 1));
      return;
    }
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  function goToToday() {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
    setDraft(blankDraft(now));
    setEditing(true);
    if (timeRangeView !== "month" && timeRangeView !== "quarter") {
      setTimeRangeView("today");
    }
  }

  function renderDayCell(date: Date, options?: { compact?: boolean; inMonth?: boolean }) {
    const key = toDateKey(date);
    const dayEvents = eventsByDate.get(key) ?? [];
    const inMonth = options?.inMonth ?? true;
    const isToday = isSameDay(date, today);
    const isSelected = isSameDay(date, selectedDate);
    const compact = options?.compact ?? false;

    return (
      <button
        key={key}
        type="button"
        onClick={() => selectDay(date)}
        className={cn(
          "flex flex-col rounded-lg border p-1.5 text-left transition-colors sm:rounded-xl sm:p-2",
          compact ? "min-h-[5rem]" : "min-h-[4.25rem] sm:min-h-[5.5rem] lg:min-h-[6.5rem]",
          inMonth ? "border-white/8 bg-[#0b1524]/70" : "border-transparent bg-transparent opacity-40",
          isSelected && "border-sky-400/40 bg-sky-500/10",
          !isSelected && "hover:border-white/15 hover:bg-[#0d1828]",
        )}
      >
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
            isToday ? "bg-sky-500 text-white" : "text-white/80",
          )}
        >
          {date.getDate()}
        </span>
        <div className="mt-1 space-y-1 overflow-hidden">
          {dayEvents.slice(0, compact ? 1 : 2).map((event) => (
            <div
              key={event.id}
              className={cn(
                "truncate rounded-md border px-1.5 py-0.5 text-[10px] leading-tight",
                eventTypeClass(event.eventType),
              )}
            >
              {toTimeInputValue(event.startsAt)} {event.title}
            </div>
          ))}
          {dayEvents.length > (compact ? 1 : 2) && (
            <div className="text-[10px] text-white/45">
              +{dayEvents.length - (compact ? 1 : 2)} more
            </div>
          )}
        </div>
      </button>
    );
  }

  function selectDay(date: Date) {
    setSelectedDate(date);
    setDraft(blankDraft(date));
    setEditing(true);
    openDetail();
  }

  function editEvent(event: CalendarEvent) {
    setSelectedDate(new Date(event.startsAt));
    setDraft(eventToDraft(event));
    setEditing(true);
    openDetail();
  }

  async function saveDraft() {
    if (!draft.title.trim()) {
      setError("Title is required");
      return;
    }

    setBusy(true);
    setError(null);

    const payload = {
      title: draft.title.trim(),
      eventType: draft.eventType,
      startsAt: combineDateAndTime(draft.date, draft.startTime),
      endsAt: combineDateAndTime(draft.date, draft.endTime),
      clientName: draft.clientName,
      location: draft.location,
      notes: draft.notes,
    };

    try {
      if (draft.id) {
        const response = await fetch(`/api/calendar/events/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await readApiJson<{ event?: CalendarEvent; error?: string }>(response);
        if (!response.ok || !data.event) throw new Error(data.error ?? "Failed to save event");
        setEvents((current) => current.map((item) => (item.id === data.event!.id ? data.event! : item)));
      } else {
        const response = await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await readApiJson<{ event?: CalendarEvent; error?: string }>(response);
        if (!response.ok || !data.event) throw new Error(data.error ?? "Failed to create event");
        setEvents((current) => [...current, data.event!].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ));
        setDraft(eventToDraft(data.event));
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save event");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft() {
    if (!draft.id) return;
    if (!window.confirm("Delete this event?")) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/calendar/events/${draft.id}`, { method: "DELETE" });
      const data = await readApiJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete event");

      setEvents((current) => current.filter((item) => item.id !== draft.id));
      setDraft(blankDraft(selectedDate));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete event");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveMasterDetail
      showDetail={showDetail}
      onBack={closeDetail}
      backLabel="Back to calendar"
      columnsClassName="xl:grid-cols-[minmax(0,1fr)_22rem]"
      master={
      <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0a1422]/80 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-sky-300" />
            <h2 className="text-lg font-semibold text-white">{periodLabel}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-white/10 bg-[#0b1524]/80 p-1">
              {TIME_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeRangeView(option.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    timeRangeView === option.value
                      ? "bg-sky-500 text-white"
                      : "text-white/60 hover:text-white",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goToPreviousPeriod}
              aria-label="Previous period"
              className="rounded-lg border border-white/10 p-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToNextPeriod}
              aria-label="Next period"
              className="rounded-lg border border-white/10 p-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-[#0b1524]/50 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search events…"
              className={cn(inputClassName(), "mt-0 pl-9")}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FieldLabel>User</FieldLabel>
              <select
                value={filterUserId}
                onChange={(event) => setFilterUserId(event.target.value)}
                className={inputClassName()}
              >
                <option value="all">Company-wide</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Event type</FieldLabel>
              <select
                value={eventTypeFilter}
                onChange={(event) => setEventTypeFilter(event.target.value)}
                className={inputClassName()}
              >
                <option value="all">All types</option>
                {CALENDAR_EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2.5 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={clientInteractionsOnly}
                  onChange={(event) => setClientInteractionsOnly(event.target.checked)}
                  className="rounded border-white/20 bg-transparent"
                />
                Client interactions only
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[18rem] items-center justify-center text-white/50">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : timeRangeView === "today" ? (
          <div className="mt-4">
            {renderDayCell(selectedDate, { inMonth: true })}
            <div className="mt-4 space-y-2">
              {(eventsByDate.get(toDateKey(selectedDate)) ?? []).length === 0 ? (
                <p className="text-sm text-white/45">No events scheduled for this day.</p>
              ) : (
                (eventsByDate.get(toDateKey(selectedDate)) ?? []).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => editEvent(event)}
                    className="w-full rounded-xl border border-white/10 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <p className="text-sm font-medium text-white">{event.title}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {formatEventTimeRange(event.startsAt, event.endsAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : timeRangeView === "week" ? (
          <div className="mt-4">
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-white/40 sm:gap-1 sm:text-[11px]">
              {weekdayLabels.map((label) => (
                <div key={label} className="py-2">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{weekDays.map((date) => renderDayCell(date))}</div>
          </div>
        ) : timeRangeView === "quarter" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {quarterMonths.map((monthStart) => {
              const grid = getMonthGrid(monthStart.getFullYear(), monthStart.getMonth());
              const label = new Intl.DateTimeFormat(undefined, {
                month: "long",
                year: "numeric",
              }).format(monthStart);

              return (
                <div key={label}>
                  <p className="mb-2 text-sm font-medium text-white/80">{label}</p>
                  <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-white/35">
                    {weekdayLabels.map((dayLabel) => (
                      <div key={dayLabel} className="py-1">
                        {dayLabel.slice(0, 1)}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {grid.map((date) =>
                      renderDayCell(date, {
                        compact: true,
                        inMonth: date.getMonth() === monthStart.getMonth(),
                      }),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-white/40 sm:mt-4 sm:gap-1 sm:text-[11px]">
              {weekdayLabels.map((label) => (
                <div key={label} className="py-2">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((date) =>
                renderDayCell(date, { inMonth: date.getMonth() === viewDate.getMonth() }),
              )}
            </div>
          </>
        )}
      </section>
      }
      detail={
      <aside className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-[#0a1422]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                Selected day
              </p>
              <h3 className="mt-1 text-base font-semibold text-white">
                {new Intl.DateTimeFormat(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                }).format(selectedDate)}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft(blankDraft(selectedDate));
                setEditing(true);
                openDetail();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-white/45">No events scheduled.</p>
            ) : (
              selectedDayEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => editEvent(event)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]",
                    draft.id === event.id ? "border-sky-400/40 bg-sky-500/10" : "border-white/10",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">{event.title}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px]",
                        eventTypeClass(event.eventType),
                      )}
                    >
                      {eventTypeLabel(event.eventType)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    {formatEventTimeRange(event.startsAt, event.endsAt)}
                  </p>
                  {event.clientName && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-white/55">
                      <Users className="h-3 w-3" />
                      {event.clientName}
                    </p>
                  )}
                  {event.location && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-white/55">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </section>

        {editing && (
          <section className="rounded-2xl border border-white/10 bg-[#0a1422]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-5">
            <h3 className="text-base font-semibold text-white">
              {draft.id ? "Edit event" : "New event"}
            </h3>

            {error && (
              <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <FieldLabel>Title</FieldLabel>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Client meeting, site visit…"
                  className={inputClassName()}
                />
              </div>

              <div>
                <FieldLabel>Type</FieldLabel>
                <select
                  value={draft.eventType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      eventType: event.target.value as CalendarEventType,
                    }))
                  }
                  className={inputClassName()}
                >
                  {CALENDAR_EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 sm:col-span-1">
                  <FieldLabel>Date</FieldLabel>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                    className={inputClassName()}
                  />
                </div>
                <div>
                  <FieldLabel>Start</FieldLabel>
                  <input
                    type="time"
                    value={draft.startTime}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, startTime: event.target.value }))
                    }
                    className={inputClassName()}
                  />
                </div>
                <div>
                  <FieldLabel>End</FieldLabel>
                  <input
                    type="time"
                    value={draft.endTime}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, endTime: event.target.value }))
                    }
                    className={inputClassName()}
                  />
                </div>
              </div>

              {draft.eventType === "onsite" && (
                <div>
                  <FieldLabel>Client</FieldLabel>
                  <select
                    value={draft.clientName}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, clientName: event.target.value }))
                    }
                    className={inputClassName()}
                  >
                    <option value="">Select client…</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.companyName}>
                        {client.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <FieldLabel>Location</FieldLabel>
                <input
                  value={draft.location}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, location: event.target.value }))
                  }
                  placeholder="Address, site, or meeting link"
                  className={inputClassName()}
                />
              </div>

              <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                  className={cn(inputClassName(), "resize-y")}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveDraft()}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
              {draft.id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteDraft()}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 px-4 py-2 text-sm text-rose-200 transition-colors hover:bg-rose-500/10 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </section>
        )}
      </aside>
      }
    />
  );
}

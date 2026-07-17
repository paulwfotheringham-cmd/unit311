"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createBlankTicketInput,
  formatSupportDate,
  priorityBadgeClass,
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABELS,
  ticketFieldsEqual,
  type SupportTicket,
  type SupportTicketPriority,
} from "@/lib/support-data";
import { cn } from "@/lib/utils";
import SupportTicketClientActions from "@/components/testflighthub/SupportTicketClientActions";
import { Archive, ArchiveRestore, BarChart3, LifeBuoy, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SupportStatsPeriod = "week" | "month" | "quarter";

const STATS_PERIOD_LABELS: Record<SupportStatsPeriod, string> = {
  week: "Last week",
  month: "Last month",
  quarter: "Last quarter",
};

function periodStart(period: SupportStatsPeriod): Date {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (period === "week") return new Date(now - 7 * dayMs);
  if (period === "month") return new Date(now - 30 * dayMs);
  return new Date(now - 90 * dayMs);
}

function ticketInPeriod(ticket: SupportTicket, period: SupportStatsPeriod) {
  const start = periodStart(period);
  return new Date(ticket.updatedAt).getTime() >= start.getTime();
}

function StatBar({
  label,
  count,
  max,
  tone,
}: {
  label: string;
  count: number;
  max: number;
  tone: "sky" | "amber" | "emerald";
}) {
  const width = max > 0 ? Math.max(8, Math.round((count / max) * 100)) : 0;
  const toneClass =
    tone === "sky"
      ? "border-sky-400/30 bg-sky-500/20"
      : tone === "amber"
        ? "border-amber-400/30 bg-amber-500/20"
        : "border-emerald-400/30 bg-emerald-500/20";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-end justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-white">{count}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn("h-full rounded-full border", toneClass)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

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

export default function SupportWorkspace() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statsPeriod, setStatsPeriod] = useState<SupportStatsPeriod>("month");
  const snapshottedIdRef = useRef<string | null>(null);

  const visibleTickets = useMemo(() => {
    const base = showArchived ? tickets : tickets.filter((ticket) => !ticket.archived);
    return [...base].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [showArchived, tickets]);

  const clientOptions = useMemo(
    () =>
      [...new Set(tickets.map((ticket) => ticket.organisation).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return visibleTickets.filter((ticket) => {
      if (clientFilter !== "all" && ticket.organisation !== clientFilter) return false;
      if (!query) return true;

      const haystack = [
        ticket.name,
        ticket.userAssigned ?? "",
        ticket.id,
        ticket.organisation,
        ticket.description,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [clientFilter, search, visibleTickets]);

  const periodTickets = useMemo(
    () => tickets.filter((ticket) => ticketInPeriod(ticket, statsPeriod)),
    [statsPeriod, tickets],
  );

  const inQueueCount = useMemo(
    () =>
      periodTickets.filter(
        (ticket) => !ticket.archived && !ticket.closed && !ticket.userAssigned?.trim(),
      ).length,
    [periodTickets],
  );

  const outstandingCount = useMemo(
    () =>
      periodTickets.filter(
        (ticket) => !ticket.archived && !ticket.closed && Boolean(ticket.userAssigned?.trim()),
      ).length,
    [periodTickets],
  );

  const resolvedCount = useMemo(
    () => periodTickets.filter((ticket) => ticket.closed && !ticket.archived).length,
    [periodTickets],
  );

  const statsMax = Math.max(inQueueCount, outstandingCount, resolvedCount, 1);

  const currentStateChartData = useMemo(
    () => [
      { label: "In queue", count: inQueueCount, fill: "#38bdf8" },
      { label: "Outstanding", count: outstandingCount, fill: "#fbbf24" },
      { label: "Resolved", count: resolvedCount, fill: "#34d399" },
      {
        label: "Archived",
        count: periodTickets.filter((ticket) => ticket.archived).length,
        fill: "#a78bfa",
      },
    ],
    [inQueueCount, outstandingCount, periodTickets, resolvedCount],
  );

  const [historicChartNowMs] = useState(() => Date.now());
  const historicChartData = useMemo(() => {
    const buckets: Array<{ week: string; opened: number; resolved: number }> = [];
    const now = historicChartNowMs;
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    for (let index = 5; index >= 0; index -= 1) {
      const end = now - index * weekMs;
      const start = end - weekMs;
      const opened = tickets.filter((ticket) => {
        const created = new Date(ticket.createdAt).getTime();
        return created >= start && created < end;
      }).length;
      const resolved = tickets.filter((ticket) => {
        if (!ticket.closed) return false;
        const updated = new Date(ticket.updatedAt).getTime();
        return updated >= start && updated < end;
      }).length;
      buckets.push({
        week: new Date(end).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        opened,
        resolved,
      });
    }

    return buckets;
  }, [historicChartNowMs, tickets]);

  const openTicketsNow = useMemo(
    () => tickets.filter((ticket) => !ticket.archived && !ticket.closed).length,
    [tickets],
  );
  const closedTicketsNow = useMemo(
    () => tickets.filter((ticket) => !ticket.archived && ticket.closed).length,
    [tickets],
  );

  const latestTicket = visibleTickets[0] ?? null;
  const urgentOpenCount = useMemo(
    () =>
      tickets.filter(
        (ticket) => !ticket.archived && !ticket.closed && (ticket.priority === "urgent" || ticket.priority === "high"),
      ).length,
    [tickets],
  );

  const selectedTicket = useMemo(
    () => filteredTickets.find((ticket) => ticket.id === selectedTicketId) ?? filteredTickets[0] ?? null,
    [filteredTickets, selectedTicketId],
  );

  const openCount = useMemo(() => tickets.filter((ticket) => !ticket.archived).length, [tickets]);
  const archivedCount = useMemo(() => tickets.filter((ticket) => ticket.archived).length, [tickets]);

  const isDirty = useMemo(() => {
    if (!selectedTicket) return false;
    if (!savedSnapshot || savedSnapshot.id !== selectedTicket.id) return true;
    return !ticketFieldsEqual(selectedTicket, savedSnapshot);
  }, [selectedTicket, savedSnapshot]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/support/tickets?includeArchived=true", { cache: "no-store" });
      const data = await readApiJson<{ tickets?: SupportTicket[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load support tickets");

      const nextTickets = data.tickets ?? [];
      setTickets(nextTickets);
      setSelectedTicketId((current) => {
        if (current && nextTickets.some((ticket) => ticket.id === current)) return current;
        const firstOpen = nextTickets.find((ticket) => !ticket.archived);
        return firstOpen?.id ?? nextTickets[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load support tickets");
      setTickets([]);
      setSelectedTicketId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicketId) {
      snapshottedIdRef.current = null;
      setSavedSnapshot(null);
      return;
    }
    if (snapshottedIdRef.current === selectedTicketId) return;
    const ticket = tickets.find((item) => item.id === selectedTicketId);
    if (ticket) {
      snapshottedIdRef.current = selectedTicketId;
      setSavedSnapshot({ ...ticket });
    }
  }, [selectedTicketId, tickets]);

  async function saveTicket(ticket: SupportTicket) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/support/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ticket.name,
          organisation: ticket.organisation,
          priority: ticket.priority,
          description: ticket.description,
          userAssigned: ticket.userAssigned,
          archived: ticket.archived,
        }),
      });

      const data = await readApiJson<{ ticket?: SupportTicket; error?: string }>(response);
      if (!response.ok || !data.ticket) throw new Error(data.error ?? "Failed to save ticket");

      setTickets((current) => current.map((item) => (item.id === data.ticket!.id ? data.ticket! : item)));
      snapshottedIdRef.current = data.ticket.id;
      setSavedSnapshot(data.ticket);
      setSaveMessage("Ticket saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save ticket");
    } finally {
      setBusy(false);
    }
  }

  function patchSelected(patch: Partial<SupportTicket>) {
    if (!selectedTicket) return;
    const next = { ...selectedTicket, ...patch };
    setTickets((current) => current.map((ticket) => (ticket.id === next.id ? next : ticket)));
    setSaveMessage(null);
  }

  async function handleSaveTicket() {
    if (!selectedTicket) return;
    setError(null);
    setSaveMessage(null);
    await saveTicket(selectedTicket);
  }

  async function handleAddTicket() {
    setBusy(true);
    setError(null);

    const blank = createBlankTicketInput();

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...blank,
          name: "New contact",
          organisation: "Unassigned client",
        }),
      });

      const data = await readApiJson<{ ticket?: SupportTicket; error?: string }>(response);
      if (!response.ok || !data.ticket) throw new Error(data.error ?? "Failed to create ticket");

      setTickets((current) => [data.ticket!, ...current]);
      setSelectedTicketId(data.ticket.id);
      snapshottedIdRef.current = data.ticket.id;
      setSavedSnapshot(data.ticket);
      setSaveMessage("Ticket created");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create ticket");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTicket() {
    if (!selectedTicket) return;
    if (!window.confirm(`Delete ticket ${selectedTicket.id}? This cannot be undone.`)) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "DELETE",
      });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete ticket");

      const remaining = tickets.filter((ticket) => ticket.id !== selectedTicket.id);
      setTickets(remaining);
      setSelectedTicketId(remaining.find((ticket) => !ticket.archived)?.id ?? remaining[0]?.id ?? null);
      setSaveMessage(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete ticket");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveTicket(archived: boolean) {
    if (!selectedTicket) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });

      const data = await readApiJson<{ ticket?: SupportTicket; error?: string }>(response);
      if (!response.ok || !data.ticket) throw new Error(data.error ?? "Failed to update ticket");

      setTickets((current) => current.map((item) => (item.id === data.ticket!.id ? data.ticket! : item)));
      snapshottedIdRef.current = data.ticket.id;
      setSavedSnapshot(data.ticket);
      setSaveMessage(archived ? "Ticket archived" : "Ticket restored");

      if (archived && !showArchived) {
        const remaining = tickets.filter((ticket) => ticket.id !== data.ticket!.id && !ticket.archived);
        setSelectedTicketId(remaining[0]?.id ?? null);
      }
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Failed to archive ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10">
              <LifeBuoy className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                Client support
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-white">Support ticketing</h2>
              <p className="mt-1 text-sm text-white/55">
                {openCount} open · {archivedCount} archived · {urgentOpenCount} high priority
              </p>
              {latestTicket && (
                <p className="mt-2 text-xs text-white/45">
                  Latest in:{" "}
                  <span className="font-medium text-sky-200">
                    {latestTicket.id} · {latestTicket.organisation || latestTicket.name}
                  </span>{" "}
                  · updated {formatSupportDate(latestTicket.updatedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {!loading && (
        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-300" />
              <h3 className="text-sm font-semibold text-white">Support analytics</h3>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-sky-200">
                {openTicketsNow} open now
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                {closedTicketsNow} closed now
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#0b1524]/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Historic volume (6 weeks)
              </p>
              <div className="mt-3 h-52">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={historicChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1524",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#f8fafc",
                      }}
                    />
                    <Line type="monotone" dataKey="opened" name="Opened" stroke="#38bdf8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#34d399" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1524]/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Current state ({STATS_PERIOD_LABELS[statsPeriod]})
                </p>
                <select
                  value={statsPeriod}
                  onChange={(event) => setStatsPeriod(event.target.value as SupportStatsPeriod)}
                  className={cn(inputClassName(), "mt-0 w-auto min-w-[10rem]")}
                >
                  {(Object.keys(STATS_PERIOD_LABELS) as SupportStatsPeriod[]).map((period) => (
                    <option key={period} value={period}>
                      {STATS_PERIOD_LABELS[period]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 h-52">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={currentStateChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1524",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#f8fafc",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatBar label="In queue" count={inQueueCount} max={statsMax} tone="sky" />
            <StatBar label="Outstanding" count={outstandingCount} max={statsMax} tone="amber" />
            <StatBar label="Resolved" count={resolvedCount} max={statsMax} tone="emerald" />
          </div>
        </section>
      )}

      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          {error.includes("support_tickets") && (
            <span className="mt-2 block text-xs text-red-200/80">
              Run{" "}
              <span className="font-mono">supabase/migrations/026_create_support_tickets.sql</span> in
              Supabase.
            </span>
          )}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tickets…
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Support explorer</h2>
                <p className="mt-1 text-xs text-white/45">
                  {filteredTickets.length} tickets · sorted by latest activity
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowArchived((current) => !current)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                    showArchived
                      ? "border-sky-400/30 bg-sky-500/10 text-sky-200"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20",
                  )}
                >
                  {showArchived ? "Showing archived" : "Show archived"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddTicket()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add ticket
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by user name, assignee, ID…"
                  className={cn(inputClassName(), "mt-0 pl-10")}
                />
              </div>
              <select
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
                className={inputClassName()}
              >
                <option value="all">All clients</option>
                {clientOptions.map((organisation) => (
                  <option key={organisation} value={organisation}>
                    {organisation}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {filteredTickets.length === 0 ? (
                <p className="text-sm text-white/45">No tickets match your filters.</p>
              ) : (
                filteredTickets.map((ticket) => {
                  const selected = ticket.id === selectedTicket?.id;
                  const isLatest = latestTicket?.id === ticket.id;

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        selected
                          ? "border-sky-400/40 bg-sky-500/10 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                        ticket.archived && "opacity-70",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sky-300/80">
                          {ticket.id}
                        </p>
                        {isLatest && (
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-200">
                            Latest
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-white">{ticket.name || "Unnamed"}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {ticket.organisation || "No organisation"}
                        {ticket.userAssigned ? ` · assigned ${ticket.userAssigned}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
                            priorityBadgeClass(ticket.priority),
                          )}
                        >
                          {SUPPORT_PRIORITY_LABELS[ticket.priority]}
                        </span>
                        <span className="text-[10px] text-white/40">{formatSupportDate(ticket.updatedAt)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {selectedTicket ? (
            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                      {selectedTicket.id}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {selectedTicket.name || "Unnamed"}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">{selectedTicket.organisation}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveTicket()}
                      disabled={busy || !isDirty}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleArchiveTicket(!selectedTicket.archived)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
                    >
                      {selectedTicket.archived ? (
                        <>
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          Restore
                        </>
                      ) : (
                        <>
                          <Archive className="h-3.5 w-3.5" />
                          Archive
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteTicket()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {saveMessage && (
                  <p className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {saveMessage}
                  </p>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Name</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedTicket.name}
                      onChange={(event) => patchSelected({ name: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Organisation</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedTicket.organisation}
                      onChange={(event) => patchSelected({ organisation: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Priority</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedTicket.priority}
                      onChange={(event) =>
                        patchSelected({ priority: event.target.value as SupportTicketPriority })
                      }
                    >
                      {SUPPORT_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {SUPPORT_PRIORITY_LABELS[priority]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>User assigned</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedTicket.userAssigned ?? ""}
                      placeholder="e.g. fortp0"
                      onChange={(event) =>
                        patchSelected({ userAssigned: event.target.value.trim() || null })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Description</FieldLabel>
                    <textarea
                      rows={5}
                      className={cn(inputClassName(), "resize-y")}
                      value={selectedTicket.description}
                      onChange={(event) => patchSelected({ description: event.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <SupportTicketClientActions
                    ticket={selectedTicket}
                    onTicketChange={(nextTicket) => {
                      setTickets((current) =>
                        current.map((item) => (item.id === nextTicket.id ? nextTicket : item)),
                      );
                      snapshottedIdRef.current = nextTicket.id;
                      setSavedSnapshot(nextTicket);
                    }}
                    onSuccess={(message) => setSaveMessage(message)}
                    onError={(message) => setError(message)}
                  />
                </div>

                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/45">
                  <p>Created {formatSupportDate(selectedTicket.createdAt)}</p>
                  <p className="mt-1">Updated {formatSupportDate(selectedTicket.updatedAt)}</p>
                </div>
              </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-white/45">
              Select a ticket from the explorer above.
            </section>
          )}
        </div>
      )}
    </div>
  );
}

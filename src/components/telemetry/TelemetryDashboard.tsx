"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { Download, Search } from "lucide-react";

import type { TelemetryRow } from "@/lib/telemetry";
import {
  computeTelemetryStats,
  exportTelemetryCsv,
  filterTelemetryRecords,
  formatNumber,
  formatTelemetryTimestamp,
  telemetryStatusBadgeClass,
  type TelemetryStatusFilter,
} from "@/lib/telemetry-dashboard-utils";

const FlightPathMap = dynamic(() => import("@/components/testflighthub/FlightPathMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-xl border border-white/10 bg-[#0f172a] text-sm text-white/50">
      Loading map...
    </div>
  ),
});

type LatLng = [number, number];

type TelemetryFeedResponse = {
  status: "connected" | "unconfigured" | "error" | "loading";
  records: TelemetryRow[];
  total: number;
  error?: string;
};

const REFRESH_INTERVAL_MS = 3_000;
const PAGE_SIZE = 10;
const STATUS_FILTERS: TelemetryStatusFilter[] = [
  "ALL",
  "IN FLIGHT",
  "STOPPED",
  "STANDBY",
  "MAINTENANCE",
];

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

async function fetchTelemetryRecords(): Promise<TelemetryFeedResponse> {
  const response = await fetch(
    `/api/telemetry/records?limit=200&_=${Date.now()}`,
    { cache: "no-store" },
  );
  const payload = (await response.json()) as TelemetryFeedResponse & { error?: string };

  if (response.status === 503) {
    return {
      status: "unconfigured",
      records: [],
      total: 0,
      error: payload.error,
    };
  }

  if (!response.ok) {
    return {
      status: "error",
      records: [],
      total: 0,
      error: payload.error ?? "Failed to load telemetry records",
    };
  }

  return {
    status: "connected",
    records: payload.records ?? [],
    total: payload.total ?? 0,
  };
}

async function fetchDronePath(droneId: string): Promise<LatLng[]> {
  const response = await fetch(`/api/telemetry?drone_id=${encodeURIComponent(droneId)}`);
  if (!response.ok) return [];

  const rows = (await response.json()) as TelemetryRow[];
  return rows.map((row) => [row.latitude, row.longitude] as LatLng);
}

export default function TelemetryDashboard() {
  const [records, setRecords] = useState<TelemetryRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dbStatus, setDbStatus] = useState<TelemetryFeedResponse["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TelemetryStatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<LatLng[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const payload = await fetchTelemetryRecords();
      setRecords(payload.records);
      setTotalRecords(payload.total);
      setDbStatus(payload.status);
      setError(payload.error ?? null);
      setLastRefreshed(new Date());

      setSelectedRecordId((current) => {
        if (payload.records.length === 0) return null;
        if (current && payload.records.some((record) => record.id === current)) {
          return current;
        }
        return payload.records[0].id;
      });
    } catch (fetchError) {
      setDbStatus("error");
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to load telemetry records",
      );
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void refresh();
    });
    const interval = setInterval(() => {
      startTransition(() => {
        void refresh();
      });
    }, REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startTransition(() => {
          void refresh();
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  const filteredRecords = useMemo(
    () => filterTelemetryRecords(records, searchQuery, statusFilter),
    [records, searchQuery, statusFilter],
  );

  const stats = useMemo(
    () => computeTelemetryStats(records, totalRecords),
    [records, totalRecords],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedRecordId) ??
    records.find((record) => record.id === selectedRecordId) ??
    null;

  useEffect(() => {
    startTransition(() => {
      setPage(1);
    });
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (!selectedRecord) {
      startTransition(() => {
        setSelectedPath([]);
      });
      return;
    }

    const record = selectedRecord;
    let cancelled = false;

    async function loadPath() {
      const path = await fetchDronePath(record.drone_id);
      if (!cancelled) {
        setSelectedPath(path.length > 0 ? path : [[record.latitude, record.longitude]]);
      }
    }

    startTransition(() => {

      void loadPath();

    });

    return () => {
      cancelled = true;
    };
  }, [selectedRecord]);

  return (
    <div className="relative px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37, 99, 235, 0.12), transparent 70%)",
        }}
      />

      <div className="relative space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              Operational Monitoring
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Telemetry Dashboard
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Live telemetry from Supabase with auto-refresh every 3 seconds. Start a simulation
              on Test Lab, then open this page — the simulator keeps running in the background while
              new rows appear here.
            </p>
          </div>
          {lastRefreshed && (
            <p className="text-sm text-white/45">
              Last refreshed{" "}
              <span className="font-mono text-white/70">
                {formatTelemetryTimestamp(lastRefreshed.toISOString())}
              </span>
            </p>
          )}
        </div>

        {error && dbStatus !== "connected" && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Telemetry Records" value={stats.totalRecords.toLocaleString()} />
          <StatCard label="Active Drones" value={stats.activeDrones.toLocaleString()} />
          <StatCard
            label="Latest Update"
            value={
              stats.latestUpdate ? formatTelemetryTimestamp(stats.latestUpdate) : "No data yet"
            }
          />
          <StatCard label="Average Battery" value={`${stats.averageBattery.toFixed(1)}%`} />
        </div>

        <section className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Live Telemetry Table</h3>
              <p className="mt-1 text-sm text-white/50">
                Sorted newest first · {filteredRecords.length.toLocaleString()} matching records
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="relative min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by drone ID"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/20"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as TelemetryStatusFilter)}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors focus:border-white/20"
              >
                {STATUS_FILTERS.map((status) => (
                  <option key={status} value={status} className="bg-[#0f172a]">
                    {status === "ALL" ? "All statuses" : status}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => exportTelemetryCsv(filteredRecords)}
                disabled={filteredRecords.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  {[
                    "Timestamp",
                    "Drone ID",
                    "Status",
                    "Latitude",
                    "Longitude",
                    "Altitude",
                    "Speed",
                    "Battery",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-white/50">
                      {dbStatus === "loading"
                        ? "Loading telemetry records..."
                        : "No telemetry records match the current filters."}
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => {
                    const selected = record.id === selectedRecordId;

                    return (
                      <tr
                        key={record.id}
                        onClick={() => setSelectedRecordId(record.id)}
                        className={`cursor-pointer border-b border-white/5 transition-colors ${
                          selected ? "bg-blue-500/10" : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-white/80">
                          {formatTelemetryTimestamp(record.timestamp)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-white">
                          {record.drone_id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${telemetryStatusBadgeClass(record.status)}`}
                          >
                            {record.status ?? "UNKNOWN"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-white/80">
                          {formatNumber(record.latitude, 6)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-white/80">
                          {formatNumber(record.longitude, 6)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-white/80">
                          {formatNumber(record.altitude, 1)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-white/80">
                          {formatNumber(record.speed, 1)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-white/80">
                          {formatNumber(record.battery, 1)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-white/50">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                Map View
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">Selected Drone Position</h3>
            </div>
            {selectedRecord && (
              <p className="font-mono text-sm text-white/70">
                {selectedRecord.drone_id} · {formatTelemetryTimestamp(selectedRecord.timestamp)}
              </p>
            )}
          </div>

          {selectedRecord ? (
            <div className="mt-4">
              <FlightPathMap
                position={[selectedRecord.latitude, selectedRecord.longitude]}
                path={
                  selectedPath.length > 0
                    ? selectedPath
                    : [[selectedRecord.latitude, selectedRecord.longitude]]
                }
              />
            </div>
          ) : (
            <p className="mt-6 text-sm text-white/50">
              Select a telemetry row to display the latest drone position on the map.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

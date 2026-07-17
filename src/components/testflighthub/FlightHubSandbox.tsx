"use client";

import dynamic from "next/dynamic";
import { forwardRef, startTransition, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import {
  advanceTelemetry,
  createInitialTelemetry,
  FLIGHT_PROFILES,
  getInitialOrbitAngle,
  getMapHomePosition,
  getOrbitPathSamples,
  getProfileMapStyle,
  inferFlightProfile,
  RANDOM_FLIGHT_PROFILE,
  type FlightProfile,
  type FlightProfileId,
} from "@/lib/flight-simulation";
import {
  DRONE_ID,
  rowToTelemetry,
  type Telemetry,
  type TelemetryRow,
} from "@/lib/telemetry";

import DroneTakeoffOverlay from "./DroneTakeoffOverlay";
import SimulatedLiveVideoView from "./SimulatedLiveVideoView";

const FlightPathMap = dynamic(() => import("./FlightPathMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-xl border border-white/10 bg-[#0f172a] text-sm text-white/50">
      Loading map...
    </div>
  ),
});

type LatLng = [number, number];

function toLatLng(telemetry: Telemetry): LatLng {
  return [telemetry.latitude, telemetry.longitude];
}

function formatCoord(value: number, decimals: number) {
  return value.toFixed(decimals);
}

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

async function fetchLatestTelemetry(): Promise<Telemetry | null> {
  const response = await fetch(`/api/telemetry?drone_id=${encodeURIComponent(DRONE_ID)}`);
  if (!response.ok) return null;

  const rows = (await response.json()) as TelemetryRow[];
  if (rows.length === 0) return null;

  return rowToTelemetry(rows[rows.length - 1]);
}

async function saveTelemetry(telemetry: Telemetry) {
  await fetch("/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...telemetry,
      lastUpdated: telemetry.lastUpdated.toISOString(),
    }),
  });
}

async function clearTelemetryForDrone() {
  await fetch(`/api/telemetry?drone_id=${encodeURIComponent(DRONE_ID)}`, {
    method: "DELETE",
  });
}

function TelemetryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function profileButtonClass(id: FlightProfileId) {
  switch (id) {
    case "random":
      return "bg-[#2563eb] text-white shadow-[0_0_32px_rgba(37,99,235,0.35)] hover:bg-[#1d4ed8]";
    case "spain":
      return "border border-amber-500/40 bg-amber-500/15 text-amber-100 hover:border-amber-400/60 hover:bg-amber-500/25";
    case "austin":
      return "border border-violet-500/40 bg-violet-500/15 text-violet-100 hover:border-violet-400/60 hover:bg-violet-500/25";
    case "france":
      return "border border-sky-500/40 bg-sky-500/15 text-sky-100 hover:border-sky-400/60 hover:bg-sky-500/25";
    case "oxford":
      return "border border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:border-emerald-400/60 hover:bg-emerald-500/25";
  }
}

export type FlightHubSandboxHandle = {
  generateTestDrone: () => Promise<void>;
  startSimulation: () => Promise<void>;
  stopSimulation: () => Promise<void>;
  resetFlight: () => Promise<void>;
  startMissionFlow: () => Promise<void>;
  hasTelemetry: () => boolean;
  isSimulationRunning: () => boolean;
};

type FlightHubSandboxProps = {
  onTelemetryChange?: (telemetry: Telemetry | null, isRunning: boolean) => void;
  excludedProfileIds?: FlightProfileId[];
};

const FlightHubSandbox = forwardRef<FlightHubSandboxHandle, FlightHubSandboxProps>(
  function FlightHubSandbox({ onTelemetryChange, excludedProfileIds = [] }, ref) {
    const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
    const [flightPath, setFlightPath] = useState<LatLng[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [takeoffToken, setTakeoffToken] = useState(0);
    const [activeProfile, setActiveProfile] = useState<FlightProfile>(RANDOM_FLIGHT_PROFILE);
    const telemetryRef = useRef<Telemetry | null>(null);
    const activeProfileRef = useRef<FlightProfile>(RANDOM_FLIGHT_PROFILE);
    const orbitAngleRef = useRef(0);

    useEffect(() => {
      telemetryRef.current = telemetry;
    }, [telemetry]);

    useEffect(() => {
      activeProfileRef.current = activeProfile;
    }, [activeProfile]);

    useEffect(() => {
      onTelemetryChange?.(telemetry, isRunning);
    }, [telemetry, isRunning, onTelemetryChange]);

    useEffect(() => {
      if (!telemetry || !isRunning) return;

      const point = toLatLng(telemetry);

      startTransition(() => {
        setFlightPath((currentPath) => {
          const lastPoint = currentPath[currentPath.length - 1];
          if (lastPoint && lastPoint[0] === point[0] && lastPoint[1] === point[1]) {
            return currentPath;
          }

          return [...currentPath, point];
        });
      });
    }, [telemetry, isRunning]);

    useEffect(() => {
      let cancelled = false;

      async function loadLatestTelemetry() {
        const latest = await fetchLatestTelemetry();
        if (cancelled || !latest) return;

        const profile = inferFlightProfile(latest.latitude, latest.longitude);
        setActiveProfile(profile);
        activeProfileRef.current = profile;
        orbitAngleRef.current = getInitialOrbitAngle(profile);
        setTelemetry(latest);
        setFlightPath([toLatLng(latest)]);
        setIsRunning(latest.status === "IN FLIGHT");
      }

      void loadLatestTelemetry();

      return () => {
        cancelled = true;
      };
    }, []);

    const persistTelemetry = useCallback(async (next: Telemetry) => {
      try {
        await saveTelemetry(next);
      } catch {
        // Persistence runs silently in the background.
      }
    }, []);

    const playTakeoffAnimation = useCallback(() => {
      setTakeoffToken((token) => token + 1);
    }, []);

    const handleTakeoffComplete = useCallback(() => {
      setTakeoffToken(0);
    }, []);

    const spawnDrone = useCallback(
      async (profile: FlightProfile) => {
        orbitAngleRef.current = getInitialOrbitAngle(profile);
        const initial = createInitialTelemetry(profile);
        const initialPoint = toLatLng(initial);

        setActiveProfile(profile);
        activeProfileRef.current = profile;
        setIsRunning(false);
        setTelemetry(initial);
        setFlightPath([initialPoint]);
        playTakeoffAnimation();
        await persistTelemetry(initial);
      },
      [persistTelemetry, playTakeoffAnimation],
    );

    const startSimulation = useCallback(async () => {
      playTakeoffAnimation();
      setTelemetry((prev) => {
        if (!prev) return prev;
        orbitAngleRef.current = getInitialOrbitAngle(activeProfileRef.current);
        const next = { ...prev, status: "IN FLIGHT" as const, lastUpdated: new Date() };
        void persistTelemetry(next);
        return next;
      });
      setIsRunning(true);
    }, [persistTelemetry, playTakeoffAnimation]);

    const startDroneProfile = useCallback(
      async (profileId: FlightProfileId) => {
        const profile = FLIGHT_PROFILES.find((entry) => entry.id === profileId);
        if (!profile) return;

        await spawnDrone(profile);
        await startSimulation();
      },
      [spawnDrone, startSimulation],
    );

    const generateTestDrone = useCallback(async () => {
      await spawnDrone(RANDOM_FLIGHT_PROFILE);
    }, [spawnDrone]);

    const stopSimulation = useCallback(async () => {
      setIsRunning(false);
      setTelemetry((prev) => {
        if (!prev) return prev;
        const next = { ...prev, status: "STOPPED" as const, lastUpdated: new Date() };
        void persistTelemetry(next);
        return next;
      });
    }, [persistTelemetry]);

    const resetFlight = useCallback(async () => {
      try {
        await clearTelemetryForDrone();
      } catch {
        // Reset still clears local state even if the API call fails.
      }

      setTelemetry(null);
      setFlightPath([]);
      setIsRunning(false);
      orbitAngleRef.current = 0;
      setActiveProfile(RANDOM_FLIGHT_PROFILE);
      activeProfileRef.current = RANDOM_FLIGHT_PROFILE;
    }, []);

    const startMissionFlow = useCallback(async () => {
      if (telemetryRef.current === null) {
        await spawnDrone(RANDOM_FLIGHT_PROFILE);
      }
      await startSimulation();
    }, [spawnDrone, startSimulation]);

    useImperativeHandle(
      ref,
      () => ({
        generateTestDrone,
        startSimulation,
        stopSimulation,
        resetFlight,
        startMissionFlow,
        hasTelemetry: () => telemetryRef.current !== null,
        isSimulationRunning: () => isRunning,
      }),
      [generateTestDrone, startSimulation, stopSimulation, resetFlight, startMissionFlow, isRunning],
    );

    useEffect(() => {
      if (!isRunning) return;

      const interval = setInterval(() => {
        setTelemetry((prev) => {
          if (!prev) return prev;
          const profile = activeProfileRef.current;
          const { telemetry: next, nextAngle } = advanceTelemetry(
            profile,
            prev,
            orbitAngleRef.current,
          );
          orbitAngleRef.current = nextAngle;
          void persistTelemetry(next);
          return next;
        });
      }, 3000);

      return () => clearInterval(interval);
    }, [isRunning, persistTelemetry]);

    const hasTelemetry = telemetry !== null;
    const visibleProfiles = FLIGHT_PROFILES.filter(
      (profile) => !excludedProfileIds.includes(profile.id),
    );
    const plannedOrbit = getOrbitPathSamples(activeProfile);
    const mapHomePosition = getMapHomePosition(activeProfile);
    const mapTerrainStyle = getProfileMapStyle(activeProfile);
    const followMapCenter = activeProfile.mode === "orbit";

    return (
      <>
        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              FlightHub Simulator
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Simulator Controls</h2>
            <p className="mt-2 text-sm text-white/60">
              Choose a drone profile to spawn at the correct location and begin the live simulation.
              Orbit profiles fly a 2 km circle; random mode uses the original Perth jitter demo.
            </p>
            {hasTelemetry && (
              <p className="mt-2 text-xs text-white/45">
                Active profile:{" "}
                <span className="font-semibold text-white/70">{activeProfile.buttonLabel}</span>
                {activeProfile.mode === "orbit" && (
                  <>
                    {" "}
                    · takeoff {activeProfile.startPosition.label}
                  </>
                )}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {visibleProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => void startDroneProfile(profile.id)}
                disabled={isRunning}
                title={profile.description}
                className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${profileButtonClass(profile.id)}`}
              >
                {profile.buttonLabel}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void stopSimulation()}
              disabled={!hasTelemetry || !isRunning}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-red-500/40 bg-red-500/15 px-5 text-sm font-semibold text-red-300 transition-colors hover:border-red-400/60 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Stop Simulation
            </button>
            <button
              type="button"
              onClick={() => void resetFlight()}
              disabled={!hasTelemetry}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset Flight
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                Live Feed
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Live Telemetry</h2>
            </div>
            {telemetry && (
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  telemetry.status === "IN FLIGHT"
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                    : "border-white/20 bg-white/10 text-white/60"
                }`}
              >
                {telemetry.status === "IN FLIGHT" ? "IN FLIGHT" : "STOPPED"}
              </span>
            )}
          </div>

          {!telemetry ? (
            <p className="mt-6 text-base text-white/60">
              No telemetry received yet. Choose a start drone button above to begin a session.
            </p>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <TelemetryField label="Drone ID" value={telemetry.droneId} />
              <TelemetryField label="Status" value={telemetry.status} />
              <TelemetryField label="Profile" value={activeProfile.buttonLabel} />
              <TelemetryField label="Takeoff Site" value={activeProfile.startPosition.label} />
              <TelemetryField label="Latitude" value={formatCoord(telemetry.latitude, 6)} />
              <TelemetryField label="Longitude" value={formatCoord(telemetry.longitude, 6)} />
              <TelemetryField label="Altitude (ft)" value={telemetry.altitudeFt.toFixed(1)} />
              <TelemetryField label="Speed (mph)" value={telemetry.speedMph.toFixed(1)} />
              <TelemetryField label="Battery (%)" value={telemetry.batteryPct.toFixed(1)} />
              <TelemetryField label="Last Updated" value={formatTimestamp(telemetry.lastUpdated)} />
            </div>
          )}
        </section>

        {telemetry && (
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
            <div>
              <h2 className="text-lg font-semibold text-white">Flight Path Map</h2>
              <p className="mt-1 text-sm text-white/55">
                Satellite imagery with terrain relief overlay — live path, orbit plan, and survey home.
              </p>
            </div>

            <div
              className={`mt-4 grid gap-4 ${isRunning ? "lg:grid-cols-[minmax(0,1fr)_240px] lg:items-stretch" : ""}`}
            >
              <div className="relative min-h-[min(52vh,480px)]">
                {takeoffToken > 0 && (
                  <DroneTakeoffOverlay key={takeoffToken} onComplete={handleTakeoffComplete} />
                )}
                <FlightPathMap
                  position={toLatLng(telemetry)}
                  path={flightPath}
                  plannedOrbit={plannedOrbit.length > 0 ? plannedOrbit : undefined}
                  homePosition={mapHomePosition ?? undefined}
                  startPosition={[
                    activeProfile.startPosition.latitude,
                    activeProfile.startPosition.longitude,
                  ]}
                  followCenter={followMapCenter}
                  satelliteTerrainOverlay
                  mapHeightClassName="h-[min(52vh,480px)]"
                />
              </div>

              {isRunning && (
                <SimulatedLiveVideoView
                  key={activeProfile.id}
                  sessionKey={activeProfile.id}
                  telemetry={telemetry}
                  compact
                  terrainStyle={mapTerrainStyle}
                />
              )}
            </div>
          </section>
        )}
      </>
    );
  },
);

export default FlightHubSandbox;

"use client";

import dynamic from "next/dynamic";
import { startTransition, useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import {
  FLIGHT_PROFILES,
  getProfileWeatherLocation,
  inferFlightProfile,
  TESTING_FLIGHT_PROFILE_IDS,
  type FlightProfile,
  type FlightProfileId,
} from "@/lib/flight-simulation";
import type { Telemetry } from "@/lib/telemetry";
import {
  formatForecastDay,
  formatWindDirection,
  getWeatherDisplaySnapshot,
  type LocationWeather,
  type WeatherTimeframe,
  weatherCodeEmoji,
  weatherCodeLabel,
} from "@/lib/weather-data";

const WeatherBroadcastMap = dynamic(() => import("./WeatherBroadcastMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(58vh,520px)] items-center justify-center rounded-2xl border border-white/10 bg-[#0b1220] text-sm text-white/55">
      Loading weather map…
    </div>
  ),
});

type TestingWeatherPanelProps = {
  liveTelemetry: Telemetry | null;
};

type ProfileWeatherState = {
  profileId: FlightProfileId;
  profile: FlightProfile;
  weather: LocationWeather | null;
  loading: boolean;
  error: string | null;
};

const TIMEFRAME_OPTIONS: { id: WeatherTimeframe; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "next-7-days", label: "Next 7 Days" },
];

function profileShortName(profile: FlightProfile) {
  return profile.buttonLabel.replace("Start ", "").replace(" Drone", "");
}

async function fetchLocationWeather(profile: FlightProfile): Promise<LocationWeather> {
  const location = getProfileWeatherLocation(profile);
  const params = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    label: location.label,
  });

  const response = await fetch(`/api/weather?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Weather unavailable");
  }

  return (await response.json()) as LocationWeather;
}

export default function TestingWeatherPanel({ liveTelemetry }: TestingWeatherPanelProps) {
  const profiles = useMemo(
    () => FLIGHT_PROFILES.filter((profile) => TESTING_FLIGHT_PROFILE_IDS.includes(profile.id)),
    [],
  );

  const activeProfileId = useMemo(() => {
    if (!liveTelemetry) return null;
    return inferFlightProfile(liveTelemetry.latitude, liveTelemetry.longitude).id;
  }, [liveTelemetry]);

  const [selectedProfileId, setSelectedProfileId] = useState<FlightProfileId>(
    TESTING_FLIGHT_PROFILE_IDS[0],
  );
  const [timeframe, setTimeframe] = useState<WeatherTimeframe>("today");
  const [weekDayIndex, setWeekDayIndex] = useState(0);
  const [entries, setEntries] = useState<ProfileWeatherState[]>(() =>
    profiles.map((profile) => ({
      profileId: profile.id,
      profile,
      weather: null,
      loading: true,
      error: null,
    })),
  );

  useEffect(() => {
    if (activeProfileId && TESTING_FLIGHT_PROFILE_IDS.includes(activeProfileId)) {
      startTransition(() => {
        setSelectedProfileId(activeProfileId);
      });
    }
  }, [activeProfileId]);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      setEntries(
        profiles.map((profile) => ({
          profileId: profile.id,
          profile,
          weather: null,
          loading: true,
          error: null,
        })),
      );

      await Promise.all(
        profiles.map(async (profile) => {
          try {
            const weather = await fetchLocationWeather(profile);
            if (cancelled) return;

            setEntries((current) =>
              current.map((entry) =>
                entry.profileId === profile.id
                  ? { ...entry, weather, loading: false, error: null }
                  : entry,
              ),
            );
          } catch {
            if (cancelled) return;

            setEntries((current) =>
              current.map((entry) =>
                entry.profileId === profile.id
                  ? { ...entry, loading: false, error: "Could not load weather for this area." }
                  : entry,
              ),
            );
          }
        }),
      );
    }

    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, [profiles]);

  const selectedEntry = entries.find((entry) => entry.profileId === selectedProfileId) ?? entries[0];
  const selectedLocation = selectedEntry
    ? getProfileWeatherLocation(selectedEntry.profile)
    : null;

  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
            Mission Planning
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Live Weather Intelligence</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Select a survey site and forecast window to view a broadcast-style regional weather map
            with live temperature, wind, rain, and humidity.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Updates every 30 min
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="block min-w-[240px] flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Survey site
          </span>
          <div className="relative mt-2">
            <select
              value={selectedProfileId}
              onChange={(event) => {
                setSelectedProfileId(event.target.value as FlightProfileId);
                setTimeframe("today");
                setWeekDayIndex(0);
              }}
              className="h-11 w-full appearance-none rounded-xl border border-white/15 bg-[#0b1220]/80 px-4 pr-10 text-sm font-medium text-white outline-none transition-colors focus:border-[#3b82f6]/60"
            >
              {entries.map((entry) => (
                <option key={entry.profileId} value={entry.profileId} className="bg-[#0b1220]">
                  {profileShortName(entry.profile)} — {entry.profile.startPosition.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
          </div>
        </label>

        <div className="flex flex-wrap gap-2">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setTimeframe(option.id);
                setWeekDayIndex(0);
              }}
              className={`h-11 rounded-xl px-4 text-sm font-semibold transition-colors ${
                timeframe === option.id
                  ? "bg-[#2563eb] text-white shadow-[0_0_24px_rgba(37,99,235,0.35)]"
                  : "border border-white/15 bg-white/[0.04] text-white/75 hover:border-white/25 hover:bg-white/[0.08]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {selectedEntry?.loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading live weather for {profileShortName(selectedEntry.profile)}…
        </div>
      )}

      {selectedEntry?.error && !selectedEntry.loading && (
        <p className="mt-6 text-sm text-red-300/90">{selectedEntry.error}</p>
      )}

      {selectedEntry?.weather && selectedLocation && !selectedEntry.loading && (
        <div className="mt-6 space-y-4">
          <WeatherBroadcastMap
            latitude={selectedLocation.latitude}
            longitude={selectedLocation.longitude}
            locationLabel={selectedLocation.label}
            regionLabel={profileShortName(selectedEntry.profile)}
            weather={selectedEntry.weather}
            timeframe={timeframe}
            weekDayIndex={weekDayIndex}
          />

          {timeframe === "next-7-days" && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Select day
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {selectedEntry.weather.daily.map((day, index) => (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setWeekDayIndex(index)}
                    className={`min-w-[108px] shrink-0 rounded-xl border px-3 py-3 text-center transition-colors ${
                      weekDayIndex === index
                        ? "border-[#3b82f6]/60 bg-[#2563eb]/20 text-white"
                        : "border-white/10 bg-[#0b1220]/70 text-white/75 hover:border-white/20"
                    }`}
                  >
                    <p className="text-[11px] font-semibold">
                      {formatForecastDay(day.date, selectedEntry.weather!.timezone)}
                    </p>
                    <p className="mt-2 text-xl">{weatherCodeEmoji(day.weatherCode)}</p>
                    <p className="mt-2 text-sm font-semibold">
                      {Math.round(day.tempMaxC)}°
                      <span className="text-white/45"> / {Math.round(day.tempMinC)}°</span>
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-sky-300/90">
                      Wind {day.windSpeedMaxMph.toFixed(0)} mph {formatWindDirection(day.windDirectionDeg)}
                    </p>
                    <p className="mt-1 text-[10px] text-white/45">
                      {Math.round(day.humidityMeanPct)}% humidity · {day.rainMm.toFixed(1)} mm rain
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {timeframe !== "next-7-days" && selectedEntry.weather && (
            <div className="grid gap-2 sm:max-w-sm">
              {(() => {
                const snapshot = getWeatherDisplaySnapshot(
                  selectedEntry.weather,
                  timeframe,
                  weekDayIndex,
                );
                return (
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center">
                    <p className="text-[11px] font-semibold text-white/70">{snapshot.dayLabel}</p>
                    <p className="mt-1 text-2xl">{weatherCodeEmoji(snapshot.weatherCode)}</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {Math.round(snapshot.tempHighC)}° / {Math.round(snapshot.tempLowC)}°
                    </p>
                    <p className="mt-2 text-sm font-medium text-sky-300/90">
                      Wind {snapshot.windSpeedMph.toFixed(0)} mph{" "}
                      {formatWindDirection(snapshot.windDirectionDeg)}
                    </p>
                    <p className="mt-1 text-[11px] text-white/45">
                      {weatherCodeLabel(snapshot.weatherCode)} · {Math.round(snapshot.humidityPct)}%
                      humidity · {snapshot.rainMm.toFixed(1)} mm rain
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Minus, Plus } from "lucide-react";
import "leaflet/dist/leaflet.css";

import {
  formatWindDirection,
  getWeatherDisplaySnapshot,
  type LocationWeather,
  type WeatherDisplaySnapshot,
  type WeatherTimeframe,
  weatherCodeEmoji,
  weatherCodeLabel,
  weatherMapTint,
} from "@/lib/weather-data";

type WeatherBroadcastMapProps = {
  latitude: number;
  longitude: number;
  locationLabel: string;
  regionLabel: string;
  weather: LocationWeather;
  timeframe: WeatherTimeframe;
  weekDayIndex: number;
};

function MapRecenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  const lastSiteKey = useRef<string | null>(null);
  const siteKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

  useEffect(() => {
    if (lastSiteKey.current === siteKey) return;
    map.setView([latitude, longitude], 9, { animate: true });
    lastSiteKey.current = siteKey;
  }, [latitude, longitude, map, siteKey]);

  return null;
}

function MapBridge({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

function WindFieldOverlay({ snapshot }: { snapshot: WeatherDisplaySnapshot }) {
  const offsets = [
    [-18, -12],
    [0, -16],
    [18, -12],
    [-22, 4],
    [0, 0],
    [22, 4],
    [-18, 16],
    [0, 20],
    [18, 16],
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-[430]">
      {offsets.map(([x, y], index) => (
        <div
          key={index}
          className="absolute left-1/2 top-1/2 flex flex-col items-center"
          style={{ transform: `translate(calc(-50% + ${x}%), calc(-50% + ${y}%))` }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-[#0b1f44]/55 text-sky-200 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm"
            style={{ transform: `rotate(${snapshot.windDirectionDeg}deg)` }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
              <path d="M12 3v14M12 3l4 4M12 3L8 7" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <span className="mt-1 rounded bg-black/45 px-1.5 py-0.5 text-[9px] font-semibold text-white/80">
            {snapshot.windSpeedMph.toFixed(0)} mph
          </span>
        </div>
      ))}
    </div>
  );
}

export default function WeatherBroadcastMap({
  latitude,
  longitude,
  locationLabel,
  regionLabel,
  weather,
  timeframe,
  weekDayIndex,
}: WeatherBroadcastMapProps) {
  const snapshot = getWeatherDisplaySnapshot(weather, timeframe, weekDayIndex);
  const tint = weatherMapTint(snapshot.weatherCode);
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  return (
    <div className="weather-broadcast-shell relative overflow-hidden rounded-2xl border-2 border-[#1d4ed8]/70 shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
      <div className="absolute inset-x-0 top-0 z-[500] flex items-center justify-between bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#1e40af] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            Live
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-white">
            Weather Watch
          </span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/85">
          Unit311 · Regional Forecast
        </span>
      </div>

      <div className="relative h-[min(58vh,520px)]">
        <MapContainer
          center={[latitude, longitude]}
          zoom={9}
          minZoom={6}
          maxZoom={16}
          scrollWheelZoom
          dragging
          doubleClickZoom
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            maxZoom={18}
            opacity={0.85}
          />
          <MapRecenter latitude={latitude} longitude={longitude} />
          <MapBridge onReady={handleMapReady} />
        </MapContainer>

        {mapReady && (
          <div className="absolute bottom-28 right-4 z-[470] flex flex-col overflow-hidden rounded-xl border border-white/20 bg-[#0b1f44]/88 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => mapRef.current?.zoomIn()}
              className="flex h-10 w-10 items-center justify-center text-white transition-colors hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="h-px bg-white/15" />
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => mapRef.current?.zoomOut()}
              className="flex h-10 w-10 items-center justify-center text-white transition-colors hover:bg-white/10"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0 z-[410]"
          style={{ background: tint }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[411] bg-[radial-gradient(circle_at_center,transparent_35%,rgba(7,17,33,0.55)_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[412] bg-gradient-to-t from-[#07111f]/92 via-transparent to-[#07111f]/35"
          aria-hidden
        />

        <svg
          className="pointer-events-none absolute inset-0 z-[420] h-full w-full opacity-25"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {[18, 28, 38, 48].map((radius) => (
            <ellipse
              key={radius}
              cx="50"
              cy="52"
              rx={radius * 0.9}
              ry={radius}
              fill="none"
              stroke="rgba(147, 197, 253, 0.55)"
              strokeWidth="0.35"
              strokeDasharray="2 2"
            />
          ))}
        </svg>

        <WindFieldOverlay snapshot={snapshot} />

        <div className="absolute left-5 top-14 z-[460] max-w-[220px] rounded-2xl border border-white/20 bg-[#0b1f44]/78 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
            {snapshot.dayLabel}
            {snapshot.isLive ? " · Now" : ""}
          </p>
          <p className="mt-1 text-5xl font-bold tracking-tight text-white">
            {Math.round(snapshot.tempHighC)}°
            <span className="ml-1 text-2xl font-semibold text-white/55">
              / {Math.round(snapshot.tempLowC)}°
            </span>
          </p>
          <p className="mt-1 text-sm font-medium text-white/85">
            {weatherCodeEmoji(snapshot.weatherCode)} {weatherCodeLabel(snapshot.weatherCode)}
          </p>
        </div>

        <div className="absolute right-5 top-14 z-[460] rounded-2xl border border-white/20 bg-[#0b1f44]/78 px-4 py-3 text-right shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">Wind</p>
          <div
            className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-full border border-sky-400/35 bg-sky-500/10 text-sky-200"
            style={{ transform: `rotate(${snapshot.windDirectionDeg}deg)` }}
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
              <path
                d="M12 4v13M12 4l4.5 4.5M12 4L7.5 8.5"
                stroke="currentColor"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            {snapshot.windSpeedMph.toFixed(0)} mph {formatWindDirection(snapshot.windDirectionDeg)}
          </p>
        </div>

        <div className="absolute bottom-0 inset-x-0 z-[460] bg-gradient-to-r from-[#0b2d63]/96 via-[#1d4ed8]/92 to-[#0b2d63]/96 px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200/80">
                {regionLabel}
              </p>
              <p className="text-lg font-bold text-white">{locationLabel}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-white/90">
              <span>
                Wind {snapshot.windSpeedMph.toFixed(0)} mph {formatWindDirection(snapshot.windDirectionDeg)}
              </span>
              <span>Humidity {Math.round(snapshot.humidityPct)}%</span>
              <span>Rain {snapshot.rainMm.toFixed(1)} mm</span>
              <span>Precip {snapshot.precipMm.toFixed(1)} mm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { SIMULATION_TICK_SECONDS } from "@/lib/flight-simulation";
import { type MapTerrainStyle } from "@/lib/map-tiles";
import type { Telemetry } from "@/lib/telemetry";

import MapTileLayers from "./MapTileLayers";

type LatLng = [number, number];

type LiveVideoTerrainMapProps = {
  telemetry: Telemetry;
  terrainStyle?: MapTerrainStyle;
  /** Forces a fresh map when the flight profile or region changes. */
  sessionKey: string;
};

type CameraMotion = {
  heading: number;
  bank: number;
  shakeX: number;
  shakeY: number;
};

type CameraSegment = {
  from: LatLng;
  to: LatLng;
  startedAt: number;
  durationMs: number;
};

const METERS_PER_DEGREE_LAT = 111_320;

function metersPerDegreeLng(latitude: number) {
  return METERS_PER_DEGREE_LAT * Math.cos((latitude * Math.PI) / 180);
}

function distanceBetweenM(from: LatLng, to: LatLng) {
  const midLat = (from[0] + to[0]) / 2;
  const deltaLatM = (to[0] - from[0]) * METERS_PER_DEGREE_LAT;
  const deltaLngM = (to[1] - from[1]) * metersPerDegreeLng(midLat);
  return Math.hypot(deltaLatM, deltaLngM);
}

function zoomForAltitude(altitudeFt: number) {
  if (altitudeFt >= 360) return 17;
  if (altitudeFt >= 280) return 18;
  return 18;
}

function bearingDegrees(from: LatLng, to: LatLng) {
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const deltaLng = ((to[1] - from[1]) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function lerpLatLng(from: LatLng, to: LatLng, progress: number): LatLng {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
  ];
}

function smoothstep(progress: number) {
  const clamped = Math.max(0, Math.min(progress, 1));
  return clamped * clamped * (3 - 2 * clamped);
}

function mphToMps(speedMph: number) {
  return speedMph * 0.44704;
}

function applyCameraTransform(stage: HTMLDivElement, motion: CameraMotion, scale: number) {
  stage.style.transform = [
    `rotateX(52deg)`,
    `rotateZ(${(-motion.heading + motion.bank).toFixed(2)}deg)`,
    `scale(${scale.toFixed(3)})`,
    `translate3d(${motion.shakeX.toFixed(2)}px, ${(motion.shakeY - 6).toFixed(2)}px, 0)`,
  ].join(" ");
}

function ChaseCamera({
  telemetry,
  terrainStyle,
  stageRef,
}: {
  telemetry: Telemetry;
  terrainStyle: MapTerrainStyle;
  stageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const map = useMap();
  const telemetryRef = useRef(telemetry);
  const displayPositionRef = useRef<LatLng>([telemetry.latitude, telemetry.longitude]);
  const headingRef = useRef(0);
  const lastHeadingRef = useRef(0);
  const segmentRef = useRef<CameraSegment>({
    from: [telemetry.latitude, telemetry.longitude],
    to: [telemetry.latitude, telemetry.longitude],
    startedAt: 0,
    durationMs: SIMULATION_TICK_SECONDS * 1000,
  });

  useEffect(() => {
    telemetryRef.current = telemetry;

    const nextTarget: LatLng = [telemetry.latitude, telemetry.longitude];
    const previousTarget = segmentRef.current.to;
    const display = displayPositionRef.current;
    const jumpM = distanceBetweenM(display, nextTarget);
    const targetMoved =
      previousTarget[0] !== nextTarget[0] || previousTarget[1] !== nextTarget[1];

    if (jumpM > 350) {
      displayPositionRef.current = nextTarget;
      segmentRef.current = {
        from: nextTarget,
        to: nextTarget,
        startedAt: performance.now(),
        durationMs: SIMULATION_TICK_SECONDS * 1000,
      };
      map.setView(nextTarget, zoomForAltitude(telemetry.altitudeFt), { animate: false });
      map.invalidateSize();
    } else if (targetMoved) {
      headingRef.current = bearingDegrees(previousTarget, nextTarget);
      segmentRef.current = {
        from: displayPositionRef.current,
        to: nextTarget,
        startedAt: performance.now(),
        durationMs: SIMULATION_TICK_SECONDS * 1000,
      };
    }
  }, [map, telemetry]);

  useEffect(() => {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();

    if (map.zoomControl) {
      map.removeControl(map.zoomControl);
    }

    let frameId = 0;
    let lastTimestamp = performance.now();
    const scale = terrainStyle === "urban" ? 1.78 : 1.72;

    const tick = (timestamp: number) => {
      const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;

      const current = telemetryRef.current;
      const segment = segmentRef.current;
      if (segment.startedAt === 0) {
        segment.startedAt = timestamp;
      }
      const elapsedMs = timestamp - segment.startedAt;
      const progress = smoothstep(elapsedMs / segment.durationMs);
      const displayPosition = lerpLatLng(segment.from, segment.to, progress);
      displayPositionRef.current = displayPosition;

      const heading = headingRef.current;
      const speedMps = mphToMps(current.speedMph);
      const headingDelta = Math.abs(heading - lastHeadingRef.current);
      lastHeadingRef.current = heading;

      const shakeIntensity = 0.12 + speedMps * 0.018 + headingDelta * 2.5;
      const motion: CameraMotion = {
        heading,
        bank: Math.sin(timestamp * 0.0018) * 1.4 + headingDelta * 12,
        shakeX: Math.sin(timestamp * 0.011) * shakeIntensity,
        shakeY: Math.cos(timestamp * 0.009) * shakeIntensity * 0.7,
      };

      if (stageRef.current) {
        applyCameraTransform(stageRef.current, motion, scale);
      }

      map.setView(displayPosition, zoomForAltitude(current.altitudeFt), { animate: false });

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [map, stageRef, terrainStyle]);

  return null;
}

export default function LiveVideoTerrainMap({
  telemetry,
  terrainStyle = "satellite",
  sessionKey,
}: LiveVideoTerrainMapProps) {
  const initialPosition: LatLng = [telemetry.latitude, telemetry.longitude];
  const stageRef = useRef<HTMLDivElement>(null);
  const shellClassName =
    terrainStyle === "urban"
      ? "live-video-map-shell live-video-map-shell--urban"
      : "live-video-map-shell";

  return (
    <div className={`${shellClassName} absolute inset-0 overflow-hidden`}>
      <div className="live-video-camera-rig absolute inset-0">
        <div ref={stageRef} className="live-video-map-stage absolute inset-0">
          <MapContainer
            key={sessionKey}
            center={initialPosition}
            zoom={zoomForAltitude(telemetry.altitudeFt)}
            scrollWheelZoom={false}
            zoomControl={false}
            attributionControl={false}
            className="h-full w-full"
            style={{ background: "#1a2418" }}
          >
            <MapTileLayers style={terrainStyle} showAttribution={false} videoMode />
            <ChaseCamera telemetry={telemetry} terrainStyle={terrainStyle} stageRef={stageRef} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

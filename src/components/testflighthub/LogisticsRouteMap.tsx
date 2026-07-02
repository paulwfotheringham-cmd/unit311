"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { FeaturedRouteSnapshot } from "@/lib/logistics-data";

import MapTileLayers from "./MapTileLayers";
import { cn } from "@/lib/utils";

type LatLng = [number, number];

function planeIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:rgba(14,165,233,0.95);border:2px solid #e0f2fe;box-shadow:0 0 18px rgba(56,189,248,0.85);font-size:16px;">✈</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function vanIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:rgba(245,158,11,0.95);border:2px solid #fef3c7;box-shadow:0 0 14px rgba(245,158,11,0.8);font-size:14px;">🚐</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function endpointIcon(color: string, border: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid ${border};box-shadow:0 0 12px rgba(255,255,255,0.35);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function MapBoundsSync({ route }: { route: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (route.length < 2) return;
    map.fitBounds(L.latLngBounds(route), { padding: [28, 28] });
  }, [map, route]);

  return null;
}

function MapResizeSync({ route }: { route: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    const sync = () => {
      map.invalidateSize({ animate: false });
      if (route.length >= 2) {
        map.fitBounds(L.latLngBounds(route), { padding: [24, 24] });
      }
    };

    sync();

    const container = map.getContainer();
    const observer = new ResizeObserver(() => sync());
    observer.observe(container);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, [map, route]);

  return null;
}

function RoutePolyline({ route, dashed }: { route: LatLng[]; dashed?: boolean }) {
  const map = useMap();
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!polylineRef.current) {
      polylineRef.current = L.polyline(route, {
        color: dashed ? "#fbbf24" : "#38bdf8",
        weight: dashed ? 3 : 4,
        opacity: dashed ? 0.7 : 0.95,
        dashArray: dashed ? "8 10" : undefined,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      return;
    }

    polylineRef.current.setLatLngs(route);
  }, [dashed, map, route]);

  useEffect(() => {
    return () => {
      polylineRef.current?.remove();
      polylineRef.current = null;
    };
  }, [map]);

  return null;
}

function RouteMarkers({
  snapshot,
  compactTooltip,
}: {
  snapshot: FeaturedRouteSnapshot;
  compactTooltip: boolean;
}) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const origin = L.marker([snapshot.origin.lat, snapshot.origin.lng], {
      icon: endpointIcon("#10b981", "#d1fae5"),
    }).addTo(map);
    origin.bindTooltip(snapshot.origin.name, { permanent: false, direction: "top" });

    const destination = L.marker([snapshot.destination.lat, snapshot.destination.lng], {
      icon: endpointIcon("#f59e0b", "#fef3c7"),
    }).addTo(map);
    destination.bindTooltip(snapshot.destination.name, { permanent: false, direction: "top" });

    const current = L.marker(
      [snapshot.currentPosition.lat, snapshot.currentPosition.lng],
      { icon: snapshot.currentLeg === "air" ? planeIcon() : vanIcon() },
    ).addTo(map);
    current.bindTooltip(snapshot.currentLocationLabel, {
      permanent: !compactTooltip,
      direction: "top",
      className: "logistics-live-tooltip",
    });

    markersRef.current = [origin, destination, current];

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [compactTooltip, map, snapshot]);

  return null;
}

type LogisticsRouteMapProps = {
  snapshot: FeaturedRouteSnapshot;
  className?: string;
};

export default function LogisticsRouteMap({ snapshot, className }: LogisticsRouteMapProps) {
  const [compactTooltip, setCompactTooltip] = useState(false);
  const route = snapshot.route.map((point) => [point.lat, point.lng] as LatLng);
  const completedIndex = Math.max(
    1,
    Math.round((snapshot.progressPct / 100) * (route.length - 1)),
  );
  const completedRoute = route.slice(0, completedIndex + 1);
  const remainingRoute = route.slice(completedIndex);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setCompactTooltip(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div
      className={cn(
        "h-[200px] overflow-hidden rounded-xl border border-white/10",
        className,
      )}
    >
      <MapContainer
        center={[46.5, -1]}
        zoom={5}
        className="h-full w-full touch-pan-x touch-pan-y"
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <MapTileLayers style="satellite" flightPathMode />
        <MapBoundsSync route={route} />
        <MapResizeSync route={route} />
        <RoutePolyline route={completedRoute} />
        {remainingRoute.length > 1 ? <RoutePolyline route={remainingRoute} dashed /> : null}
        <RouteMarkers snapshot={snapshot} compactTooltip={compactTooltip} />
      </MapContainer>
    </div>
  );
}

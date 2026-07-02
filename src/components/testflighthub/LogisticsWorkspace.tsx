"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import {
  FEATURED_BARCELONA_LONDON_ROUTE,
  LOGISTICS_MOCK_SHIPMENTS,
  formatLogisticsDate,
  getFeaturedShipment,
  getInboundShipments,
  getOutboundShipments,
  logisticsStatusClass,
  type LogisticsShipment,
} from "@/lib/logistics-data";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  MapPin,
  Package,
  Plane,
  Truck,
} from "lucide-react";

const LogisticsRouteMap = dynamic(() => import("./LogisticsRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(36vh,280px)] items-center justify-center rounded-xl border border-white/10 bg-[#0b1524] text-sm text-white/45 sm:h-[min(44vh,340px)] md:h-[min(48vh,380px)] lg:h-[min(52vh,420px)]">
      Loading route map…
    </div>
  ),
});

function ShipmentCard({
  shipment,
  selected,
  onSelect,
}: {
  shipment: LogisticsShipment;
  selected: boolean;
  onSelect: () => void;
}) {
  const DirectionIcon = shipment.direction === "inbound" ? ArrowDownLeft : ArrowUpRight;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full touch-manipulation rounded-xl border px-4 py-3.5 text-left transition-colors sm:py-3",
        selected
          ? "border-sky-400/40 bg-sky-500/10 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <DirectionIcon className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-sky-300/80">
              {shipment.trackingNumber}
            </p>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-white">{shipment.contents}</p>
          <p className="mt-1 text-xs text-white/45">
            {shipment.origin} → {shipment.destination}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
            logisticsStatusClass(shipment.status),
          )}
        >
          {shipment.status}
        </span>
      </div>

      <div className="mt-3 grid gap-1 text-[11px] text-white/45 sm:grid-cols-2">
        <p>
          Sent {formatLogisticsDate(shipment.sentAt)} · {shipment.carrier}
        </p>
        <p>
          To {shipment.recipient} · by {shipment.sentBy}
        </p>
      </div>
    </button>
  );
}

export default function LogisticsWorkspace() {
  const inbound = useMemo(() => getInboundShipments(), []);
  const outbound = useMemo(() => getOutboundShipments(), []);
  const featured = useMemo(() => getFeaturedShipment(), []);
  const [selectedId, setSelectedId] = useState(featured.id);

  const selectedShipment =
    LOGISTICS_MOCK_SHIPMENTS.find((shipment) => shipment.id === selectedId) ?? featured;

  const routeSnapshot =
    selectedShipment.id === FEATURED_BARCELONA_LONDON_ROUTE.shipmentId
      ? FEATURED_BARCELONA_LONDON_ROUTE
      : null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              Logistics
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Package tracking</h2>
            <p className="mt-2 text-sm text-white/55">
              Mock inbound and outbound shipments across Unit311 hubs — carrier links and live route
              preview.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-200/80">Inbound</p>
              <p className="text-lg font-semibold text-white">{inbound.length}</p>
            </div>
            <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.12em] text-sky-200/80">Outbound</p>
              <p className="text-lg font-semibold text-white">{outbound.length}</p>
            </div>
          </div>
        </div>
      </section>

      {routeSnapshot && (
        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-sky-300" />
                <h3 className="text-base font-semibold text-white">
                  Live route — {routeSnapshot.label}
                </h3>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/55">
                <MapPin className="h-3.5 w-3.5 text-amber-300" />
                {routeSnapshot.currentLocationLabel}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {routeSnapshot.currentLeg === "air" ? "Air freight leg" : "Ground delivery leg"} ·{" "}
                {routeSnapshot.progressPct}% complete
              </p>
            </div>
            <a
              href={selectedShipment.carrierTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-[#4D148C]/50 bg-[#4D148C]/25 px-3 text-xs font-semibold text-violet-100 transition-colors hover:bg-[#4D148C]/40 sm:w-auto"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Track on {selectedShipment.carrier}
            </a>
          </div>

          <div className="mt-4">
            <LogisticsRouteMap snapshot={routeSnapshot} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Origin — {routeSnapshot.origin.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              Destination — {routeSnapshot.destination.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5 text-sky-300" />
              Current position
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-amber-300" />
              Final mile (mock)
            </span>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 xl:gap-6">
        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-emerald-300" />
            <h3 className="text-base font-semibold text-white">Inbound packages</h3>
          </div>
          <div className="mt-4 space-y-2">
            {inbound.map((shipment) => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                selected={selectedId === shipment.id}
                onSelect={() => setSelectedId(shipment.id)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-sky-300" />
            <h3 className="text-base font-semibold text-white">Outbound packages</h3>
          </div>
          <div className="mt-4 space-y-2">
            {outbound.map((shipment) => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                selected={selectedId === shipment.id}
                onSelect={() => setSelectedId(shipment.id)}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-sky-300" />
              <h3 className="text-base font-semibold text-white">Shipment details</h3>
            </div>
            <p className="mt-1 font-mono text-xs text-sky-300/80">{selectedShipment.trackingNumber}</p>
          </div>
          <a
            href={selectedShipment.carrierTrackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-[#4D148C]/50 bg-[#4D148C]/25 px-3 text-xs font-semibold text-violet-100 transition-colors hover:bg-[#4D148C]/40 sm:w-auto"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open {selectedShipment.carrier} tracking
          </a>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Date sent</p>
            <p className="mt-1 text-sm text-white">{formatLogisticsDate(selectedShipment.sentAt)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">ETA</p>
            <p className="mt-1 text-sm text-white">{formatLogisticsDate(selectedShipment.eta)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Carrier</p>
            <p className="mt-1 text-sm text-white">{selectedShipment.carrier}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Sent by</p>
            <p className="mt-1 text-sm text-white">{selectedShipment.sentBy}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Sender</p>
            <p className="mt-1 text-sm text-white">{selectedShipment.sender}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Recipient</p>
            <p className="mt-1 text-sm text-white">{selectedShipment.recipient}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Contents</p>
            <p className="mt-1 text-sm text-white">{selectedShipment.contents}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Weight</p>
            <p className="mt-1 text-sm text-white">{selectedShipment.weightKg} kg</p>
          </div>
        </div>

        {selectedShipment.notes && (
          <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {selectedShipment.notes}
          </p>
        )}
      </section>
    </div>
  );
}

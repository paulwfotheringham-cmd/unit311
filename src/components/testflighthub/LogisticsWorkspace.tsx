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
  Plus,
  Search,
  Settings,
  Truck,
} from "lucide-react";

const LogisticsRouteMap = dynamic(() => import("./LogisticsRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] items-center justify-center rounded-xl border border-white/10 bg-[#0b1524] text-sm text-white/45">
      Loading route map…
    </div>
  ),
});

const MOCK_COURIER_LINKS = [
  { name: "FedEx", url: "https://www.fedex.com/fedextrack/" },
  { name: "DHL", url: "https://www.dhl.com/global-en/home/tracking.html" },
  { name: "UPS", url: "https://www.ups.com/track" },
  { name: "Royal Mail", url: "https://www.royalmail.com/track-your-item" },
];

const CARRIER_OPTIONS = ["FedEx", "DHL", "UPS", "Unit311 Courier", "Royal Mail"] as const;

type NewPackageForm = {
  id: string;
  origin: string;
  destination: string;
  carrier: (typeof CARRIER_OPTIONS)[number];
};

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
  const [shipments, setShipments] = useState(LOGISTICS_MOCK_SHIPMENTS);
  const inbound = useMemo(() => getInboundShipments(shipments), [shipments]);
  const outbound = useMemo(() => getOutboundShipments(shipments), [shipments]);
  const featured = useMemo(() => getFeaturedShipment(shipments), [shipments]);
  const [selectedId, setSelectedId] = useState(featured.id);
  const [packageSearchQuery, setPackageSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPackage, setNewPackage] = useState<NewPackageForm>({
    id: "",
    origin: "",
    destination: "",
    carrier: "FedEx",
  });

  const selectedShipment =
    shipments.find((shipment) => shipment.id === selectedId) ?? featured;

  const routeSnapshot =
    selectedShipment.id === FEATURED_BARCELONA_LONDON_ROUTE.shipmentId
      ? FEATURED_BARCELONA_LONDON_ROUTE
      : null;

  function handlePackageSearch(query: string) {
    setPackageSearchQuery(query);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;

    const match = shipments.find(
      (shipment) =>
        shipment.id.toLowerCase().includes(trimmed) ||
        shipment.trackingNumber.toLowerCase().includes(trimmed) ||
        shipment.contents.toLowerCase().includes(trimmed),
    );
    if (match) setSelectedId(match.id);
  }

  function handleAddPackage() {
    const id = newPackage.id.trim();
    const origin = newPackage.origin.trim();
    const destination = newPackage.destination.trim();
    if (!id || !origin || !destination) return;

    const trackingNumber = id.replace(/^shp-/i, "").toUpperCase();
    const shipment: LogisticsShipment = {
      id: id.startsWith("shp-") ? id : `shp-${id}`,
      trackingNumber,
      direction: "outbound",
      status: "Scheduled",
      carrier: newPackage.carrier,
      carrierTrackingUrl:
        MOCK_COURIER_LINKS.find((link) => link.name === newPackage.carrier)?.url ??
        "https://www.fedex.com/fedextrack/",
      sentAt: new Date().toISOString(),
      eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      origin,
      destination,
      recipient: "TBD",
      sender: "Unit311 — Logistics",
      sentBy: "Manual entry",
      contents: "New package",
      weightKg: 1,
    };

    setShipments((current) => [shipment, ...current]);
    setSelectedId(shipment.id);
    setPackageSearchQuery(shipment.trackingNumber);
    setNewPackage({ id: "", origin: "", destination: "", carrier: "FedEx" });
    setShowAddForm(false);
  }

  const inputClassName =
    "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              Logistics
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Package tracking</h2>
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
            <button
              type="button"
              onClick={() => setShowAddForm((current) => !current)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add package
            </button>
          </div>
        </div>

        <div className="mt-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={packageSearchQuery}
            onChange={(event) => handlePackageSearch(event.target.value)}
            placeholder="Search packages by ID, tracking number, or contents…"
            className={cn(inputClassName, "mt-0 pl-10")}
          />
        </div>

        {showAddForm && (
          <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-[#0b1524]/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                Package ID
              </label>
              <input
                value={newPackage.id}
                onChange={(event) => setNewPackage((current) => ({ ...current, id: event.target.value }))}
                placeholder="shp-custom-001"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                Origin
              </label>
              <input
                value={newPackage.origin}
                onChange={(event) =>
                  setNewPackage((current) => ({ ...current, origin: event.target.value }))
                }
                placeholder="Barcelona HQ, Spain"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                Destination
              </label>
              <input
                value={newPackage.destination}
                onChange={(event) =>
                  setNewPackage((current) => ({ ...current, destination: event.target.value }))
                }
                placeholder="Oxford, UK"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                Carrier
              </label>
              <select
                value={newPackage.carrier}
                onChange={(event) =>
                  setNewPackage((current) => ({
                    ...current,
                    carrier: event.target.value as NewPackageForm["carrier"],
                  }))
                }
                className={inputClassName}
              >
                {CARRIER_OPTIONS.map((carrier) => (
                  <option key={carrier} value={carrier}>
                    {carrier}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddPackage}
                disabled={!newPackage.id.trim() || !newPackage.origin.trim() || !newPackage.destination.trim()}
                className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Save package
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white/55">
          <Settings className="h-3.5 w-3.5 shrink-0 text-sky-300" />
          <span>
            Configure courier tracking URLs in{" "}
            <span className="font-medium text-white/75">Settings → Logistics couriers</span>.
            Mock links:
          </span>
          {MOCK_COURIER_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-medium text-sky-200 hover:bg-white/5"
            >
              {link.name}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          ))}
        </p>
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
              <p className="mt-1 font-mono text-xs text-sky-300/80">
                Package ID: {selectedShipment.id}
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
            <LogisticsRouteMap snapshot={routeSnapshot} className="h-[200px]" />
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

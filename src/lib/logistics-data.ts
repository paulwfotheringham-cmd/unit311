export type LogisticsDirection = "inbound" | "outbound";

export type LogisticsStatus =
  | "In transit"
  | "Out for delivery"
  | "Delivered"
  | "Awaiting pickup"
  | "Customs hold"
  | "Scheduled";

export type LogisticsCarrier = "FedEx" | "DHL" | "UPS" | "Unit311 Courier" | "Royal Mail";

export type LogisticsShipment = {
  id: string;
  trackingNumber: string;
  direction: LogisticsDirection;
  status: LogisticsStatus;
  carrier: LogisticsCarrier;
  carrierTrackingUrl: string;
  sentAt: string;
  eta: string;
  origin: string;
  destination: string;
  recipient: string;
  sender: string;
  sentBy: string;
  contents: string;
  weightKg: number;
  notes?: string;
  featured?: boolean;
};

export type LogisticsRouteLeg = "air" | "ground";

export type FeaturedRouteSnapshot = {
  shipmentId: string;
  label: string;
  currentLeg: LogisticsRouteLeg;
  progressPct: number;
  currentLocationLabel: string;
  origin: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  route: Array<{ lat: number; lng: number }>;
  currentPosition: { lat: number; lng: number };
};

export const LOGISTICS_MOCK_SHIPMENTS: LogisticsShipment[] = [
  {
    id: "shp-bcn-lon-001",
    trackingNumber: "794612345678",
    direction: "outbound",
    status: "In transit",
    carrier: "FedEx",
    carrierTrackingUrl: "https://www.fedex.com/fedextrack/?trknbr=794612345678",
    sentAt: "2026-06-16T08:30:00.000Z",
    eta: "2026-06-17T14:00:00.000Z",
    origin: "Barcelona HQ, Spain",
    destination: "Oxford Heritage Survey Ltd, London, UK",
    recipient: "James Whitfield",
    sender: "Unit311 — Logistics",
    sentBy: "Elena Morales",
    contents: "Matrice 4T gimbal calibration kit + spare propellers",
    weightKg: 8.4,
    notes: "Priority client mobilisation — signature required.",
    featured: true,
  },
  {
    id: "shp-in-002",
    trackingNumber: "JD0146000123456789",
    direction: "inbound",
    status: "Awaiting pickup",
    carrier: "DHL",
    carrierTrackingUrl: "https://www.dhl.com/global-en/home/tracking.html?tracking-id=JD0146000123456789",
    sentAt: "2026-06-17T06:15:00.000Z",
    eta: "2026-06-18T11:30:00.000Z",
    origin: "DJI Enterprise — Rotterdam, NL",
    destination: "Barcelona HQ, Spain",
    recipient: "Unit311 — Receiving",
    sender: "DJI Enterprise EU",
    sentBy: "Warehouse dispatch",
    contents: "TB65 intelligent flight battery × 4",
    weightKg: 12.1,
  },
  {
    id: "shp-out-003",
    trackingNumber: "1Z999AA10123456784",
    direction: "outbound",
    status: "Delivered",
    carrier: "UPS",
    carrierTrackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10123456784",
    sentAt: "2026-06-14T09:00:00.000Z",
    eta: "2026-06-15T16:45:00.000Z",
    origin: "Porto Operations, Portugal",
    destination: "Douro Maritime Logistics, Matosinhos",
    recipient: "Rui Ferreira",
    sender: "Unit311 — Porto",
    sentBy: "Ana Ribeiro",
    contents: "Processed orthomosaic USB drive + survey report",
    weightKg: 0.6,
  },
  {
    id: "shp-in-004",
    trackingNumber: "BCN-CR-88421",
    direction: "inbound",
    status: "In transit",
    carrier: "Unit311 Courier",
    carrierTrackingUrl: "https://www.fedex.com/fedextrack/",
    sentAt: "2026-06-17T11:20:00.000Z",
    eta: "2026-06-17T17:00:00.000Z",
    origin: "Oxford Studio, UK",
    destination: "Barcelona HQ, Spain",
    recipient: "Unit311 — R&D",
    sender: "Oxford Heritage Survey Ltd",
    sentBy: "James Whitfield",
    contents: "Returned RTK base antenna for bench test",
    weightKg: 2.3,
  },
  {
    id: "shp-out-005",
    trackingNumber: "RM123456789GB",
    direction: "outbound",
    status: "Scheduled",
    carrier: "Royal Mail",
    carrierTrackingUrl: "https://www.royalmail.com/track-your-item",
    sentAt: "2026-06-18T07:00:00.000Z",
    eta: "2026-06-19T12:00:00.000Z",
    origin: "Barcelona HQ, Spain",
    destination: "Venturi Aeronautical, Barcelona",
    recipient: "Eduard Gómez",
    sender: "Unit311 — Logistics",
    sentBy: "Paul Fotheringham",
    contents: "Signed NDA originals + compliance binder",
    weightKg: 1.1,
  },
  {
    id: "shp-in-006",
    trackingNumber: "794698765432",
    direction: "inbound",
    status: "Customs hold",
    carrier: "FedEx",
    carrierTrackingUrl: "https://www.fedex.com/fedextrack/?trknbr=794698765432",
    sentAt: "2026-06-15T14:45:00.000Z",
    eta: "2026-06-18T09:00:00.000Z",
    origin: "Perth WA, Australia",
    destination: "Barcelona HQ, Spain",
    recipient: "Unit311 — Import desk",
    sender: "Westport Logistics Hub",
    sentBy: "Marcus Chen",
    contents: "Thermal camera module — RMA return",
    weightKg: 3.8,
    notes: "Awaiting EU import documentation review.",
  },
];

export const FEATURED_BARCELONA_LONDON_ROUTE: FeaturedRouteSnapshot = {
  shipmentId: "shp-bcn-lon-001",
  label: "Barcelona → London",
  currentLeg: "air",
  progressPct: 68,
  currentLocationLabel: "Over Bordeaux, France — airborne",
  origin: { name: "Barcelona HQ", lat: 41.3874, lng: 2.1686 },
  destination: { name: "London", lat: 51.5074, lng: -0.1278 },
  route: [
    { lat: 41.3874, lng: 2.1686 },
    { lat: 41.9, lng: 1.2 },
    { lat: 43.2, lng: -0.5 },
    { lat: 44.8378, lng: -0.5792 },
    { lat: 46.2, lng: -0.8 },
    { lat: 48.5, lng: -1.2 },
    { lat: 49.5, lng: -1.0 },
    { lat: 50.2, lng: -0.5 },
    { lat: 51.5074, lng: -0.1278 },
  ],
  currentPosition: { lat: 44.8378, lng: -0.5792 },
};

export function logisticsStatusClass(status: LogisticsStatus) {
  switch (status) {
    case "In transit":
      return "border-sky-400/40 bg-sky-500/15 text-sky-200";
    case "Out for delivery":
      return "border-violet-400/40 bg-violet-500/15 text-violet-200";
    case "Delivered":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
    case "Awaiting pickup":
      return "border-amber-400/40 bg-amber-500/15 text-amber-200";
    case "Customs hold":
      return "border-rose-400/40 bg-rose-500/15 text-rose-200";
    case "Scheduled":
      return "border-white/20 bg-white/10 text-white/60";
  }
}

export function formatLogisticsDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function getInboundShipments(shipments = LOGISTICS_MOCK_SHIPMENTS) {
  return shipments.filter((shipment) => shipment.direction === "inbound");
}

export function getOutboundShipments(shipments = LOGISTICS_MOCK_SHIPMENTS) {
  return shipments.filter((shipment) => shipment.direction === "outbound");
}

export function getFeaturedShipment(shipments = LOGISTICS_MOCK_SHIPMENTS) {
  return shipments.find((shipment) => shipment.featured) ?? shipments[0];
}

import { DRONE_ID, type Telemetry } from "@/lib/telemetry";
import { OXFORD_FLIGHT_PROFILE, SPAIN_FLIGHT_PROFILE } from "@/lib/flight-simulation";
import { REGION_OWNER_USER_IDS } from "@/lib/user-management-data";

export type MissionStatus = "Active" | "Scheduled" | "Completed" | "On Hold";

export type FleetDroneStatus =
  | "In Flight"
  | "Standby"
  | "In Hangar"
  | "Maintenance"
  | "Stopped";

export type FleetDronePosition = {
  latitude: number;
  longitude: number;
  label: string;
};

export type FleetDroneSummary = {
  id: string;
  model: string;
  homeBase: string;
  status: FleetDroneStatus;
  battery: number;
  lastContact: string;
  telemetryDroneId?: string;
  flightHubPosition: FleetDronePosition;
  defaultAssignedUserId: string;
};

/** Douro berth survey point — simulated FlightHub 2 home for Porto fleet asset. */
const PORTO_FLIGHT_HUB_POSITION: FleetDronePosition = {
  latitude: 41.1403,
  longitude: -8.6088,
  label: "Douro Berth Survey Home, Porto",
};

export const fleetDrones: FleetDroneSummary[] = [
  {
    id: "DC-M4T-BCN",
    model: "DJI Matrice 4T",
    homeBase: "Barcelona",
    status: "Standby",
    battery: 96,
    lastContact: "4 min ago",
    flightHubPosition: {
      latitude: SPAIN_FLIGHT_PROFILE.startPosition.latitude,
      longitude: SPAIN_FLIGHT_PROFILE.startPosition.longitude,
      label: SPAIN_FLIGHT_PROFILE.startPosition.label,
    },
    defaultAssignedUserId: REGION_OWNER_USER_IDS.Barcelona,
  },
  {
    id: "DC-M4T-PRT",
    model: "DJI Matrice 4T",
    homeBase: "Porto",
    status: "In Hangar",
    battery: 100,
    lastContact: "18 min ago",
    flightHubPosition: PORTO_FLIGHT_HUB_POSITION,
    defaultAssignedUserId: REGION_OWNER_USER_IDS.Porto,
  },
  {
    id: "DC-M4T-OXF",
    model: "DJI Matrice 4T",
    homeBase: "Oxford",
    status: "Standby",
    battery: 94,
    lastContact: "Awaiting link",
    telemetryDroneId: "DC-TEST-001",
    flightHubPosition: {
      latitude: OXFORD_FLIGHT_PROFILE.startPosition.latitude,
      longitude: OXFORD_FLIGHT_PROFILE.startPosition.longitude,
      label: OXFORD_FLIGHT_PROFILE.startPosition.label,
    },
    defaultAssignedUserId: REGION_OWNER_USER_IDS.Oxford,
  },
];

export function getFleetDronePosition(
  drone: FleetDroneSummary,
  liveTelemetry: Telemetry | null,
  isRunning: boolean,
): FleetDronePosition & { live: boolean } {
  const linkedId = drone.telemetryDroneId ?? drone.id;
  if (linkedId === DRONE_ID && liveTelemetry) {
    return {
      latitude: liveTelemetry.latitude,
      longitude: liveTelemetry.longitude,
      label: isRunning
        ? "Live FlightHub 2 telemetry stream"
        : `${liveTelemetry.latitude.toFixed(5)}, ${liveTelemetry.longitude.toFixed(5)}`,
      live: isRunning,
    };
  }

  return { ...drone.flightHubPosition, live: false };
}

export function buildDefaultFleetAssignments() {
  return Object.fromEntries(
    fleetDrones.map((drone) => [drone.id, drone.defaultAssignedUserId]),
  ) as Record<string, string>;
}

export const recentMissions = [
  {
    name: "Riells del Fai Corridor Survey",
    client: "Catalonia Energy Partners",
    status: "Completed" as MissionStatus,
    date: "12 Jun 2026",
  },
  {
    name: "Douro Berth Volumetrics",
    client: "Douro Maritime Logistics",
    status: "Active" as MissionStatus,
    date: "17 Jun 2026",
  },
  {
    name: "Oxford Campus Envelope",
    client: "Oxford Heritage Survey Ltd",
    status: "Scheduled" as MissionStatus,
    date: "22 Jun 2026",
  },
  {
    name: "Iberia Corridor Pilot",
    client: "Iberia Infrastructure Group",
    status: "On Hold" as MissionStatus,
    date: "28 Jun 2026",
  },
] as const;

export type SurveyOperationsBasePath =
  | "/"
  | "/dashboard"
  | "/testflighthub"
  | "/internaldashboard"
  | "/internaldashboard_grants";

export const DEFAULT_SURVEY_OPERATIONS_BASE_PATH: SurveyOperationsBasePath = "/testflighthub";

export const SURVEY_OPERATIONS_BASE_PATHS: SurveyOperationsBasePath[] = [
  "/",
  "/dashboard",
  "/testflighthub",
  "/internaldashboard",
  "/internaldashboard_grants",
];

export function isSurveyOperationsDashboardPath(pathname: string, basePath?: SurveyOperationsBasePath) {
  if (basePath) {
    return pathname === basePath || (basePath === "/" && pathname === "/");
  }

  return SURVEY_OPERATIONS_BASE_PATHS.includes(pathname as SurveyOperationsBasePath);
}

export type SurveyOperationsView =
  | "dashboard"
  | "clients"
  | "assets"
  | "sites"
  | "missions"
  | "fleet"
  | "flight-logs";

export const surveyNavItems = [
  { label: "Dashboard", icon: "LayoutDashboard", view: "dashboard" as const },
  { label: "Clients", icon: "Building2", view: "clients" as const },
  { label: "Assets", icon: "Package", view: "assets" as const },
  { label: "Sites", icon: "MapPin", view: "sites" as const },
  { label: "Missions", icon: "Target", view: "missions" as const },
  { label: "Fleet", icon: "Plane", view: "fleet" as const },
  { label: "Live Telemetry", icon: "Radio", view: null, href: "/telemetry" as const },
  { label: "Flight Logs", icon: "ScrollText", view: "flight-logs" as const },
] as const;

const surveyOperationsViews: SurveyOperationsView[] = [
  "dashboard",
  "clients",
  "assets",
  "sites",
  "missions",
  "fleet",
  "flight-logs",
];

export function isSurveyOperationsView(value: string | null): value is SurveyOperationsView {
  return surveyOperationsViews.includes(value as SurveyOperationsView);
}

export function getSurveyNavHref(
  view: SurveyOperationsView | null,
  externalHref: string | undefined,
  basePath: SurveyOperationsBasePath = DEFAULT_SURVEY_OPERATIONS_BASE_PATH,
) {
  if (externalHref === "/telemetry") {
    return externalHref;
  }

  if (!view || view === "dashboard") {
    return basePath;
  }

  return `${basePath}?view=${view}`;
}

export function isSurveyNavItemActive(
  pathname: string,
  item: (typeof surveyNavItems)[number],
  activeView?: SurveyOperationsView | null,
  basePath: SurveyOperationsBasePath = DEFAULT_SURVEY_OPERATIONS_BASE_PATH,
) {
  if ("href" in item && item.href === "/telemetry") {
    return pathname === "/telemetry";
  }

  if (pathname === basePath && activeView != null) {
    return item.view === activeView;
  }

  return item.view === "dashboard" && pathname === basePath;
}

export const surveyViewTitles: Record<
  SurveyOperationsView,
  { title: string; subtitle: string }
> = {
  dashboard: { title: "Operations Dashboard", subtitle: "Survey Operations" },
  clients: { title: "Client Directory", subtitle: "Survey Operations" },
  assets: { title: "Asset Registry", subtitle: "Survey Operations" },
  sites: { title: "Site Registry", subtitle: "Survey Operations" },
  missions: { title: "Mission Management", subtitle: "Survey Operations" },
  fleet: { title: "Fleet Overview", subtitle: "Survey Operations" },
  "flight-logs": { title: "Flight Logs", subtitle: "Survey Operations" },
};

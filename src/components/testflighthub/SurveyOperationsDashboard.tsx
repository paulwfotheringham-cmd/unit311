"use client";

import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  createInitialAssetRegistry,
  type ManagedAsset,
} from "@/lib/asset-management-data";
import {
  createInitialClients,
  type ManagedClient,
} from "@/lib/client-management-data";
import {
  createInitialMissions,
  createMissionEvent,
  type ManagedMission,
} from "@/lib/mission-management-data";
import {
  DEFAULT_SURVEY_OPERATIONS_BASE_PATH,
  isSurveyOperationsView,
  type SurveyOperationsBasePath,
  type SurveyOperationsView,
} from "@/lib/survey-operations-mock-data";
import { createInitialUsers } from "@/lib/user-management-data";
import AssetManagementWorkspace from "./AssetManagementWorkspace";
import ClientManagementWorkspace from "./ClientManagementWorkspace";
import FleetPanel from "./FleetPanel";
import MissionManagementWorkspace from "./MissionManagementWorkspace";
import RecentMissionsPanel from "./RecentMissionsPanel";
import SurveyOperationsPlaceholder from "./SurveyOperationsPlaceholder";
import SurveyOperationsShell from "./SurveyOperationsShell";
import { useSurveyOperationsSimulator } from "./SurveyOperationsSimulatorProvider";

function readInitialView(searchParams: ReturnType<typeof useSearchParams>): SurveyOperationsView {
  const viewParam = searchParams.get("view");
  return isSurveyOperationsView(viewParam) ? viewParam : "dashboard";
}

type SurveyOperationsDashboardProps = {
  basePath?: SurveyOperationsBasePath;
};

export default function SurveyOperationsDashboard({
  basePath = DEFAULT_SURVEY_OPERATIONS_BASE_PATH,
}: SurveyOperationsDashboardProps) {
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<SurveyOperationsView>(() =>
    readInitialView(searchParams),
  );
  const {
    sandboxRef,
    liveTelemetry,
    isRunning,
    setSandboxMountTarget,
    setSimulatorEnabled,
  } = useSurveyOperationsSimulator();

  useEffect(() => {
    setSimulatorEnabled(true);
    return () => setSimulatorEnabled(false);
  }, [setSimulatorEnabled]);
  const [missions, setMissions] = useState<ManagedMission[]>(() => createInitialMissions());
  const [assetRegistry] = useState(() => createInitialAssetRegistry());
  const [assets, setAssets] = useState<ManagedAsset[]>(() => assetRegistry.assets);
  const [assetCategories, setAssetCategories] = useState<string[]>(() => assetRegistry.categories);
  const [assetLocations, setAssetLocations] = useState<string[]>(() => assetRegistry.locations);
  const [clients, setClients] = useState<ManagedClient[]>(() => createInitialClients());
  const [users] = useState(() => createInitialUsers());
  const [selectedMissionId, setSelectedMissionId] = useState("mission-1");
  const [selectedAssetId, setSelectedAssetId] = useState("asset-1");
  const [selectedClientId, setSelectedClientId] = useState("client-1");
  const [runningMissionId, setRunningMissionId] = useState<string | null>(null);
  const activeMissionIdRef = useRef<string | null>(null);
  const lowBatteryWarnedRef = useRef<Set<string>>(new Set());
  const waypointMilestonesRef = useRef<Map<string, number>>(new Map());
  const dashboardSandboxHostRef = useRef<HTMLDivElement>(null);
  const missionsSandboxHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    startTransition(() => {
      if (isSurveyOperationsView(viewParam)) {
        setActiveView(viewParam);
      } else if (!viewParam) {
        setActiveView("dashboard");
      }
    });
  }, [searchParams]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeView === "dashboard") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", activeView);
    }
    window.history.replaceState({}, "", url.toString());
  }, [activeView]);

  useLayoutEffect(() => {
    const host =
      activeView === "dashboard"
        ? dashboardSandboxHostRef.current
        : activeView === "missions"
          ? missionsSandboxHostRef.current
          : null;

    setSandboxMountTarget(host);

    return () => setSandboxMountTarget(null);
  }, [activeView, setSandboxMountTarget]);

  const handleViewChange = useCallback((view: SurveyOperationsView) => {
    setActiveView(view);
  }, []);

  useEffect(() => {
    const activeMission = missions.find(
      (mission) =>
        mission.id === runningMissionId &&
        mission.status === "IN PROGRESS" &&
        !mission.paused &&
        isRunning,
    );

    activeMissionIdRef.current = activeMission?.id ?? null;
  }, [missions, runningMissionId, isRunning]);

  useEffect(() => {
    if (!isRunning || !activeMissionIdRef.current) return;

    const interval = setInterval(() => {
      setMissions((currentMissions) =>
        currentMissions.map((mission) => {
          if (
            mission.id !== activeMissionIdRef.current ||
            mission.status !== "IN PROGRESS" ||
            mission.paused
          ) {
            return mission;
          }

          const nextProgress = Math.min(99, mission.progressPct + 2 + Math.random() * 4);
          const previousMilestone = waypointMilestonesRef.current.get(mission.id) ?? 0;
          const nextMilestone = Math.floor(nextProgress / 25) * 25;
          let events = mission.events;

          if (nextMilestone > previousMilestone && nextMilestone > 0 && nextMilestone < 100) {
            waypointMilestonesRef.current.set(mission.id, nextMilestone);
            events = [
              ...events,
              createMissionEvent(
                "Waypoint Reached",
                new Date(),
                `Progress checkpoint ${nextMilestone}%`,
              ),
            ];
          }

          return {
            ...mission,
            progressPct: nextProgress,
            events,
          };
        }),
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isRunning, runningMissionId]);

  useEffect(() => {
    if (!liveTelemetry || !activeMissionIdRef.current) return;
    if (liveTelemetry.batteryPct >= 30) return;

    const missionId = activeMissionIdRef.current;
    if (lowBatteryWarnedRef.current.has(missionId)) return;

    lowBatteryWarnedRef.current.add(missionId);
    setMissions((currentMissions) =>
      currentMissions.map((mission) => {
        if (mission.id !== missionId) return mission;

        return {
          ...mission,
          events: [
            ...mission.events,
            createMissionEvent(
              "Low Battery Warning",
              new Date(),
              `Battery at ${liveTelemetry.batteryPct.toFixed(0)}%`,
            ),
          ],
        };
      }),
    );
  }, [liveTelemetry]);

  return (
    <SurveyOperationsShell
      activeView={activeView}
      onViewChange={(view) => {
        if (isSurveyOperationsView(view)) {
          handleViewChange(view);
        }
      }}
      basePath={basePath}
    >
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
          {activeView === "dashboard" && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div ref={dashboardSandboxHostRef} className="space-y-6" />
              <div className="space-y-6">
                <FleetPanel
                  liveTelemetry={liveTelemetry}
                  isRunning={isRunning}
                  onOpenAssets={() => handleViewChange("assets")}
                />
                <RecentMissionsPanel />
              </div>
            </div>
          )}

          {activeView === "missions" && (
            <>
              <MissionManagementWorkspace
                missions={missions}
                selectedMissionId={selectedMissionId}
                onSelectMission={setSelectedMissionId}
                onMissionsChange={setMissions}
                sandboxRef={sandboxRef}
                onRunningMissionChange={setRunningMissionId}
              />
              <div ref={missionsSandboxHostRef} className="space-y-6" />
            </>
          )}

          {activeView === "assets" && (
            <AssetManagementWorkspace
              assets={assets}
              categories={assetCategories}
              locations={assetLocations}
              clients={clients}
              users={users}
              selectedAssetId={selectedAssetId}
              onSelectAsset={setSelectedAssetId}
              onAssetsChange={setAssets}
              onCategoriesChange={setAssetCategories}
              onLocationsChange={setAssetLocations}
            />
          )}

          {activeView === "clients" && (
            <ClientManagementWorkspace onClientsChange={setClients} />
          )}

          {activeView === "sites" && (
            <SurveyOperationsPlaceholder
              title="Sites"
              description="Registered survey sites and geofences will be managed from this view."
            />
          )}

          {activeView === "fleet" && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <AssetManagementWorkspace
                assets={assets}
                categories={assetCategories}
                locations={assetLocations}
                clients={clients}
                users={users}
                selectedAssetId={selectedAssetId}
                onSelectAsset={setSelectedAssetId}
                onAssetsChange={setAssets}
                onCategoriesChange={setAssetCategories}
                onLocationsChange={setAssetLocations}
              />
              <FleetPanel
                liveTelemetry={liveTelemetry}
                isRunning={isRunning}
                onOpenAssets={() => handleViewChange("assets")}
              />
            </div>
          )}

          {activeView === "flight-logs" && (
            <SurveyOperationsPlaceholder
              title="Flight Logs"
              description="Historical flight logs and export tools will be connected here."
            />
          )}
        </div>
      </div>

    </SurveyOperationsShell>
  );
}

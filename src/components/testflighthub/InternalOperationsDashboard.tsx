"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  createInitialRepresentatives,
  type Representative,
} from "@/lib/representatives-data";
import {
  INTERNAL_OPERATIONS_BASE_PATH,
  isInternalOperationsView,
  normalizeInternalOperationsView,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import type { SurveyOperationsBasePath } from "@/lib/survey-operations-mock-data";
import { InternalOperationsBasePathProvider } from "./InternalOperationsBasePathContext";
import AssetManagementWorkspace from "./AssetManagementWorkspace";
import ClientManagementWorkspace from "./ClientManagementWorkspace";
import CalendarWorkspace from "./CalendarWorkspace";
import CompetitorsWorkspace from "./CompetitorsWorkspace";
import CrmWorkspace from "./CrmWorkspace";
import ConnectionsWorkspace from "./ConnectionsWorkspace";
import FileRepositoryWorkspace from "./FileRepositoryWorkspace";
import ClientFilesExplorerWorkspace from "./ClientFilesExplorerWorkspace";
import CreditorsWorkspace from "./CreditorsWorkspace";
import DebtorsWorkspace from "./DebtorsWorkspace";
import ExpensesWorkspace from "./ExpensesWorkspace";
import FinancialsWorkspace from "./FinancialsWorkspace";
import GrantsWorkspace from "./GrantsWorkspace";
import HrWorkspace from "./HrWorkspace";
import FleetWorkspace from "./FleetWorkspace";
import InfoEmailWorkspace from "./InfoEmailWorkspace";
import InternalDashboardHome from "./InternalDashboardHome";
import InternalDesignMockups from "./InternalDesignMockups";
import SectorWorkspace from "./SectorWorkspace";
import TrainingWorkspace from "./TrainingWorkspace";
import ProjectsWorkspace from "./ProjectsWorkspace";
import LogisticsWorkspace from "./LogisticsWorkspace";
import OfficeLocationsWorkspace from "./OfficeLocationsWorkspace";
import MediaExampleWorkspace from "./MediaExampleWorkspace";
import MessagingWorkspace from "./MessagingWorkspace";
import SocialWorkspace from "./SocialWorkspace";
import SettingsWorkspace from "./SettingsWorkspace";
import RecentMissionsPanel from "./RecentMissionsPanel";
import RepresentativesWorkspace from "./RepresentativesWorkspace";
import StrategyWorkspace from "./StrategyWorkspace";
import WhiteboardWorkspace from "./WhiteboardWorkspace";
import SurveyOperationsShell from "./SurveyOperationsShell";
import TestingWeatherPanel from "./TestingWeatherPanel";
import SupportWorkspace from "./SupportWorkspace";
import ExternalUsersWorkspace from "./ExternalUsersWorkspace";
import UserManagementWorkspace from "./UserManagementWorkspace";
import WebODMWorkspace from "./WebODMWorkspace";
import TelemetryDashboard from "@/components/telemetry/TelemetryDashboard";
import { createInitialUsers, type ManagedUser } from "@/lib/user-management-data";
import { useInfoEmailWhatsAppPoller } from "@/hooks/useInfoEmailWhatsAppPoller";
import { useSurveyOperationsSimulator } from "./SurveyOperationsSimulatorProvider";

function readInitialView(searchParams: ReturnType<typeof useSearchParams>): InternalOperationsView {
  return normalizeInternalOperationsView(searchParams.get("view"));
}

export default function InternalOperationsDashboard({
  basePath = INTERNAL_OPERATIONS_BASE_PATH,
}: {
  basePath?: SurveyOperationsBasePath;
}) {
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<InternalOperationsView>(() =>
    readInitialView(searchParams),
  );
  const { liveTelemetry, isRunning, setSandboxMountTarget, setExcludedProfileIds } =
    useSurveyOperationsSimulator();
  const [assetRegistry] = useState(() => createInitialAssetRegistry());
  const [assets, setAssets] = useState<ManagedAsset[]>(() => assetRegistry.assets);
  const [assetCategories, setAssetCategories] = useState<string[]>(() => assetRegistry.categories);
  const [assetLocations, setAssetLocations] = useState<string[]>(() => assetRegistry.locations);
  const [clients, setClients] = useState<ManagedClient[]>(() => createInitialClients());
  const [representatives, setRepresentatives] = useState<Representative[]>(() =>
    createInitialRepresentatives(),
  );
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState("rep-1");
  const [selectedAssetId, setSelectedAssetId] = useState("asset-1");
  const [users, setUsers] = useState<ManagedUser[]>(() => createInitialUsers());
  const testingSandboxHostRef = useRef<HTMLDivElement>(null);

  useInfoEmailWhatsAppPoller(true);

  useEffect(() => {
    void fetch("/api/users", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { users?: ManagedUser[] };
        if (data.users?.length) setUsers(data.users);
      })
      .catch(() => {
        // keep local fallback until Supabase migration is applied
      });
  }, []);

  useEffect(() => {
    void fetch("/api/clients", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { clients?: ManagedClient[] };
        if (data.clients?.length) setClients(data.clients);
      })
      .catch(() => {
        // keep local fallback until Supabase migration is applied
      });
  }, []);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    const normalized = normalizeInternalOperationsView(viewParam);
    if (viewParam && normalized !== viewParam) {
      setActiveView(normalized);
      return;
    }
    if (isInternalOperationsView(viewParam)) {
      setActiveView(viewParam);
    } else if (!viewParam) {
      setActiveView("home");
    }
  }, [searchParams]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeView === "home") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", activeView);
    }
    window.history.replaceState({}, "", url.toString());
  }, [activeView]);

  useLayoutEffect(() => {
    const host = activeView === "testing" ? testingSandboxHostRef.current : null;
    setSandboxMountTarget(host);

    return () => setSandboxMountTarget(null);
  }, [activeView, setSandboxMountTarget]);

  useEffect(() => {
    if (activeView === "testing") {
      setExcludedProfileIds(["france", "austin"]);
      return;
    }

    setExcludedProfileIds([]);
  }, [activeView, setExcludedProfileIds]);

  const handleViewChange = useCallback((view: InternalOperationsView) => {
    setActiveView(view);
  }, []);

  return (
    <InternalOperationsBasePathProvider basePath={basePath}>
      <SurveyOperationsShell
        mode="internal"
        activeView={activeView}
        onViewChange={(view) => {
          if (isInternalOperationsView(view)) {
            handleViewChange(view);
          }
        }}
        basePath={basePath}
      >
      <div
        className={
          activeView === "home"
            ? "relative mx-auto w-full min-w-0 px-1 py-1 sm:px-2 md:px-4 lg:px-6 lg:py-3 xl:max-w-[100rem]"
            : "relative mx-auto w-full min-w-0 max-w-7xl px-1 py-2 sm:px-2 md:px-4 lg:px-6 lg:py-4 xl:max-w-[90rem]"
        }
      >
        <div className={activeView === "home" ? "relative min-w-0" : "relative min-w-0 space-y-4 sm:space-y-6"}>
          {activeView === "home" && <InternalDashboardHome />}

          {activeView === "design-mockups" && (
            <InternalDesignMockups onBack={() => handleViewChange("home")} />
          )}

          {activeView === "clients" && (
            <ClientManagementWorkspace onClientsChange={setClients} />
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

          {activeView === "fleet" && (
            <FleetWorkspace
              liveTelemetry={liveTelemetry}
              isRunning={isRunning}
              onOpenAssets={() => handleViewChange("assets")}
              users={users}
            />
          )}

          {activeView === "testing" && (
            <div className="space-y-6">
              <div ref={testingSandboxHostRef} />
              <TestingWeatherPanel liveTelemetry={liveTelemetry} />
            </div>
          )}

          {activeView === "projects" && <ProjectsWorkspace clients={clients} />}

          {activeView === "grants" && <GrantsWorkspace />}

          {activeView === "recent-missions" && <RecentMissionsPanel />}

          {activeView === "webodm" && <WebODMWorkspace />}

          {activeView === "crm" && (
            <CrmWorkspace onOpenConnections={() => handleViewChange("connections")} />
          )}

          {activeView === "connections" && (
            <ConnectionsWorkspace onBackToCrm={() => handleViewChange("crm")} />
          )}

          {activeView === "representatives" && (
            <RepresentativesWorkspace
              representatives={representatives}
              selectedRepresentativeId={selectedRepresentativeId}
              onSelectRepresentative={setSelectedRepresentativeId}
              onRepresentativesChange={setRepresentatives}
            />
          )}

          {activeView === "office-locations" && <OfficeLocationsWorkspace />}

          {activeView === "financials" && <FinancialsWorkspace />}

          {activeView === "debtors" && <DebtorsWorkspace />}

          {activeView === "creditors" && <CreditorsWorkspace />}

          {activeView === "expenses" && <ExpensesWorkspace />}

          {activeView === "hr" && <HrWorkspace />}

          {activeView === "strategy" && <StrategyWorkspace />}

          {activeView === "whiteboard" && <WhiteboardWorkspace />}

          {activeView === "competitors" && <CompetitorsWorkspace />}

          {activeView === "sector" && <SectorWorkspace />}

          {activeView === "training" && <TrainingWorkspace />}

          {activeView === "messaging" && <MessagingWorkspace />}

          {activeView === "social" && <SocialWorkspace />}

          {activeView === "settings" && <SettingsWorkspace />}

          {activeView === "calendar" && (
            <CalendarWorkspace users={users} clients={clients} />
          )}

          {activeView === "logistics" && <LogisticsWorkspace />}

          {activeView === "info-email" && <InfoEmailWorkspace />}

          {activeView === "files-internal" && (
            <FileRepositoryWorkspace
              scope="internal"
              initialFolderId={searchParams.get("folderId")}
            />
          )}

          {activeView === "files-external" && <FileRepositoryWorkspace scope="external" />}

          {activeView === "files-client" && <ClientFilesExplorerWorkspace />}

          {activeView === "files" && (
            <FileRepositoryWorkspace
              scope="internal"
              initialFolderId={searchParams.get("folderId")}
            />
          )}

          {activeView === "support" && <SupportWorkspace />}

          {activeView === "users" && <UserManagementWorkspace onUsersChange={setUsers} />}

          {activeView === "users-external" && <ExternalUsersWorkspace />}

          {activeView === "telemetry" && <TelemetryDashboard />}

          {activeView === "media-example" && <MediaExampleWorkspace />}
        </div>
      </div>
      </SurveyOperationsShell>
    </InternalOperationsBasePathProvider>
  );
}

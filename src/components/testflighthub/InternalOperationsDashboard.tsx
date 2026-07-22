"use client";

import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";

import {
  createInitialAssetRegistry,
  type ManagedAsset,
} from "@/lib/asset-management-data";
import {
  type ManagedClient,
} from "@/lib/client-management-data";
import {
  createInitialRepresentatives,
  type Representative,
} from "@/lib/representatives-data";
import { isDemoDomainHost, isInternalDomainHost } from "@/lib/app-domains";
import { EXECUTIVE_ASSISTANT_VISIBLE } from "@/lib/product-surface-flags";
import {
  INTERNAL_OPERATIONS_BASE_PATH,
  getNavImplementationNotice,
  internalViewTitles,
  isCorporateInformationTab,
  isInternalOperationsView,
  legacyCorporateViewToTab,
  normalizeInternalOperationsView,
  resolveInternalOperationsBasePath,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import {
  DEFAULT_POTENTIAL_CLIENTS_COUNTRY_ID,
  isPotentialClientsCountryId,
} from "@/lib/potential-clients-data";
import type { SurveyOperationsBasePath } from "@/lib/survey-operations-mock-data";
import { InternalOperationsBasePathProvider } from "./InternalOperationsBasePathContext";
import SurveyOperationsShell from "./SurveyOperationsShell";
import WorkspaceLoadingFallback from "./WorkspaceLoadingFallback";
import WorkspacePane from "./WorkspacePane";
import WorkspaceErrorBoundary from "./WorkspaceErrorBoundary";
import AdminPerformanceMode from "./AdminPerformanceMode";
import InventoryManagementWorkspace from "./InventoryManagementWorkspace";
import {
  prefetchNeighborsForView,
  prefetchViewOnIntent,
  WORKSPACE_CHUNK_LOADERS,
} from "@/lib/workspace-prefetch";
import { markWorkspaceView } from "@/lib/platform-performance";

const InternalDashboardHome = dynamic(() => import("./InternalDashboardHome"), {
  loading: () => <WorkspaceLoadingFallback label="Loading home" />,
  ssr: false,
});
import {
  AccountsPayableWorkspace,
  AccountsReceivableWorkspace,
  AssetManagementWorkspace,
  BillingWorkspace,
  BoardPackCustomizerWorkspace,
  CalendarWorkspace,
  CapaWorkspace,
  CapTableWorkspace,
  ClientFilesExplorerWorkspace,
  ClientManagementWorkspace,
  ClientOnboardingWorkspace,
  ClientsDashboardWorkspace,
  CompetitorsWorkspace,
  ConnectionsWorkspace,
  CorporateDashboardWorkspace,
  CorporateInformationWorkspace,
  CrmQuestionsTestWorkspace,
  CrmWorkspace,
  DocumentControlWorkspace,
  EngineeringCapacityWorkspace,
  EngineeringDashboardWorkspace,
  EngineeringResourcesWorkspace,
  ExecutiveAssistantWorkspace,
  ExpensesWorkspace,
  ExternalClientAccessWorkspace,
  ExternalUsersWorkspace,
  FileRepositoryWorkspace,
  FinancialReportsWorkspace,
  FinancialsWorkspace,
  FleetWorkspace,
  GeneralLedgerWorkspace,
  GrantsWorkspace,
  HrReportsWorkspace,
  HrWorkspace,
  InfoEmailWorkspace,
  InternalAuditsWorkspace,
  InternalDesignMockups,
  LeaveManagementWorkspace,
  LogisticsWorkspace,
  ManagementReviewWorkspace,
  MediaExampleWorkspace,
  MeetingsWorkspace,
  MessagingWorkspace,
  ModuleGoLiveWorkspace,
  PerformanceHubWorkspace,
  PayrollWorkspace,
  PlatformBillingWorkspace,
  PotentialClientsWorkspace,
  ProfileWorkspace,
  ProjectsWorkspace,
  QmsTrainingWorkspace,
  QualityManagementWorkspace,
  RecentMissionsPanel,
  RecruitmentWorkspace,
  RepresentativesWorkspace,
  SectorWorkspace,
  SettingsWorkspace,
  SocialWorkspace,
  StaffTrainingWorkspace,
  StrategyWorkspace,
  SupportWorkspace,
  TelemetryDashboard,
  TestingWeatherPanel,
  TrainingDashboardWorkspace,
  TqmsReportsWorkspace,
  Unit311DetailsWorkspace,
  UserManagementWorkspace,
  WebODMWorkspace,
  WebsiteManagementWorkspace,
  WhiteboardWorkspace,
  WiseWorkspace,
} from "./lazy-workspaces";
import { type ManagedUser } from "@/lib/user-management-data";
import { useInfoEmailWhatsAppPoller } from "@/hooks/useInfoEmailWhatsAppPoller";
import {
  fetchCachedJson,
  PLATFORM_CACHE_KEYS,
} from "@/lib/platform-fetch-cache";
import { useSurveyOperationsSimulator } from "./SurveyOperationsSimulatorProvider";

const VIEWS_NEEDING_SIMULATOR = new Set<InternalOperationsView>([
  "fleet",
  "testing",
  "telemetry",
]);

function NavImplementationNotice({ view }: { view: InternalOperationsView }) {
  const notice = getNavImplementationNotice(view);
  if (!notice) return null;
  const meta = internalViewTitles[view];
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
    >
      <span className="font-semibold text-amber-50">Uses current implementation</span>
      <span className="text-amber-100/70">
        {" "}
        — {meta.title} opens the existing module until this navigation area is redesigned.
      </span>
    </div>
  );
}

function isClientOnboardingPath(pathname: string) {
  return (
    pathname.endsWith("/client-onboarding") ||
    pathname.endsWith("/internaldashboard/client-onboarding")
  );
}

function isExecutiveAssistantPath(pathname: string) {
  return (
    pathname.endsWith("/executive-assistant") ||
    pathname.endsWith("/internaldashboard/executive-assistant")
  );
}

function isCapTablePath(pathname: string) {
  return (
    pathname.endsWith("/corporate-information/cap-table") ||
    pathname.includes("/corporate-information/cap-table")
  );
}

function isLegacyModuleHardPath(pathname: string) {
  return (
    isClientOnboardingPath(pathname) ||
    isExecutiveAssistantPath(pathname) ||
    isCapTablePath(pathname)
  );
}

function readInitialView(
  searchParams: ReturnType<typeof useSearchParams>,
  pathname: string,
  initialView?: InternalOperationsView,
): InternalOperationsView {
  if (initialView) {
    return initialView;
  }

  // Legacy hard paths still resolve during migration; URL sync rewrites to ?view=.
  if (isClientOnboardingPath(pathname)) {
    return "client-onboarding";
  }

  if (isCapTablePath(pathname)) {
    return "corporate-cap-table";
  }

  if (isExecutiveAssistantPath(pathname)) {
    return EXECUTIVE_ASSISTANT_VISIBLE ? "executive-assistant" : "home";
  }

  const fromQuery = normalizeInternalOperationsView(searchParams.get("view"));
  if (fromQuery === "executive-assistant" && !EXECUTIVE_ASSISTANT_VISIBLE) {
    return "home";
  }
  return fromQuery;
}

export default function InternalOperationsDashboard({
  basePath: basePathProp,
  initialView,
}: {
  basePath?: SurveyOperationsBasePath;
  initialView?: InternalOperationsView;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "";
  const [resolvedBasePath, setResolvedBasePath] = useState<SurveyOperationsBasePath>(() => {
    if (basePathProp) return basePathProp;
    if (typeof window !== "undefined") {
      return resolveInternalOperationsBasePath(window.location.hostname);
    }
    // Prefer canonical `/` during SSR when host is unknown — never default to the
    // legacy App Router folder or history.replaceState will expose /internaldashboard.
    return "/";
  });
  const basePath = resolvedBasePath;

  useEffect(() => {
    if (basePathProp) {
      setResolvedBasePath(basePathProp);
      return;
    }
    setResolvedBasePath(resolveInternalOperationsBasePath(window.location.hostname));
  }, [basePathProp]);

  const [isInternalHost] = useState(() => {
    // Customer workspace hosts use /dashboard; Internal ops use / (canonical).
    if (resolvedBasePath === "/dashboard") return false;
    if (typeof window !== "undefined" && isInternalDomainHost(window.location.hostname)) {
      return true;
    }
    return resolvedBasePath === "/" || resolvedBasePath === INTERNAL_OPERATIONS_BASE_PATH;
  });
  const [activeView, setActiveView] = useState<InternalOperationsView>(() =>
    readInitialView(searchParams, pathname, initialView),
  );
  const [warmViews, setWarmViews] = useState<InternalOperationsView[]>(() => [
    readInitialView(searchParams, pathname, initialView),
  ]);
  const warmSet = useMemo(() => new Set(warmViews), [warmViews]);
  const isWarm = useCallback((view: InternalOperationsView) => warmSet.has(view), [warmSet]);
  const {
    liveTelemetry,
    isRunning,
    setSandboxMountTarget,
    setExcludedProfileIds,
    setSimulatorEnabled,
  } = useSurveyOperationsSimulator();
  const [assetRegistry] = useState(() => createInitialAssetRegistry());
  const [assets, setAssets] = useState<ManagedAsset[]>([]);
  const [assetCategories, setAssetCategories] = useState<string[]>([]);
  const [assetLocations, setAssetLocations] = useState<string[]>([]);
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState("rep-1");
  const [selectedAssetId, setSelectedAssetId] = useState("asset-1");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const testingSandboxHostRef = useRef<HTMLDivElement>(null);
  const mockSeededRef = useRef(false);
  const clientsLoadedRef = useRef(false);
  const usersLoadedRef = useRef(false);

  useInfoEmailWhatsAppPoller(true);

  // Seed mock registries only when a module that needs them is first opened.
  useEffect(() => {
    const needsAssets =
      activeView === "assets" ||
      activeView === "inventory-management" ||
      activeView === "fleet";
    const needsReps = activeView === "representatives";
    if (!needsAssets && !needsReps) return;
    if (mockSeededRef.current && assets.length > 0 && representatives.length > 0) return;

    if (needsAssets && assets.length === 0) {
      setAssets(assetRegistry.assets);
      setAssetCategories(assetRegistry.categories);
      setAssetLocations(assetRegistry.locations);
      mockSeededRef.current = true;
    }
    if (needsReps && representatives.length === 0) {
      setRepresentatives(createInitialRepresentatives());
    }
  }, [activeView, assetRegistry, assets.length, representatives.length]);

  useEffect(() => {
    const needsUsers =
      activeView === "assets" ||
      activeView === "fleet" ||
      activeView === "calendar" ||
      activeView === "users" ||
      activeView === "users-external";
    if (!needsUsers || usersLoadedRef.current) return;
    usersLoadedRef.current = true;

    void fetchCachedJson<{ users?: ManagedUser[] }>(PLATFORM_CACHE_KEYS.users, "/api/users", {
      ttlMs: 120_000,
    })
      .then((data) => {
        setUsers(data.users ?? []);
      })
      .catch(() => {
        // keep local fallback until Supabase migration is applied
      });
  }, [activeView]);

  useEffect(() => {
    const needsClients =
      activeView === "clients" ||
      activeView === "clients-dashboard" ||
      activeView === "assets" ||
      activeView === "projects" ||
      activeView === "projects-dashboard" ||
      activeView === "projects-internal" ||
      activeView === "projects-external" ||
      activeView === "calendar";
    if (!needsClients || clientsLoadedRef.current) return;
    clientsLoadedRef.current = true;

    void fetchCachedJson<{ clients?: ManagedClient[] }>(
      PLATFORM_CACHE_KEYS.clients,
      "/api/clients",
      { ttlMs: 120_000 },
    )
      .then((data) => {
        // Always replace — empty workspace must not keep mock/Unit311 seed clients.
        setClients(data.clients ?? []);
      })
      .catch(() => {
        setClients([]);
      });
  }, [activeView]);

  useEffect(() => {
    setSimulatorEnabled(VIEWS_NEEDING_SIMULATOR.has(activeView));
  }, [activeView, setSimulatorEnabled]);

  useEffect(() => {
    markWorkspaceView(activeView);
    setWarmViews((prev) => {
      const next = [activeView, ...prev.filter((view) => view !== activeView)];
      return next.slice(0, 8);
    });
    prefetchNeighborsForView(activeView);
  }, [activeView]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      for (const view of ["crm", "messaging", "projects", "calendar", "financials", "clients"] as InternalOperationsView[]) {
        const loader = WORKSPACE_CHUNK_LOADERS[view];
        if (loader) void loader();
      }
    };
    const ric = window.requestIdleCallback?.(run, { timeout: 4000 });
    const timer = ric == null ? window.setTimeout(run, 1800) : null;
    return () => {
      cancelled = true;
      if (ric != null) window.cancelIdleCallback?.(ric);
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    const legacyTab = legacyCorporateViewToTab(viewParam);
    if (legacyTab) {
      const url = new URL(window.location.href);
      url.searchParams.set("view", "corporate-information");
      url.searchParams.set("tab", legacyTab);
      window.history.replaceState({}, "", url.toString());
      startTransition(() => setActiveView("corporate-information"));
      return;
    }

    const nextView = readInitialView(searchParams, pathname, initialView);
    startTransition(() => {
      if (viewParam && normalizeInternalOperationsView(viewParam) !== viewParam) {
        setActiveView(nextView);
        return;
      }
      if (isInternalOperationsView(viewParam)) {
        setActiveView(viewParam);
        return;
      }
      if (isClientOnboardingPath(pathname)) {
        setActiveView("client-onboarding");
        return;
      }
      if (isExecutiveAssistantPath(pathname)) {
        setActiveView("executive-assistant");
        return;
      }
      if (isCapTablePath(pathname)) {
        setActiveView("corporate-cap-table");
        return;
      }
      if (!viewParam) {
        setActiveView(initialView ?? "home");
      }
    });
  }, [initialView, pathname, searchParams]);

  useEffect(() => {
    if (activeView !== "potential-clients") return;
    const country = searchParams.get("country");
    if (isPotentialClientsCountryId(country)) return;

    const url = new URL(window.location.href);
    url.searchParams.set("view", "potential-clients");
    url.searchParams.set("country", DEFAULT_POTENTIAL_CLIENTS_COUNTRY_ID);
    window.history.replaceState({}, "", url.toString());
  }, [activeView, searchParams]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const host = window.location.hostname;
    const onOpsHost = isInternalDomainHost(host) || isDemoDomainHost(host);
    // Never expose the App Router implementation path on Internal/Demo hosts.
    const publicBasePath =
      onOpsHost && basePath === INTERNAL_OPERATIONS_BASE_PATH ? "/" : basePath;

    // Collapse former hard-path module URLs onto the single ?view= model.
    if (isLegacyModuleHardPath(url.pathname)) {
      url.pathname = publicBasePath === "/" ? "/" : publicBasePath;
    }

    if (activeView === "home") {
      url.searchParams.delete("view");
      url.searchParams.delete("country");
      url.searchParams.delete("tab");
    } else if (activeView === "corporate-information") {
      url.searchParams.set("view", "corporate-information");
      if (!isCorporateInformationTab(url.searchParams.get("tab"))) {
        url.searchParams.set("tab", "company-details");
      }
      url.searchParams.delete("country");
    } else {
      url.searchParams.set("view", activeView);
      url.searchParams.delete("tab");
      if (activeView !== "potential-clients") {
        url.searchParams.delete("country");
      } else if (!isPotentialClientsCountryId(url.searchParams.get("country"))) {
        url.searchParams.set("country", DEFAULT_POTENTIAL_CLIENTS_COUNTRY_ID);
      }
    }
    window.history.replaceState({}, "", url.toString());
  }, [activeView, basePath]);

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

  const [logisticsEntryId, setLogisticsEntryId] = useState(0);
  const previousViewRef = useRef<InternalOperationsView | null>(null);

  useEffect(() => {
    const previous = previousViewRef.current;
    previousViewRef.current = activeView;
    // Remount only when entering Logistics from another view (or first navigation to it).
    if (activeView === "logistics" && previous !== "logistics") {
      setLogisticsEntryId((current) => current + 1);
    }
  }, [activeView]);

  const handleViewChange = useCallback((view: InternalOperationsView) => {
    prefetchViewOnIntent(view);
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
          activeView === "home" || activeView === "settings" || activeView === "billing"
            ? activeView === "home"
              ? "relative mx-auto flex h-full min-h-0 w-full min-w-0 flex-1 flex-col px-0 py-0 sm:px-0.5 md:px-1 lg:px-2 xl:max-w-[100rem]"
              : "relative mx-auto w-full min-w-0 px-1 py-1 sm:px-2 md:px-3 lg:px-4 lg:py-2 xl:max-w-[100rem]"
            : "relative mx-auto w-full min-w-0 max-w-7xl px-1 py-2 sm:px-2 md:px-3 lg:px-5 lg:py-3 xl:max-w-[90rem] xl:px-6 xl:py-4"
        }
      >
        <div
          className={
            activeView === "home"
              ? "relative flex h-full min-h-0 min-w-0 flex-1 flex-col"
              : "relative min-w-0 space-y-4 sm:space-y-6"
          }
        >
          {activeView !== "home" && <NavImplementationNotice view={activeView} />}
          {isWarm("home") && (
            <WorkspacePane
              view="home"
              activeView={activeView}
              keepMounted={isWarm("home")}
              className={
                activeView === "home"
                  ? "flex h-full min-h-0 flex-1 flex-col"
                  : undefined
              }
            >
              <InternalDashboardHome showCustomize />
            </WorkspacePane>
          )}

          {EXECUTIVE_ASSISTANT_VISIBLE && activeView === "executive-assistant" && (
            <ExecutiveAssistantWorkspace />
          )}
          {activeView === "quality-management" && <QualityManagementWorkspace />}
          {activeView === "qms-training" && <QmsTrainingWorkspace />}
          {activeView === "qms-document-control" && <DocumentControlWorkspace />}
          {activeView === "qms-capa" && <CapaWorkspace />}
          {activeView === "qms-internal-audits" && <InternalAuditsWorkspace />}
          {activeView === "qms-management-review" && <ManagementReviewWorkspace />}
          {activeView === "qms-reports" && <TqmsReportsWorkspace />}
          {activeView === "profile" && <ProfileWorkspace />}

          {activeView === "design-mockups" && (
            <InternalDesignMockups onBack={() => handleViewChange("home")} />
          )}

          {isWarm("clients") && (
            <WorkspacePane view="clients" activeView={activeView} keepMounted={isWarm("clients")}>
              <ClientManagementWorkspace onClientsChange={setClients} />
            </WorkspacePane>
          )}

          {isWarm("clients-dashboard") && (
            <WorkspacePane view="clients-dashboard" activeView={activeView} keepMounted={isWarm("clients-dashboard")}>
              <ClientsDashboardWorkspace onClientsChange={setClients} />
            </WorkspacePane>
          )}

          {activeView === "client-onboarding" && <ClientOnboardingWorkspace />}

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

          {activeView === "inventory-management" && (
            <WorkspaceErrorBoundary title="Inventory">
              <InventoryManagementWorkspace />
            </WorkspaceErrorBoundary>
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

          {(isWarm("projects") ||
            isWarm("projects-dashboard") ||
            isWarm("projects-internal") ||
            isWarm("projects-external")) && (
            <div
              hidden={
                activeView !== "projects" &&
                activeView !== "projects-dashboard" &&
                activeView !== "projects-internal" &&
                activeView !== "projects-external"
              }
              className={
                activeView === "projects" ||
                activeView === "projects-dashboard" ||
                activeView === "projects-internal" ||
                activeView === "projects-external"
                  ? "min-w-0"
                  : "hidden"
              }
            >
              <ProjectsWorkspace clients={clients} />
            </div>
          )}

          {activeView === "grants" && <GrantsWorkspace />}

          {activeView === "recent-missions" && <RecentMissionsPanel />}

          {activeView === "webodm" && <WebODMWorkspace />}

          {isWarm("crm") && (
            <WorkspacePane view="crm" activeView={activeView} keepMounted={isWarm("crm")}>
              <CrmWorkspace onOpenConnections={() => handleViewChange("connections")} />
            </WorkspacePane>
          )}

          {isWarm("crm-meetings") && (
            <WorkspacePane view="crm-meetings" activeView={activeView} keepMounted={isWarm("crm-meetings")}>
              <MeetingsWorkspace />
            </WorkspacePane>
          )}

          {activeView === "crm-questions-test" && <CrmQuestionsTestWorkspace />}

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

          {isWarm("financials") && (
            <WorkspacePane view="financials" activeView={activeView} keepMounted={isWarm("financials")}>
              <FinancialsWorkspace />
            </WorkspacePane>
          )}

          {activeView === "general-ledger" && <GeneralLedgerWorkspace />}

          {activeView === "accounts-receivable" && <AccountsReceivableWorkspace />}

          {activeView === "accounts-payable" && <AccountsPayableWorkspace />}

          {activeView === "financial-reports" && <FinancialReportsWorkspace />}

          {activeView === "wise" && <WiseWorkspace />}

          {activeView === "board-pack" && <BoardPackCustomizerWorkspace />}

          {activeView === "expenses" && <ExpensesWorkspace />}

          {activeView === "hr" && <HrWorkspace mode="employees" />}

          {activeView === "hr-dashboard" && <HrWorkspace mode="dashboard" />}

          {activeView === "hr-recruitment" && <RecruitmentWorkspace />}

          {activeView === "hr-leave" && <LeaveManagementWorkspace />}

          {activeView === "hr-performance" && <PerformanceHubWorkspace />}

          {activeView === "hr-payroll" && <PayrollWorkspace />}

          {activeView === "hr-reports" && (
            <HrReportsWorkspace initialEmployeeId={searchParams.get("employeeId") ?? ""} />
          )}

          {activeView === "strategy" && <StrategyWorkspace />}

          {activeView === "potential-clients" && <PotentialClientsWorkspace />}

          {activeView === "whiteboard" && <WhiteboardWorkspace />}

          {activeView === "competitors" && (
            <WorkspaceErrorBoundary title="Competitors">
              <CompetitorsWorkspace />
            </WorkspaceErrorBoundary>
          )}

          {activeView === "sector" && <SectorWorkspace />}

          {activeView === "training" && <StaffTrainingWorkspace />}

          {activeView === "training-dashboard" && <TrainingDashboardWorkspace />}

          {activeView === "corporate-dashboard" && <CorporateDashboardWorkspace />}

          {activeView === "corporate-information" && <CorporateInformationWorkspace />}
          {activeView === "corporate-cap-table" && <CapTableWorkspace />}

          {activeView === "external-client-access" && <ExternalClientAccessWorkspace />}

          {isWarm("messaging") && (
            <WorkspacePane view="messaging" activeView={activeView} keepMounted={isWarm("messaging")}>
              <MessagingWorkspace />
            </WorkspacePane>
          )}

          {activeView === "social" && <SocialWorkspace />}

          {isWarm("settings") && (
            <WorkspacePane view="settings" activeView={activeView} keepMounted={isWarm("settings")}>
              <SettingsWorkspace />
            </WorkspacePane>
          )}

          {activeView === "billing" &&
            (isInternalHost ? <PlatformBillingWorkspace /> : <BillingWorkspace />)}

          {isWarm("calendar") && (
            <WorkspacePane view="calendar" activeView={activeView} keepMounted={isWarm("calendar")}>
              <CalendarWorkspace users={users} clients={clients} />
            </WorkspacePane>
          )}

          {activeView === "logistics" && (
            <LogisticsWorkspace key={`logistics-entry-${logisticsEntryId}`} />
          )}

          {isWarm("info-email") && (
            <WorkspacePane view="info-email" activeView={activeView} keepMounted={isWarm("info-email")}>
              <InfoEmailWorkspace />
            </WorkspacePane>
          )}

          {activeView === "files-internal" && (
            <FileRepositoryWorkspace
              scope="internal"
              initialFolderId={searchParams.get("folderId")}
            />
          )}

          {activeView === "unit311-details" && <Unit311DetailsWorkspace />}

          {activeView === "module-go-live" && <ModuleGoLiveWorkspace />}

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

          {activeView === "website-management" && <WebsiteManagementWorkspace />}

          {(activeView === "engineering" || activeView === "engineering-dashboard") && (
            <EngineeringDashboardWorkspace />
          )}

          {activeView === "engineering-resources" && <EngineeringResourcesWorkspace />}

          {activeView === "engineering-capacity" && <EngineeringCapacityWorkspace />}
        </div>
      </div>
      <AdminPerformanceMode activeView={activeView} />
      </SurveyOperationsShell>
    </InternalOperationsBasePathProvider>
  );
}

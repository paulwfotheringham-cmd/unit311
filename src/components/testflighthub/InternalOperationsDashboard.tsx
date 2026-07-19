"use client";

import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
import { isInternalDomainHost } from "@/lib/app-domains";
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
import AssetManagementWorkspace from "./AssetManagementWorkspace";
import BoardPackCustomizerWorkspace from "./BoardPackCustomizerWorkspace";
import ClientManagementWorkspace from "./ClientManagementWorkspace";
import ClientOnboardingWorkspace from "./ClientOnboardingWorkspace";
import CalendarWorkspace from "./CalendarWorkspace";
import CompetitorsWorkspace from "./CompetitorsWorkspace";
import CrmWorkspace from "./CrmWorkspace";
import CrmQuestionsTestWorkspace from "./CrmQuestionsTestWorkspace";
import MeetingsWorkspace from "./MeetingsWorkspace";
import ConnectionsWorkspace from "./ConnectionsWorkspace";
import FileRepositoryWorkspace from "./FileRepositoryWorkspace";
import Unit311DetailsWorkspace from "./Unit311DetailsWorkspace";
import CorporateInformationWorkspace from "./CorporateInformationWorkspace";
import ModuleGoLiveWorkspace from "./ModuleGoLiveWorkspace";
import ClientFilesExplorerWorkspace from "./ClientFilesExplorerWorkspace";
import AccountsPayableWorkspace from "./AccountsPayableWorkspace";
import AccountsReceivableWorkspace from "./AccountsReceivableWorkspace";
import ExpensesWorkspace from "./ExpensesWorkspace";
import FinancialReportsWorkspace from "./FinancialReportsWorkspace";
import FinancialsWorkspace from "./FinancialsWorkspace";
import GeneralLedgerWorkspace from "./GeneralLedgerWorkspace";
import GrantsWorkspace from "./GrantsWorkspace";
import HrWorkspace from "./HrWorkspace";
import FleetWorkspace from "./FleetWorkspace";
import InfoEmailWorkspace from "./InfoEmailWorkspace";
import InternalDashboardHome from "./InternalDashboardHome";
import HomeExecutiveAssistantPanel from "./HomeExecutiveAssistantPanel";
import ExecutiveAssistantWorkspace from "./ExecutiveAssistantWorkspace";
import ProfileWorkspace from "./ProfileWorkspace";
import QmsTrainingWorkspace from "./QmsTrainingWorkspace";
import QualityManagementWorkspace from "./QualityManagementWorkspace";
import InternalDesignMockups from "./InternalDesignMockups";
import SectorWorkspace from "./SectorWorkspace";
import TrainingWorkspace from "./TrainingWorkspace";
import ProjectsWorkspace from "./ProjectsWorkspace";
import LogisticsWorkspace from "./LogisticsWorkspace";
import MediaExampleWorkspace from "./MediaExampleWorkspace";
import MessagingWorkspace from "./MessagingWorkspace";
import SocialWorkspace from "./SocialWorkspace";
import SettingsWorkspace from "./SettingsWorkspace";
import BillingWorkspace from "./BillingWorkspace";
import PlatformBillingWorkspace from "./PlatformBillingWorkspace";
import RecentMissionsPanel from "./RecentMissionsPanel";
import RepresentativesWorkspace from "./RepresentativesWorkspace";
import StrategyWorkspace from "./StrategyWorkspace";
import PotentialClientsWorkspace from "./PotentialClientsWorkspace";
import WiseWorkspace from "./WiseWorkspace";
import WhiteboardWorkspace from "./WhiteboardWorkspace";
import SurveyOperationsShell from "./SurveyOperationsShell";
import TestingWeatherPanel from "./TestingWeatherPanel";
import SupportWorkspace from "./SupportWorkspace";
import ExternalUsersWorkspace from "./ExternalUsersWorkspace";
import UserManagementWorkspace from "./UserManagementWorkspace";
import EngineeringWorkspace from "./EngineeringWorkspace";
import WebsiteManagementWorkspace from "./WebsiteManagementWorkspace";
import WebODMWorkspace from "./WebODMWorkspace";
import ModulePlaceholderWorkspace from "./ModulePlaceholderWorkspace";
import TelemetryDashboard from "@/components/telemetry/TelemetryDashboard";
import { type ManagedUser } from "@/lib/user-management-data";
import { useInfoEmailWhatsAppPoller } from "@/hooks/useInfoEmailWhatsAppPoller";
import { useSurveyOperationsSimulator } from "./SurveyOperationsSimulatorProvider";

function PlaceholderForView({ view }: { view: InternalOperationsView }) {
  const meta = internalViewTitles[view];
  const descriptions: Partial<Record<InternalOperationsView, { description: string; bullets?: string[] }>> = {
    "hr-recruitment": {
      description:
        "Coming Soon — Recruitment pipeline for open roles, applicants, and hiring stages.",
    },
    "hr-leave": {
      description:
        "Coming Soon — Leave requests, balances, and approvals.",
    },
    "hr-performance": {
      description:
        "Coming Soon — Performance reviews, goals, and manager feedback.",
    },
    "training-dashboard": {
      description: "Coming Soon — Overview of staff and QMS training progress across the organisation.",
    },
    "corporate-dashboard": {
      description:
        "Coming Soon — Summary of company corporate records — locations, advisers, licences, and contracts.",
    },
    "external-client-access": {
      description:
        "Coming Soon — Configure secure external portals for selected clients — choose visible modules, invite users, and manage permissions.",
      bullets: [
        "Select one of our Clients",
        "Create an External Portal",
        "Select which modules are visible",
        "Invite External Users",
        "Configure permissions",
        "Generate secure external logins",
      ],
    },
  };
  const extra = descriptions[view];
  return (
    <ModulePlaceholderWorkspace
      title={meta.title}
      description={extra?.description ?? `Coming Soon — ${meta.title} is not yet implemented.`}
      bullets={extra?.bullets}
    />
  );
}

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

function readInitialView(
  searchParams: ReturnType<typeof useSearchParams>,
  pathname: string,
  initialView?: InternalOperationsView,
): InternalOperationsView {
  if (initialView) {
    return initialView;
  }

  if (isClientOnboardingPath(pathname)) {
    return "client-onboarding";
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
  const [resolvedBasePath] = useState<SurveyOperationsBasePath>(() => {
    if (basePathProp) return basePathProp;
    if (typeof window !== "undefined") {
      return resolveInternalOperationsBasePath(window.location.hostname);
    }
    return INTERNAL_OPERATIONS_BASE_PATH;
  });
  const basePath = resolvedBasePath;
  const [isInternalHost] = useState(() => {
    // Customer workspace hosts use /dashboard; Internal ops use / or /internaldashboard.
    if (resolvedBasePath === "/dashboard") return false;
    if (typeof window !== "undefined" && isInternalDomainHost(window.location.hostname)) {
      return true;
    }
    return resolvedBasePath === "/" || resolvedBasePath === INTERNAL_OPERATIONS_BASE_PATH;
  });
  const [activeView, setActiveView] = useState<InternalOperationsView>(() =>
    readInitialView(searchParams, pathname, initialView),
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
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const testingSandboxHostRef = useRef<HTMLDivElement>(null);

  useInfoEmailWhatsAppPoller(true);

  useEffect(() => {
    void fetch("/api/users", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { users?: ManagedUser[] };
        setUsers(data.users ?? []);
      })
      .catch(() => {
        // keep local fallback until Supabase migration is applied
      });
  }, []);

  useEffect(() => {
    void fetch("/api/clients", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          setClients([]);
          return;
        }
        const data = (await response.json()) as { clients?: ManagedClient[] };
        // Always replace — empty workspace must not keep mock/Unit311 seed clients.
        setClients(data.clients ?? []);
      })
      .catch(() => {
        setClients([]);
      });
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
    if (activeView === "client-onboarding") {
      if (isClientOnboardingPath(url.pathname)) {
        return;
      }
      url.pathname = basePath === "/" ? "/client-onboarding" : `${basePath}/client-onboarding`;
      url.searchParams.delete("view");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    if (activeView === "executive-assistant") {
      if (isExecutiveAssistantPath(url.pathname)) {
        return;
      }
      url.pathname =
        basePath === "/" ? "/executive-assistant" : `${basePath}/executive-assistant`;
      url.searchParams.delete("view");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    if (isClientOnboardingPath(url.pathname) || isExecutiveAssistantPath(url.pathname)) {
      url.pathname = basePath;
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
            ? "relative mx-auto w-full min-w-0 px-1 py-1 sm:px-2 md:px-4 lg:px-6 lg:py-3 xl:max-w-[100rem]"
            : "relative mx-auto w-full min-w-0 max-w-7xl px-1 py-2 sm:px-2 md:px-4 lg:px-6 lg:py-4 xl:max-w-[90rem]"
        }
      >
        <div className={activeView === "home" ? "relative min-w-0" : "relative min-w-0 space-y-4 sm:space-y-6"}>
          {activeView !== "home" && <NavImplementationNotice view={activeView} />}
          {activeView === "home" &&
            (isInternalHost ? (
              EXECUTIVE_ASSISTANT_VISIBLE ? (
                <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)] xl:items-start xl:gap-5">
                  <div className="min-w-0">
                    <InternalDashboardHome showCustomize />
                  </div>
                  <HomeExecutiveAssistantPanel />
                </div>
              ) : (
                <InternalDashboardHome showCustomize />
              )
            ) : (
              <InternalDashboardHome showCustomize />
            ))}

          {EXECUTIVE_ASSISTANT_VISIBLE && activeView === "executive-assistant" && (
            <ExecutiveAssistantWorkspace />
          )}
          {activeView === "quality-management" && <QualityManagementWorkspace />}
          {activeView === "qms-training" && <QmsTrainingWorkspace />}
          {activeView === "profile" && <ProfileWorkspace />}

          {activeView === "design-mockups" && (
            <InternalDesignMockups onBack={() => handleViewChange("home")} />
          )}

          {activeView === "clients" && (
            <ClientManagementWorkspace onClientsChange={setClients} mode="directory" />
          )}

          {activeView === "clients-dashboard" && (
            <ClientManagementWorkspace onClientsChange={setClients} mode="dashboard" />
          )}

          {activeView === "client-onboarding" && <ClientOnboardingWorkspace />}

          {(activeView === "assets" || activeView === "inventory-management") && (
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

          {(activeView === "projects" ||
            activeView === "projects-dashboard" ||
            activeView === "projects-internal" ||
            activeView === "projects-external") && (
            <ProjectsWorkspace clients={clients} />
          )}

          {activeView === "grants" && <GrantsWorkspace />}

          {activeView === "recent-missions" && <RecentMissionsPanel />}

          {activeView === "webodm" && <WebODMWorkspace />}

          {activeView === "crm" && (
            <CrmWorkspace onOpenConnections={() => handleViewChange("connections")} />
          )}

          {activeView === "crm-meetings" && <MeetingsWorkspace />}

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

          {activeView === "financials" && <FinancialsWorkspace />}

          {activeView === "general-ledger" && <GeneralLedgerWorkspace />}

          {activeView === "accounts-receivable" && <AccountsReceivableWorkspace />}

          {activeView === "accounts-payable" && <AccountsPayableWorkspace />}

          {activeView === "financial-reports" && <FinancialReportsWorkspace />}

          {activeView === "wise" && <WiseWorkspace />}

          {activeView === "board-pack" && <BoardPackCustomizerWorkspace />}

          {activeView === "expenses" && <ExpensesWorkspace />}

          {activeView === "hr" && <HrWorkspace mode="employees" />}

          {activeView === "hr-dashboard" && <HrWorkspace mode="dashboard" />}

          {activeView === "hr-recruitment" && <PlaceholderForView view="hr-recruitment" />}

          {activeView === "hr-leave" && <PlaceholderForView view="hr-leave" />}

          {activeView === "hr-performance" && <PlaceholderForView view="hr-performance" />}

          {activeView === "strategy" && <StrategyWorkspace />}

          {activeView === "potential-clients" && <PotentialClientsWorkspace />}

          {activeView === "whiteboard" && <WhiteboardWorkspace />}

          {activeView === "competitors" && <CompetitorsWorkspace />}

          {activeView === "sector" && <SectorWorkspace />}

          {activeView === "training" && <TrainingWorkspace />}

          {activeView === "training-dashboard" && <PlaceholderForView view="training-dashboard" />}

          {activeView === "corporate-dashboard" && <PlaceholderForView view="corporate-dashboard" />}

          {activeView === "corporate-information" && <CorporateInformationWorkspace />}

          {activeView === "external-client-access" && (
            <PlaceholderForView view="external-client-access" />
          )}

          {activeView === "messaging" && <MessagingWorkspace />}

          {activeView === "social" && <SocialWorkspace />}

          {activeView === "settings" && <SettingsWorkspace />}

          {activeView === "billing" &&
            (isInternalHost ? <PlatformBillingWorkspace /> : <BillingWorkspace />)}

          {activeView === "calendar" && (
            <CalendarWorkspace users={users} clients={clients} />
          )}

          {activeView === "logistics" && (
            <LogisticsWorkspace key={`logistics-entry-${logisticsEntryId}`} />
          )}

          {activeView === "info-email" && <InfoEmailWorkspace />}

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

          {(activeView === "engineering" ||
            activeView === "engineering-dashboard" ||
            activeView === "engineering-resources") && <EngineeringWorkspace />}
        </div>
      </div>
      </SurveyOperationsShell>
    </InternalOperationsBasePathProvider>
  );
}

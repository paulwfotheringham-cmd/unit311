"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
import {
  INTERNAL_OPERATIONS_BASE_PATH,
  isInternalOperationsView,
  internalViewTitles,
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
import OfficeLocationsWorkspace from "./OfficeLocationsWorkspace";
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
import SoftwareAssetRegisterWorkspace from "./SoftwareAssetRegisterWorkspace";
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
        "Recruitment pipeline for open roles, applicants, and hiring stages. Placeholder until the careers workflow is connected here.",
    },
    "hr-leave": {
      description:
        "Leave requests, balances, and approvals. Placeholder until leave booking is wired to HR records.",
    },
    "hr-performance": {
      description:
        "Performance reviews, goals, and manager feedback. Placeholder until the review cycle is implemented.",
    },
    "training-dashboard": {
      description:
        "Overview of staff and QMS training progress across the organisation.",
    },
    "corporate-dashboard": {
      description:
        "Summary of company corporate records — locations, advisers, insurance, licences, and contracts.",
    },
    "corporate-company-details": {
      description:
        "Legal entity details, registration numbers, and corporate profile. Placeholder for now.",
    },
    "corporate-bank-accounts": {
      description: "Company bank accounts and payment details used for operations.",
    },
    "corporate-advisers": {
      description: "Lawyers, accountants, and other professional advisers on retainer.",
    },
    "corporate-insurance": {
      description: "Insurance policies, renewals, and coverage notes.",
    },
    "corporate-software": {
      description: "Software subscriptions, licences, and vendor accounts.",
    },
    "corporate-contracts": {
      description: "Corporate contracts, MSAs, and key commercial agreements.",
    },
    "external-client-access": {
      description:
        "Configure secure external portals for selected clients — choose visible modules, invite users, and manage permissions.",
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
      description={extra?.description ?? `${meta.title} is coming soon.`}
      bullets={extra?.bullets}
    />
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
    return "executive-assistant";
  }

  return normalizeInternalOperationsView(searchParams.get("view"));
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
    const nextView = readInitialView(searchParams, pathname, initialView);
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
    } else {
      url.searchParams.set("view", activeView);
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
          {activeView === "home" &&
            (isInternalHost ? (
              <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)] xl:items-start xl:gap-5">
                <div className="min-w-0">
                  <InternalDashboardHome showCustomize />
                </div>
                <HomeExecutiveAssistantPanel />
              </div>
            ) : (
              <InternalDashboardHome showCustomize />
            ))}

          {activeView === "executive-assistant" && <ExecutiveAssistantWorkspace />}
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

          {activeView === "office-locations" && <OfficeLocationsWorkspace />}

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

          {activeView === "corporate-company-details" && (
            <PlaceholderForView view="corporate-company-details" />
          )}

          {activeView === "corporate-bank-accounts" && (
            <PlaceholderForView view="corporate-bank-accounts" />
          )}

          {activeView === "corporate-advisers" && <PlaceholderForView view="corporate-advisers" />}

          {activeView === "corporate-insurance" && <PlaceholderForView view="corporate-insurance" />}

          {activeView === "corporate-software" && <SoftwareAssetRegisterWorkspace />}

          {activeView === "corporate-contracts" && <PlaceholderForView view="corporate-contracts" />}

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

          {activeView === "logistics" && <LogisticsWorkspace />}

          {activeView === "info-email" && <InfoEmailWorkspace />}

          {activeView === "files-internal" && (
            <FileRepositoryWorkspace
              scope="internal"
              initialFolderId={searchParams.get("folderId")}
            />
          )}

          {activeView === "unit311-details" && <Unit311DetailsWorkspace />}

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

          {activeView === "engineering" && <EngineeringWorkspace />}
        </div>
      </div>
      </SurveyOperationsShell>
    </InternalOperationsBasePathProvider>
  );
}

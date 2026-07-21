"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

function WorkspaceChunkFallback() {
  return (
    <div
      className="flex min-h-[14rem] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin text-sky-300" aria-hidden />
      <p className="text-sm text-white/55">Loading workspace…</p>
    </div>
  );
}

function lazyWorkspace(
  // Workspace props vary widely; dynamic() erases the specific prop type at the boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: () => Promise<{ default: React.ComponentType<any> }>,
) {
  return dynamic(loader, {
    loading: () => <WorkspaceChunkFallback />,
    ssr: false,
  });
}

export const AssetManagementWorkspace = lazyWorkspace(() => import("./AssetManagementWorkspace"));
export const InventoryManagementWorkspace = lazyWorkspace(() => import("./InventoryManagementWorkspace"));
export const BoardPackCustomizerWorkspace = lazyWorkspace(() => import("./BoardPackCustomizerWorkspace"));
export const ClientManagementWorkspace = lazyWorkspace(() => import("./ClientManagementWorkspace"));
export const ClientsDashboardWorkspace = lazyWorkspace(() => import("./ClientsDashboardWorkspace"));
export const ClientOnboardingWorkspace = lazyWorkspace(() => import("./ClientOnboardingWorkspace"));
export const CalendarWorkspace = lazyWorkspace(() => import("./CalendarWorkspace"));
export const CompetitorsWorkspace = lazyWorkspace(() => import("./CompetitorsWorkspace"));
export const CrmWorkspace = lazyWorkspace(() => import("./CrmWorkspace"));
export const CrmQuestionsTestWorkspace = lazyWorkspace(() => import("./CrmQuestionsTestWorkspace"));
export const MeetingsWorkspace = lazyWorkspace(() => import("./MeetingsWorkspace"));
export const ConnectionsWorkspace = lazyWorkspace(() => import("./ConnectionsWorkspace"));
export const FileRepositoryWorkspace = lazyWorkspace(() => import("./FileRepositoryWorkspace"));
export const Unit311DetailsWorkspace = lazyWorkspace(() => import("./Unit311DetailsWorkspace"));
export const CorporateInformationWorkspace = lazyWorkspace(() => import("./CorporateInformationWorkspace"));
export const CorporateDashboardWorkspace = lazyWorkspace(() => import("./CorporateDashboardWorkspace"));
export const ModuleGoLiveWorkspace = lazyWorkspace(() => import("./ModuleGoLiveWorkspace"));
export const CapTableWorkspace = lazyWorkspace(() => import("./CapTableWorkspace"));
export const ClientFilesExplorerWorkspace = lazyWorkspace(() => import("./ClientFilesExplorerWorkspace"));
export const AccountsPayableWorkspace = lazyWorkspace(() => import("./AccountsPayableWorkspace"));
export const AccountsReceivableWorkspace = lazyWorkspace(() => import("./AccountsReceivableWorkspace"));
export const ExpensesWorkspace = lazyWorkspace(() => import("./ExpensesWorkspace"));
export const FinancialReportsWorkspace = lazyWorkspace(() => import("./FinancialReportsWorkspace"));
export const FinancialsWorkspace = lazyWorkspace(() => import("./FinancialsWorkspace"));
export const GeneralLedgerWorkspace = lazyWorkspace(() => import("./GeneralLedgerWorkspace"));
export const GrantsWorkspace = lazyWorkspace(() => import("./GrantsWorkspace"));
export const HrWorkspace = lazyWorkspace(() => import("./HrWorkspace"));
export const LeaveManagementWorkspace = lazyWorkspace(() => import("./LeaveManagementWorkspace"));
export const PerformanceHubWorkspace = lazyWorkspace(() => import("./PerformanceHubWorkspace"));
export const RecruitmentWorkspace = lazyWorkspace(() => import("./RecruitmentWorkspace"));
export const HrReportsWorkspace = lazyWorkspace(() => import("./HrReportsWorkspace"));
export const FleetWorkspace = lazyWorkspace(() => import("./FleetWorkspace"));
export const InfoEmailWorkspace = lazyWorkspace(() => import("./InfoEmailWorkspace"));
export const HomeExecutiveAssistantPanel = lazyWorkspace(() => import("./HomeExecutiveAssistantPanel"));
export const ExecutiveAssistantWorkspace = lazyWorkspace(() => import("./ExecutiveAssistantWorkspace"));
export const ProfileWorkspace = lazyWorkspace(() => import("./ProfileWorkspace"));
export const QmsTrainingWorkspace = lazyWorkspace(() => import("./QmsTrainingWorkspace"));
export const QualityManagementWorkspace = lazyWorkspace(() => import("./QualityManagementWorkspace"));
export const DocumentControlWorkspace = lazyWorkspace(() => import("./DocumentControlWorkspace"));
export const CapaWorkspace = lazyWorkspace(() => import("./CapaWorkspace"));
export const InternalAuditsWorkspace = lazyWorkspace(() => import("./InternalAuditsWorkspace"));
export const ManagementReviewWorkspace = lazyWorkspace(() => import("./ManagementReviewWorkspace"));
export const TqmsReportsWorkspace = lazyWorkspace(() => import("./TqmsReportsWorkspace"));
export const TrainingDashboardWorkspace = lazyWorkspace(() => import("./TrainingDashboardWorkspace"));
export const StaffTrainingWorkspace = lazyWorkspace(() => import("./StaffTrainingWorkspace"));
export const InternalDesignMockups = lazyWorkspace(() => import("./InternalDesignMockups"));
export const SectorWorkspace = lazyWorkspace(() => import("./SectorWorkspace"));
export const ProjectsWorkspace = lazyWorkspace(() => import("./ProjectsWorkspace"));
export const LogisticsWorkspace = lazyWorkspace(() => import("./LogisticsWorkspace"));
export const MediaExampleWorkspace = lazyWorkspace(() => import("./MediaExampleWorkspace"));
export const MessagingWorkspace = lazyWorkspace(() => import("./MessagingWorkspace"));
export const SocialWorkspace = lazyWorkspace(() => import("./SocialWorkspace"));
export const SettingsWorkspace = lazyWorkspace(() => import("./SettingsWorkspace"));
export const BillingWorkspace = lazyWorkspace(() => import("./BillingWorkspace"));
export const PlatformBillingWorkspace = lazyWorkspace(() => import("./PlatformBillingWorkspace"));
export const RecentMissionsPanel = lazyWorkspace(() => import("./RecentMissionsPanel"));
export const RepresentativesWorkspace = lazyWorkspace(() => import("./RepresentativesWorkspace"));
export const StrategyWorkspace = lazyWorkspace(() => import("./StrategyWorkspace"));
export const PotentialClientsWorkspace = lazyWorkspace(() => import("./PotentialClientsWorkspace"));
export const WiseWorkspace = lazyWorkspace(() => import("./WiseWorkspace"));
export const WhiteboardWorkspace = lazyWorkspace(() => import("./WhiteboardWorkspace"));
export const TestingWeatherPanel = lazyWorkspace(() => import("./TestingWeatherPanel"));
export const SupportWorkspace = lazyWorkspace(() => import("./SupportWorkspace"));
export const ExternalUsersWorkspace = lazyWorkspace(() => import("./ExternalUsersWorkspace"));
export const UserManagementWorkspace = lazyWorkspace(() => import("./UserManagementWorkspace"));
export const EngineeringDashboardWorkspace = lazyWorkspace(() => import("./EngineeringDashboardWorkspace"));
export const EngineeringResourcesWorkspace = lazyWorkspace(() => import("./EngineeringResourcesWorkspace"));
export const EngineeringCapacityWorkspace = lazyWorkspace(() => import("./EngineeringCapacityWorkspace"));
export const ExternalClientAccessWorkspace = lazyWorkspace(() => import("./ExternalClientAccessWorkspace"));
export const WebsiteManagementWorkspace = lazyWorkspace(() => import("./WebsiteManagementWorkspace"));
export const WebODMWorkspace = lazyWorkspace(() => import("./WebODMWorkspace"));

export const TelemetryDashboard = lazyWorkspace(() => import("@/components/telemetry/TelemetryDashboard"));

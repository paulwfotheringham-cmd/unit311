"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  AI_SUMMARY,
  IMAGES,
  KPI_METRICS,
  PLATFORM_STATS,
  PROGRESS_VS_PLAN_DATA,
  PROJECT_BRIEF,
  REPORTS,
  SCHEDULE_PERFORMANCE_DATA,
  SITE_MARKERS,
  UPCOMING_ACTIVITIES,
  ZONE_PROGRESS,
  EARTHWORKS_VOLUME_DATA,
  COMPLETION_TREND_DATA,
  project,
} from "@/lib/mock-data";
import {
  venturiAiSummary,
  venturiKpiMetrics,
  venturiPlatformStats,
  venturiProject,
  venturiProjectBrief,
  venturiReports,
  venturiSiteMarkers,
  venturiUpcomingActivities,
  venturiZoneProgress,
} from "@/lib/venturi-dashboard-data";

export type DashboardVariant = "default" | "venturi";

type SiteMarker = { id: number; label: string; x: string; y: string };

type DashboardData = {
  variant: DashboardVariant;
  project: typeof project & { breadcrumb?: string; avatarInitials?: string };
  projectBrief: typeof PROJECT_BRIEF;
  kpiMetrics: typeof KPI_METRICS;
  aiSummary: typeof AI_SUMMARY;
  zoneProgress: Array<{ zone: string; progress: number; variance: number }>;
  siteMarkers: readonly SiteMarker[];
  reports: typeof REPORTS;
  upcomingActivities: typeof UPCOMING_ACTIVITIES;
  platformStats: typeof PLATFORM_STATS;
  progressVsPlanData: typeof PROGRESS_VS_PLAN_DATA;
  schedulePerformanceData: typeof SCHEDULE_PERFORMANCE_DATA;
  completionTrendData: typeof COMPLETION_TREND_DATA;
  earthworksVolumeData: typeof EARTHWORKS_VOLUME_DATA;
  images: typeof IMAGES;
  footerBrand: string;
};

const defaultData: DashboardData = {
  variant: "default",
  project,
  projectBrief: PROJECT_BRIEF,
  kpiMetrics: KPI_METRICS,
  aiSummary: AI_SUMMARY,
  zoneProgress: ZONE_PROGRESS,
  siteMarkers: SITE_MARKERS,
  reports: REPORTS,
  upcomingActivities: UPCOMING_ACTIVITIES,
  platformStats: PLATFORM_STATS,
  progressVsPlanData: PROGRESS_VS_PLAN_DATA,
  schedulePerformanceData: SCHEDULE_PERFORMANCE_DATA,
  completionTrendData: COMPLETION_TREND_DATA,
  earthworksVolumeData: EARTHWORKS_VOLUME_DATA,
  images: IMAGES,
  footerBrand: "Unit311 Enterprise",
};

const venturiData: DashboardData = {
  variant: "venturi",
  project: venturiProject,
  projectBrief: venturiProjectBrief,
  kpiMetrics: venturiKpiMetrics,
  aiSummary: venturiAiSummary,
  zoneProgress: venturiZoneProgress,
  siteMarkers: venturiSiteMarkers,
  reports: venturiReports,
  upcomingActivities: venturiUpcomingActivities,
  platformStats: venturiPlatformStats,
  progressVsPlanData: PROGRESS_VS_PLAN_DATA,
  schedulePerformanceData: SCHEDULE_PERFORMANCE_DATA,
  completionTrendData: COMPLETION_TREND_DATA,
  earthworksVolumeData: EARTHWORKS_VOLUME_DATA,
  images: IMAGES,
  footerBrand: "Unit311",
};

const DashboardDataContext = createContext<DashboardData>(defaultData);

export function DashboardDataProvider({
  variant = "default",
  children,
}: {
  variant?: DashboardVariant;
  children: ReactNode;
}) {
  const value = variant === "venturi" ? venturiData : defaultData;
  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  return useContext(DashboardDataContext);
}

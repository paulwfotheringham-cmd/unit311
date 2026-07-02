"use client";

import { useState } from "react";

import AerialIntelligenceSection from "@/components/dashboard/AerialIntelligenceSection";
import AISummaryCard from "@/components/dashboard/AISummaryCard";
import ActivitiesList from "@/components/dashboard/ActivitiesList";
import AnalyticsSection from "@/components/dashboard/AnalyticsSection";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import HeroSection from "@/components/dashboard/HeroSection";
import ProjectBrief from "@/components/dashboard/ProjectBrief";
import ReportsSection from "@/components/dashboard/ReportsSection";
import SiteIntelligence from "@/components/dashboard/SiteIntelligence";
import ZoneTable from "@/components/dashboard/ZoneTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IMAGES, PLATFORM_STATS, type PageTabId } from "@/lib/mock-data";
import { TrendingUp } from "lucide-react";
import Image from "next/image";

function DashboardFooter() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[#0D1B2A]/80 px-4 py-4 shadow-[0_20px_48px_rgba(0,0,0,0.28)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <div className="flex items-center gap-2.5 text-xs text-white/40">
        <TrendingUp className="h-4 w-4 shrink-0" />
        <span className="leading-relaxed">
          Unit311 Enterprise · {PLATFORM_STATS.classification}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-white/35 sm:gap-4">
        <span>API {PLATFORM_STATS.apiVersion}</span>
        <span className="hidden text-white/15 sm:inline">·</span>
        <span>{PLATFORM_STATS.latency}</span>
        <span className="hidden text-white/15 sm:inline">·</span>
        <span>{PLATFORM_STATS.uptime} uptime</span>
      </div>
    </div>
  );
}

function OverviewContent() {
  return (
    <>
      <SiteIntelligence />

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-3">
          <AISummaryCard />
        </div>
        <div className="lg:col-span-2">
          <ProjectBrief />
        </div>
      </div>

      <AnalyticsSection />
      <ZoneTable />
      <ReportsSection />
      <ActivitiesList />
    </>
  );
}

export default function Test1Dashboard() {
  const [activeTab, setActiveTab] = useState<PageTabId>("overview");

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="relative min-h-full px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-10 lg:py-8">
        <Image
          src={IMAGES.topography}
          alt=""
          fill
          className="pointer-events-none object-cover opacity-[0.025]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.09),transparent_60%)]" />

        <div className="relative space-y-6 sm:space-y-8 lg:space-y-10">
          <HeroSection />
          <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "overview" ? <OverviewContent /> : null}

          {activeTab === "aerial-intelligence" ? <AerialIntelligenceSection /> : null}

          <DashboardFooter />
        </div>
      </div>
    </ScrollArea>
  );
}

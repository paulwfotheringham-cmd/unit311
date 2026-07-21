"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useCommandCentreData } from "@/components/testflighthub/CommandCentreDataProvider";
import { useCorporateMockStore } from "@/components/testflighthub/useCorporateMockStore";
import { useInternalOperationsBasePath } from "@/components/testflighthub/InternalOperationsBasePathContext";
import { formatMoney } from "@/lib/accounting/chart-of-accounts";
import { countLiveProjects, countOpenTickets } from "@/lib/home-executive-dashboard";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import { cn } from "@/lib/utils";

type RibbonMetric = {
  label: string;
  value: string;
  href: string;
  tone?: "default" | "warn" | "good";
};

function RibbonCell({ metric }: { metric: RibbonMetric }) {
  return (
    <Link
      href={metric.href}
      className={cn(
        "min-w-0 flex-1 border-l border-white/[0.07] px-2.5 py-2 first:border-l-0 hover:bg-white/[0.04]",
        metric.tone === "warn" && "bg-amber-500/[0.04]",
        metric.tone === "good" && "bg-emerald-500/[0.04]",
      )}
    >
      <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {metric.label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-white sm:text-[15px]">
        {metric.value}
      </p>
    </Link>
  );
}

/** Full-width executive KPI ribbon — Business Snapshot. */
export default function BusinessSnapshotRibbon() {
  const data = useCommandCentreData();
  const corporate = useCorporateMockStore();
  const basePath = useInternalOperationsBasePath();

  const hrefs = useMemo(
    () => ({
      clients: getInternalNavHref("clients", basePath),
      projects: getInternalNavHref("projects", basePath),
      support: getInternalNavHref("support", basePath),
      hr: getInternalNavHref("hr", basePath),
      financials: getInternalNavHref("financials", basePath),
      contracts: getInternalNavHref("corporate-information", basePath, { tab: "contracts" }),
      crm: getInternalNavHref("crm", basePath),
    }),
    [basePath],
  );

  const metrics = useMemo((): RibbonMetric[] => {
    const revenue = data.financialOverview?.revenueYtd;
    const cash = data.financialOverview?.cashPosition;
    const burn = data.financialOverview?.burnRate?.monthly;
    const burnTrend = data.financialOverview?.burnRate?.trend;
    const openContracts = corporate.contracts.filter(
      (c) => c.status === "active" || c.status === "expiring",
    ).length;

    const moneyOrDash = (value: number | null | undefined, loading: boolean) => {
      if (loading) return "…";
      if (value == null || value === 0) return "—";
      return formatMoney(value, "EUR").replace(/\.00$/, "");
    };

    return [
      {
        label: "Clients",
        value: data.loading.clients ? "…" : String(data.clients.length),
        href: hrefs.clients,
      },
      {
        label: "Revenue",
        value: moneyOrDash(revenue, data.loading.financials),
        href: hrefs.financials,
        tone: revenue && revenue > 0 ? "good" : "default",
      },
      {
        label: "Burn Rate",
        value: moneyOrDash(burn, data.loading.financials),
        href: hrefs.financials,
        tone: burnTrend === "increasing" ? "warn" : burnTrend === "improving" ? "good" : "default",
      },
      {
        label: "Cash",
        value: moneyOrDash(cash, data.loading.financials),
        href: hrefs.financials,
      },
      {
        label: "Projects",
        value: data.loading.projects ? "…" : String(countLiveProjects(data.projects)),
        href: hrefs.projects,
      },
      {
        label: "Employees",
        value: data.loading.employees ? "…" : String(data.employees.length),
        href: hrefs.hr,
      },
      {
        label: "Support",
        value: data.loading.tickets ? "…" : String(countOpenTickets(data.tickets)),
        href: hrefs.support,
        tone: countOpenTickets(data.tickets) > 10 ? "warn" : "default",
      },
      {
        label: "Contracts",
        value: String(openContracts),
        href: hrefs.contracts,
      },
      {
        label: "Pipeline",
        value: data.loading.crmLeads ? "…" : String(data.crmLeads.length),
        href: hrefs.crm,
      },
    ];
  }, [data, corporate.contracts, hrefs]);

  return (
    <section className="overflow-hidden rounded-xl border border-emerald-400/20 bg-gradient-to-r from-emerald-500/[0.07] via-white/[0.03] to-sky-500/[0.06]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/90">
          Business Snapshot
        </p>
        <p className="text-[10px] text-white/35">Live KPIs</p>
      </div>
      <div className="flex flex-wrap xl:flex-nowrap">
        {metrics.map((metric) => (
          <RibbonCell key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}

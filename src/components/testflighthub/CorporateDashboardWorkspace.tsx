"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  FileText,
  Landmark,
  LayoutGrid,
  Upload,
} from "lucide-react";

import {
  computeCorporateDashboardKpis,
  computeCorporateHealthItems,
  listCorporateRecentActivity,
} from "@/lib/corporate-dashboard-data";
import type { CorporateHealthItem } from "@/lib/corporate-data";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import { useCorporateMockStore } from "./useCorporateMockStore";
import {
  CorporateKpiTile,
  CorporateSection,
  CorporateStatusPill,
  corporateSecondaryButtonClass,
} from "./corporate-ui";
import { cn } from "@/lib/utils";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function formatActivityDate(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function healthSeverityClass(severity: CorporateHealthItem["severity"]) {
  switch (severity) {
    case "critical":
      return "border-rose-400/30 bg-rose-500/10";
    case "warning":
      return "border-amber-400/30 bg-amber-500/10";
    default:
      return "border-sky-400/25 bg-sky-500/10";
  }
}

function healthSeverityPill(severity: CorporateHealthItem["severity"]) {
  switch (severity) {
    case "critical":
      return "border-rose-400/30 bg-rose-500/15 text-rose-200";
    case "warning":
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
    default:
      return "border-sky-400/30 bg-sky-500/15 text-sky-200";
  }
}

export default function CorporateDashboardWorkspace() {
  const basePath = useInternalOperationsBasePath();
  const store = useCorporateMockStore();
  const [liveLicenceCount, setLiveLicenceCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/software-assets", { cache: "no-store" });
        const data = await readApiJson<{ assets?: unknown[] }>(response);
        if (!response.ok) throw new Error("Failed to load software assets");
        if (!cancelled) setLiveLicenceCount(data.assets?.length ?? 0);
      } catch {
        if (!cancelled) setLiveLicenceCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = useMemo(
    () =>
      computeCorporateDashboardKpis({
        liveLicenceCount: liveLicenceCount ?? undefined,
      }),
    [store, liveLicenceCount],
  );

  const healthItems = useMemo(() => computeCorporateHealthItems(), [store]);
  const activity = useMemo(() => listCorporateRecentActivity(8), [store]);

  const corporateHref = (view: Parameters<typeof getInternalNavHref>[0]) =>
    getInternalNavHref(view, basePath);

  const quickActions = [
    { label: "Add Office", href: corporateHref("office-locations"), icon: Building2 },
    { label: "Add Bank Account", href: corporateHref("corporate-bank-accounts"), icon: Landmark },
    {
      label: "Add Advisor",
      href: corporateHref("corporate-advisers"),
      icon: Briefcase,
    },
    { label: "Add Contract", href: corporateHref("corporate-contracts"), icon: FileText },
    {
      label: "Upload Corporate Document",
      href: corporateHref("corporate-contracts"),
      icon: Upload,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <CorporateKpiTile label="Registered Companies" value={kpis.registeredCompanies} />
        <CorporateKpiTile label="Office Locations" value={kpis.officeLocations} />
        <CorporateKpiTile label="Bank Accounts" value={kpis.bankAccounts} />
        <CorporateKpiTile label="Professional Advisors" value={kpis.professionalAdvisors} />
        <CorporateKpiTile label="Active Contracts" value={kpis.activeContracts} />
        <CorporateKpiTile
          label="Software Licences"
          value={kpis.softwareLicences}
          hint={liveLicenceCount != null ? "Live register count" : "Mock register count"}
        />
        <CorporateKpiTile label="Corporate Documents" value={kpis.corporateDocuments} />
      </section>

      <section
        aria-label="Quick actions"
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-3 py-3 sm:px-4"
      >
        <p className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
          Quick actions
        </p>
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={corporateSecondaryButtonClass()}
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </Link>
        ))}
        <Link
          href={corporateHref("corporate-company-details")}
          className={cn(corporateSecondaryButtonClass(), "ml-auto")}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Company Details
        </Link>
      </section>

      <CorporateSection
        title="Corporate Health"
        subtitle="Renewals, compliance gaps, and records needing attention."
      >
        {healthItems.length === 0 ? (
          <p className="text-sm text-white/45">
            No outstanding corporate health items — renewals and records look current.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {healthItems.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border px-4 py-3 ${healthSeverityClass(item.severity)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                    {item.kind}
                  </p>
                  <CorporateStatusPill className={healthSeverityPill(item.severity)}>
                    {item.severity}
                  </CorporateStatusPill>
                </div>
                <p className="mt-2 text-sm font-medium text-white">{item.label}</p>
                <p className="mt-1 text-xs text-white/50">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </CorporateSection>

      <CorporateSection title="Recent Activity" subtitle="Corporate records trail.">
        <ul className="space-y-2">
          {activity.length === 0 ? (
            <li className="text-sm text-white/45">No recent corporate activity.</li>
          ) : (
            activity.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-white/45">{item.detail}</p>
                </div>
                <p className="shrink-0 text-xs tabular-nums text-white/40">
                  {formatActivityDate(item.at)}
                </p>
              </li>
            ))
          )}
        </ul>
      </CorporateSection>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";

import {
  CORPORATE_INFORMATION_TABS,
  isCorporateInformationTab,
  type CorporateInformationTab,
} from "@/lib/internal-operations-data";
import { cn } from "@/lib/utils";

import CapTableWorkspace from "./CapTableWorkspace";
import CompanyDetailsWorkspace from "./CompanyDetailsWorkspace";
import ModulePlaceholderWorkspace from "./ModulePlaceholderWorkspace";
import OfficeLocationsWorkspace from "./OfficeLocationsWorkspace";
import SoftwareAssetRegisterWorkspace from "./SoftwareAssetRegisterWorkspace";

const TAB_PLACEHOLDERS: Partial<
  Record<CorporateInformationTab, { title: string; description: string }>
> = {
  "bank-accounts": {
    title: "Bank Accounts",
    description:
      "Coming Soon — Company bank accounts and payment details used for operations.",
  },
  "professional-advisors": {
    title: "Professional Advisors",
    description:
      "Coming Soon — Lawyers, accountants, and other professional advisers on retainer.",
  },
  contracts: {
    title: "Contracts",
    description: "Coming Soon — Corporate contracts, MSAs, and key commercial agreements.",
  },
};

function resolveTab(value: string | null): CorporateInformationTab {
  return isCorporateInformationTab(value) ? value : "company-details";
}

export default function CorporateInformationWorkspace() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<CorporateInformationTab>(() =>
    resolveTab(searchParams.get("tab")),
  );

  useEffect(() => {
    setTab(resolveTab(searchParams.get("tab")));
  }, [searchParams]);

  const selectTab = useCallback((next: CorporateInformationTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "corporate-information");
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const placeholder = TAB_PLACEHOLDERS[tab];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10">
            <Building2 className="h-5 w-5 text-sky-200" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">Corporate Information</h2>
            <p className="mt-1 text-sm text-white/65">
              Legal entity profile, locations, advisers, software, and contracts for this
              organisation.
            </p>
          </div>
        </div>

        <div
          className="mt-4 flex gap-1 overflow-x-auto border-t border-white/10 pt-3"
          role="tablist"
          aria-label="Corporate Information sections"
        >
          {CORPORATE_INFORMATION_TABS.map((entry) => {
            const selected = tab === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(entry.key)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  selected
                    ? "bg-sky-500/20 text-sky-100"
                    : "text-white/65 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel">
        {tab === "company-details" ? <CompanyDetailsWorkspace /> : null}
        {tab === "cap-table" ? <CapTableWorkspace /> : null}
        {tab === "office-locations" ? <OfficeLocationsWorkspace /> : null}
        {tab === "software-licences" ? <SoftwareAssetRegisterWorkspace /> : null}
        {placeholder ? (
          <ModulePlaceholderWorkspace
            title={placeholder.title}
            description={placeholder.description}
          />
        ) : null}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ClipboardList,
  FileText,
  Plus,
  UserPlus,
} from "lucide-react";

import {
  computeTrainingDashboardKpis,
} from "@/lib/tqms-mock-store";
import {
  getInternalNavHref,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import { tqmsStatusClass } from "@/lib/tqms-data";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import { useTqmsMockStore } from "./useTqmsMockStore";
import {
  TqmsKpiTile,
  TqmsSection,
  TqmsStatusPill,
  tqmsPrimaryButtonClass,
  tqmsSecondaryButtonClass,
} from "./tqms-ui";

export default function QualityManagementWorkspace() {
  const basePath = useInternalOperationsBasePath();
  const store = useTqmsMockStore();
  const [notice, setNotice] = useState<string | null>(null);

  const trainingKpis = useMemo(() => computeTrainingDashboardKpis(store), [store]);

  const kpis = useMemo(() => {
    const controlledDocuments = store.documents.filter((d) => d.status === "Approved").length;
    const openCapas = store.capas.filter((c) => c.status !== "Closed").length;
    const internalAudits = store.audits.filter(
      (a) => !a.title.toLowerCase().includes("supplier"),
    ).length;
    const supplierAudits = store.audits.filter((a) =>
      a.title.toLowerCase().includes("supplier"),
    ).length;
    const correctiveActions = store.capas.filter((c) => c.status === "Action").length;
    const preventiveActions = store.capas.filter((c) => c.status === "Verification").length;
    const approvedDocs = store.documents.filter((d) => d.status === "Approved").length;
    const docCompliance =
      store.documents.length === 0
        ? 100
        : Math.round((approvedDocs / store.documents.length) * 100);
    const complianceScore = Math.round((trainingKpis.complianceScore + docCompliance) / 2);

    return {
      controlledDocuments,
      openCapas,
      internalAudits,
      supplierAudits,
      nonConformances: openCapas,
      correctiveActions,
      preventiveActions,
      complianceScore,
    };
  }, [store, trainingKpis.complianceScore]);

  const quickLinks = [
    { label: "Document Control", view: "qms-document-control" as const },
    { label: "CAPA", view: "qms-capa" as const },
    { label: "Internal Audits", view: "qms-internal-audits" as const },
    { label: "Management Review", view: "qms-management-review" as const },
    { label: "Training Dashboard", view: "training-dashboard" as const },
    { label: "QMS Reports", view: "qms-reports" as const },
  ];

  return (
    <div className="space-y-5">
      {notice ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <Link
            key={link.view}
            href={getInternalNavHref(link.view, basePath)}
            className={tqmsSecondaryButtonClass()}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TqmsKpiTile label="Controlled Documents" value={kpis.controlledDocuments} />
        <TqmsKpiTile label="Open CAPAs" value={kpis.openCapas} />
        <TqmsKpiTile label="Internal Audits" value={kpis.internalAudits} />
        <TqmsKpiTile label="Supplier Audits" value={kpis.supplierAudits} />
        <TqmsKpiTile label="Non-Conformances" value={kpis.nonConformances} />
        <TqmsKpiTile label="Corrective Actions" value={kpis.correctiveActions} />
        <TqmsKpiTile label="Preventive Actions" value={kpis.preventiveActions} />
        <TqmsKpiTile label="Compliance Score" value={`${kpis.complianceScore}%`} />
      </section>

      <TqmsSection
        title="QMS Sections"
        subtitle="Module health, ownership, and outstanding items across the quality system."
        actions={
          <Link href={getInternalNavHref("qms-reports", basePath)} className={tqmsSecondaryButtonClass()}>
            <FileText className="h-3.5 w-3.5" />
            Reports
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {store.qmsSections.map((section) => (
            <article
              key={section.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{section.name}</h3>
                  <p className="mt-1 text-xs text-white/45">Owner · {section.owner}</p>
                </div>
                <TqmsStatusPill className={tqmsStatusClass(section.status)}>
                  {section.status}
                </TqmsStatusPill>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-white/10 bg-[#0b1524]/80 px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">Outstanding</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-white">
                    {section.outstanding}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0b1524]/80 px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">Next Due</dt>
                  <dd className="mt-0.5 text-sm font-medium tabular-nums text-white">
                    {section.nextDue}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={getInternalNavHref(section.view as InternalOperationsView, basePath)}
                  className={tqmsPrimaryButtonClass()}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Open
                </Link>
                <button
                  type="button"
                  className={tqmsSecondaryButtonClass()}
                  onClick={() =>
                    setNotice(`Create record opened for ${section.name}.`)
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create
                </button>
                <button
                  type="button"
                  className={tqmsSecondaryButtonClass()}
                  onClick={() =>
                    setNotice(`Assign owner task queued for ${section.name}.`)
                  }
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Assign
                </button>
              </div>
            </article>
          ))}
        </div>
      </TqmsSection>
    </div>
  );
}

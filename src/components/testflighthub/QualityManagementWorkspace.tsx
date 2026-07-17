"use client";

import { QMS_MODULES } from "@/lib/qms-modules-data";
import { cn } from "@/lib/utils";
import { ClipboardCheck, ShieldCheck } from "lucide-react";

function statusClass(status: (typeof QMS_MODULES)[number]["status"]) {
  if (status === "complete") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "in-progress") return "border-sky-400/30 bg-sky-500/10 text-sky-200";
  return "border-white/10 bg-white/[0.03] text-white/55";
}

export default function QualityManagementWorkspace() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#0a1422]/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10">
            <ShieldCheck className="h-5 w-5 text-sky-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Quality Management System</h2>
            <p className="text-sm text-white/55">
              Unit311 Central QMS modules, compliance records, and audit readiness.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {QMS_MODULES.map((module) => (
          <article
            key={module.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">{module.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{module.description}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  statusClass(module.status),
                )}
              >
                {module.status.replace("-", " ")}
              </span>
            </div>
            <p className="mt-4 text-xs text-white/45">{module.lessons} lessons</p>
          </article>
        ))}
      </div>
    </div>
  );
}


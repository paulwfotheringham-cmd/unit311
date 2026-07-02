"use client";

import type { WebODMDeliverablesMission } from "@/lib/webodm-deliverables";
import { cn } from "@/lib/utils";

function formatCaptureDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCrs(mission: WebODMDeliverablesMission) {
  if (mission.crsName && mission.crsEpsg) {
    return `${mission.crsName} (EPSG:${mission.crsEpsg})`;
  }
  if (mission.crsName) return mission.crsName;
  if (mission.crsEpsg) return `EPSG:${mission.crsEpsg}`;
  return "—";
}

type MissionIntelBarProps = {
  mission: WebODMDeliverablesMission;
  className?: string;
};

export default function MissionIntelBar({ mission, className }: MissionIntelBarProps) {
  const items = [
    { label: "Mission name", value: mission.name },
    { label: "Capture date", value: formatCaptureDate(mission.captureDate) },
    { label: "Images processed", value: mission.imagesCount?.toLocaleString("en-GB") ?? "—" },
    { label: "Processing status", value: mission.statusLabel },
    { label: "Ground sampling distance", value: mission.gsdLabel ?? "—" },
    { label: "Survey area", value: mission.surveyAreaLabel ?? "—" },
    { label: "Coordinate reference system", value: formatCrs(mission) },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.07] bg-[#0D1B2A]/80 px-4 py-4 shadow-[0_20px_48px_rgba(0,0,0,0.28)] sm:px-6 sm:py-5",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
        Mission intelligence
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white">Start Your Business Workspace</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/50">
        Interactive survey outputs rendered directly in Unit311 — orthomosaic, elevation,
        3D mesh, and processing report in one operational workspace.
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
          >
            <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
              {item.label}
            </dt>
            <dd className="mt-1 text-sm font-medium leading-snug text-white/85">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

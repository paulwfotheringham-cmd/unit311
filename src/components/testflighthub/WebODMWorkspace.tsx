"use client";

import { useEffect, useState } from "react";

import { WEBODM_DASHBOARD_URL } from "@/lib/webodm-config";
import type { WebODMProjectSummary } from "@/lib/webodm-client";
import { cn } from "@/lib/utils";
import { ExternalLink, Layers, Loader2, Map, Sparkles } from "lucide-react";

type WebODMProjectsResponse = {
  configured: boolean;
  dashboardUrl: string;
  projects: WebODMProjectSummary[];
  error?: string;
};

function taskStatusClass(statusLabel: string) {
  switch (statusLabel) {
    case "Completed":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-300";
    case "Running":
      return "border-sky-400/40 bg-sky-500/15 text-sky-300";
    case "Queued":
      return "border-amber-400/40 bg-amber-500/15 text-amber-200";
    case "Failed":
      return "border-red-400/40 bg-red-500/15 text-red-300";
    default:
      return "border-white/20 bg-white/10 text-white/60";
  }
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WebODMWorkspace() {
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<WebODMProjectsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoading(true);

      try {
        const res = await fetch("/api/webodm/projects", { cache: "no-store" });
        const data = (await res.json()) as WebODMProjectsResponse;

        if (!cancelled) {
          setResponse(data);
        }
      } catch {
        if (!cancelled) {
          setResponse({
            configured: false,
            dashboardUrl: WEBODM_DASHBOARD_URL,
            projects: [],
            error: "Could not reach the WebODM API route.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const projects = response?.projects ?? [];
  const connected = Boolean(response?.configured && !response?.error);
  const showProjects = !loading && !response?.error;

  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-wrap items-start justify-end gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
              loading
                ? "border-white/20 bg-white/10 text-white/60"
                : connected && !response?.error
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-400/30 bg-red-500/10 text-red-300",
            )}
          >
            {loading ? "Connecting…" : connected && !response?.error ? "Connected" : "Offline"}
          </span>
          <a
            href={WEBODM_DASHBOARD_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!WEBODM_DASHBOARD_URL}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-5 text-sm font-semibold text-white shadow-[0_0_32px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#1d4ed8]",
              !WEBODM_DASHBOARD_URL && "pointer-events-none opacity-50",
            )}
          >
            Open WebODM
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {loading && (
        <div className="mt-8 flex items-center gap-3 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading projects from WebODM…
        </div>
      )}

      {!loading && response?.error && (
        <div className="mt-8 rounded-xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">
          {response.error}
          <p className="mt-2 text-red-200/70">
            Make sure WebODM is reachable at a public HTTPS URL
            {WEBODM_DASHBOARD_URL ? ` (${WEBODM_DASHBOARD_URL})` : ""} and redeploy after setting{" "}
            <span className="font-mono">WEBODM_URL</span>,{" "}
            <span className="font-mono">NEXT_PUBLIC_WEBODM_URL</span>,{" "}
            <span className="font-mono">WEBODM_USERNAME</span>, and{" "}
            <span className="font-mono">WEBODM_PASSWORD</span> in Vercel. For local dev, use{" "}
            <span className="font-mono">.env.local</span> and restart{" "}
            <span className="font-mono">npm run dev</span>.
          </p>
        </div>
      )}

      {showProjects && (
        <div className="mt-8 space-y-4">
          {projects.length === 0 ? (
            <p className="text-sm text-white/55">No WebODM projects yet.</p>
          ) : (
            projects.map((project) => (
              <article
                key={project.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{project.name}</h3>
                    <p className="mt-1 text-xs text-white/45">
                      Project #{project.id} · {project.taskCount} task
                      {project.taskCount === 1 ? "" : "s"} · Created {formatDate(project.createdAt)}
                    </p>
                  </div>
                </div>

                {project.tasks.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          {["Task", "Status", "Images", "Processing", "Created"].map((heading) => (
                            <th
                              key={heading}
                              scope="col"
                              className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {project.tasks.map((task) => (
                          <tr key={task.id} className="border-b border-white/5">
                            <td className="px-3 py-3 font-medium text-white">
                              {task.name}
                              <p className="mt-1 font-mono text-[10px] text-white/35">{task.id}</p>
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                  taskStatusClass(task.statusLabel),
                                )}
                              >
                                {task.statusLabel}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-white/70">
                              {task.imagesCount ?? "—"}
                            </td>
                            <td className="px-3 py-3 text-white/70">
                              {formatDuration(task.processingTimeMs)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-white/70">
                              {formatDate(task.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <Layers className="h-5 w-5 text-sky-400" />
          <h3 className="mt-3 font-semibold text-white">2D Orthophotos</h3>
          <p className="mt-2 text-sm text-white/50">
            Georeferenced survey maps from overlapping nadir imagery.
          </p>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <Map className="h-5 w-5 text-emerald-400" />
          <h3 className="mt-3 font-semibold text-white">Point Clouds</h3>
          <p className="mt-2 text-sm text-white/50">
            Dense 3D point data for volume and terrain analysis.
          </p>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <h3 className="mt-3 font-semibold text-white">3D Models</h3>
          <p className="mt-2 text-sm text-white/50">
            Textured meshes for client deliverables and visual QA.
          </p>
        </article>
      </div>

      <div className="mt-8 rounded-xl border border-amber-400/25 bg-amber-500/10 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
          Coming next
        </p>
        <ul className="mt-3 space-y-2 text-sm text-white/60">
          <li>Simulated FlightHub 2 mission imagery pushed to WebODM after test flights</li>
          <li>Processing status and deliverables linked to Live Projects and client records</li>
          <li>Hosted WebODM endpoint configured via environment variables in production</li>
        </ul>
      </div>
    </section>
  );
}

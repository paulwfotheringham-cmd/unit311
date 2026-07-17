"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { ManagedClient } from "@/lib/client-management-data";
import {
  createBlankProjectInput,
  formatProjectDate,
  projectPhaseClass,
  PROJECT_PHASE_OPTIONS,
  type InternalProject,
  type ProjectPhase,
} from "@/lib/projects-data";
import { createInitialUsers } from "@/lib/user-management-data";
import { cn } from "@/lib/utils";
import { ExternalLink, FolderKanban, Loader2, Plus, Trash2, X } from "lucide-react";

import ProjectDetailWorkspace from "./ProjectDetailWorkspace";
import ProjectsDashboardStrip from "./ProjectsDashboardStrip";
import DashboardTopTilesBar from "@/components/testflighthub/DashboardTopTilesBar";
import {
  DEFAULT_PROJECTS_TILE_LAYOUT,
  PROJECTS_DASHBOARD_TILES,
} from "@/lib/view-dashboard-tile-catalogs";

const operators = createInitialUsers();

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

type ProjectsWorkspaceProps = {
  clients: ManagedClient[];
};

function ProjectCard({
  project,
  onOpen,
  onDelete,
  busy,
  highlight,
}: {
  project: InternalProject;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
  highlight?: boolean;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(project.id);
        }
      }}
      className={cn(
        "cursor-pointer rounded-xl border bg-white/[0.03] p-4 transition-colors hover:border-sky-400/30 hover:bg-white/[0.05]",
        highlight ? "border-amber-400/40 bg-amber-500/10" : "border-white/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-white">{project.name}</h3>
          <p className="mt-1 text-xs text-white/45">{project.clientName}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(project.id);
          }}
          aria-label={`Delete ${project.name}`}
          className="shrink-0 rounded-lg border border-white/10 p-1.5 text-white/40 transition-colors hover:border-rose-400/30 hover:text-rose-300 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {project.site && <p className="mt-2 text-xs text-white/55">{project.site}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
        {project.region && <span>{project.region}</span>}
        {project.operator && (
          <>
            {project.region && <span aria-hidden>·</span>}
            <span>{project.operator}</span>
          </>
        )}
      </div>

      <p className="mt-2 text-xs text-white/50">
        Start {formatProjectDate(project.startDate)}
        {project.endDate ? ` · End ${formatProjectDate(project.endDate)}` : ""}
      </p>

      {project.phase === "live" && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-white/45">
            <span>Progress</span>
            <span className="font-mono text-white/70">{project.progressPct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
              style={{ width: `${Math.min(100, project.progressPct)}%` }}
            />
          </div>
        </div>
      )}

      {project.notes && (
        <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-white/35">{project.notes}</p>
      )}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen(project.id);
        }}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
      >
        <ExternalLink className="h-3 w-3" />
        Open project
      </button>
    </article>
  );
}

export default function ProjectsWorkspace({ clients }: ProjectsWorkspaceProps) {
  const searchParams = useSearchParams();
  const clientFilterId = searchParams.get("clientId");
  const projectFilterId = searchParams.get("projectId");
  const filteredClient = useMemo(
    () => clients.find((client) => client.id === clientFilterId) ?? null,
    [clients, clientFilterId],
  );

  const [projects, setProjects] = useState<InternalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [draft, setDraft] = useState(createBlankProjectInput);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const liveProjects = useMemo(() => {
    const live = projects.filter((project) => project.phase === "live");
    if (!filteredClient) return live;
    return live.filter(
      (project) =>
        project.clientId === filteredClient.id ||
        project.clientName === filteredClient.companyName,
    );
  }, [filteredClient, projects]);

  const upcomingProjects = useMemo(() => {
    const upcoming = projects.filter((project) => project.phase === "upcoming");
    if (!filteredClient) return upcoming;
    return upcoming.filter(
      (project) =>
        project.clientId === filteredClient.id ||
        project.clientName === filteredClient.companyName,
    );
  }, [filteredClient, projects]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      const data = await readApiJson<{ projects?: InternalProject[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load projects");
      setProjects(data.projects ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projectFilterId || loading) return;
    const match = projects.find((project) => project.id === projectFilterId);
    if (match) setSelectedProjectId(match.id);
  }, [loading, projectFilterId, projects]);

  function handleClientChange(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    setDraft((current) => ({
      ...current,
      clientId,
      clientName: client?.companyName ?? "",
      region: client?.region ?? current.region,
    }));
  }

  async function handleCreateProject() {
    if (!draft.name.trim() || !draft.clientName.trim()) {
      setError("Project name and client are required");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          clientId: draft.clientId || undefined,
          clientName: draft.clientName.trim(),
          site: draft.site.trim() || undefined,
          region: draft.region.trim() || undefined,
          operator: draft.operator.trim() || undefined,
          phase: draft.phase,
          startDate: draft.startDate || null,
          endDate: draft.endDate || null,
          notes: draft.notes.trim() || undefined,
        }),
      });

      const data = await readApiJson<{ project?: InternalProject; error?: string }>(response);
      if (!response.ok || !data.project) throw new Error(data.error ?? "Failed to create project");

      setProjects((current) => [data.project!, ...current]);
      setDraft(createBlankProjectInput());
      setShowForm(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteProject(id: string) {
    if (!window.confirm("Delete this project?")) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const data = await readApiJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete project");
      setProjects((current) => current.filter((project) => project.id !== id));
      setSelectedProjectId((current) => (current === id ? null : current));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete project");
    } finally {
      setBusy(false);
    }
  }

  if (selectedProject) {
    return (
      <ProjectDetailWorkspace
        project={selectedProject}
        clients={clients}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <DashboardTopTilesBar
        storageKey="unit311-projects-dashboard-tiles"
        catalog={PROJECTS_DASHBOARD_TILES}
        defaultLayout={DEFAULT_PROJECTS_TILE_LAYOUT}
        title="Project key details"
        showCustomizeHint={false}
      />
      <ProjectsDashboardStrip projects={projects} clients={clients} />

      {filteredClient && (
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          Showing projects for <span className="font-semibold">{filteredClient.companyName}</span>
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
            Field Operations
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Projects</h2>
          <p className="mt-2 text-sm text-white/55">
            Live field work and scheduled mobilisations across client accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((open) => !open)}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New project"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      {showForm && (
        <section className="rounded-2xl border border-white/10 bg-[#0a1422]/80 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-white">Add project</h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <FieldLabel>Project name</FieldLabel>
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Site survey, inspection…"
                className={inputClassName()}
              />
            </div>

            <div>
              <FieldLabel>Client</FieldLabel>
              <select
                value={draft.clientId}
                onChange={(event) => handleClientChange(event.target.value)}
                className={inputClassName()}
              >
                <option value="">Select client…</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Phase</FieldLabel>
              <select
                value={draft.phase}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    phase: event.target.value as ProjectPhase,
                  }))
                }
                className={inputClassName()}
              >
                {PROJECT_PHASE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Site / location</FieldLabel>
              <input
                value={draft.site}
                onChange={(event) => setDraft((current) => ({ ...current, site: event.target.value }))}
                placeholder="Site name or address"
                className={inputClassName()}
              />
            </div>

            <div>
              <FieldLabel>Region</FieldLabel>
              <input
                value={draft.region}
                onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))}
                placeholder="Region or hub"
                className={inputClassName()}
              />
            </div>

            <div>
              <FieldLabel>Lead operator</FieldLabel>
              <select
                value={draft.operator}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, operator: event.target.value }))
                }
                className={inputClassName()}
              >
                <option value="">Unassigned</option>
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.fullName}>
                    {operator.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Start date</FieldLabel>
              <input
                type="date"
                value={draft.startDate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, startDate: event.target.value }))
                }
                className={inputClassName()}
              />
            </div>

            <div>
              <FieldLabel>End date</FieldLabel>
              <input
                type="date"
                value={draft.endDate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, endDate: event.target.value }))
                }
                className={inputClassName()}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel>Notes</FieldLabel>
              <textarea
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className={cn(inputClassName(), "resize-y")}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCreateProject()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Create project
          </button>
        </section>
      )}

      {loading ? (
        <div className="flex min-h-[16rem] items-center justify-center text-white/50">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-emerald-300" />
                <h3 className="text-base font-semibold text-white">Live projects</h3>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  projectPhaseClass("live"),
                )}
              >
                {liveProjects.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {liveProjects.length === 0 ? (
                <p className="text-sm text-white/45">No live projects.</p>
              ) : (
                liveProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={setSelectedProjectId}
                    onDelete={handleDeleteProject}
                    busy={busy}
                    highlight={
                      !!filteredClient &&
                      (project.clientId === filteredClient.id ||
                        project.clientName === filteredClient.companyName)
                    }
                  />
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-sky-300" />
                <h3 className="text-base font-semibold text-white">Upcoming projects</h3>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  projectPhaseClass("upcoming"),
                )}
              >
                {upcomingProjects.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {upcomingProjects.length === 0 ? (
                <p className="text-sm text-white/45">No upcoming projects.</p>
              ) : (
                upcomingProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={setSelectedProjectId}
                    onDelete={handleDeleteProject}
                    busy={busy}
                    highlight={
                      !!filteredClient &&
                      (project.clientId === filteredClient.id ||
                        project.clientName === filteredClient.companyName)
                    }
                  />
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

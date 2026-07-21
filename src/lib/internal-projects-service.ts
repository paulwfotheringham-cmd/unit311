import {
  mapInternalProject,
  type InternalProject,
  type ProjectPhase,
} from "@/lib/projects-data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

type DbProject = Parameters<typeof mapInternalProject>[0];

export type ProjectsWorkspaceScope = {
  /** Explicit override for system callers. Prefer omit to use session context. */
  workspaceId?: string | null;
};

function requireProjectsSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

/**
 * Resolve the tenant key for Projects module operations.
 * Uses requireCurrentWorkspace() unless an explicit workspaceId is provided.
 */
export async function resolveProjectsWorkspaceId(
  scope?: ProjectsWorkspaceScope,
): Promise<string> {
  const explicit = scope?.workspaceId?.trim();
  if (explicit) return explicit;
  const workspace = await requireCurrentWorkspace();
  return workspace.id;
}

export async function listProjects(scope?: ProjectsWorkspaceScope): Promise<InternalProject[]> {
  const workspaceId = await resolveProjectsWorkspaceId(scope);
  const supabase = requireProjectsSupabase();
      const { data, error } = await supabase
        .from("internal_projects")
        .select(
          "id,name,client_id,client_name,site,region,operator,phase,start_date,end_date,progress_pct,notes,created_at,updated_at",
        )
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as DbProject[]).map(mapInternalProject);
}

export async function getProject(
  id: string,
  scope?: ProjectsWorkspaceScope,
): Promise<InternalProject | null> {
  const workspaceId = await resolveProjectsWorkspaceId(scope);
  const supabase = requireProjectsSupabase();
  const { data, error } = await supabase
    .from("internal_projects")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapInternalProject(data as DbProject) : null;
}

/** Throws if the project is missing or belongs to another workspace. */
export async function requireProjectInWorkspace(
  id: string,
  scope?: ProjectsWorkspaceScope,
): Promise<InternalProject> {
  const project = await getProject(id, scope);
  if (!project) {
    throw new Error("Project not found.");
  }
  return project;
}

export async function createProject(
  input: {
    name: string;
    clientId?: string;
    clientName: string;
    site?: string;
    region?: string;
    operator?: string;
    phase?: ProjectPhase;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string;
    workspaceId?: string;
  },
  scope?: ProjectsWorkspaceScope,
): Promise<InternalProject> {
  const workspaceId = await resolveProjectsWorkspaceId({
    workspaceId: input.workspaceId ?? scope?.workspaceId,
  });
  const supabase = requireProjectsSupabase();
  const phase = input.phase ?? "upcoming";
  const progressPct = phase === "live" ? 0 : 0;

  const { data, error } = await supabase
    .from("internal_projects")
    .insert({
      workspace_id: workspaceId,
      name: input.name.trim(),
      client_id: input.clientId?.trim() || null,
      client_name: input.clientName.trim(),
      site: input.site?.trim() || null,
      region: input.region?.trim() || null,
      operator: input.operator?.trim() || null,
      phase,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      progress_pct: progressPct,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapInternalProject(data as DbProject);
}

export async function deleteProject(id: string, scope?: ProjectsWorkspaceScope) {
  const workspaceId = await resolveProjectsWorkspaceId(scope);
  await requireProjectInWorkspace(id, { workspaceId });
  const supabase = requireProjectsSupabase();
  const { error } = await supabase
    .from("internal_projects")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

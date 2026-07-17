import {
  CENTRAL_SITE_URL,
  customerWorkspaceOrigin,
  workspacePostLoginUrl,
} from "@/lib/app-domains";
import {
  ONBOARDING_MODULES,
  type OnboardingModuleId,
} from "@/lib/onboarding-modules-data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { findWorkspaceBySlug } from "@/lib/workspace-host";

/** V1 prototype: only these workspace slugs use the customer onboarding wizard. */
export const WORKSPACE_ONBOARDING_PROTOTYPE_SLUGS = new Set(["fotheringham"]);

export type WorkspaceOnboardingState = {
  workspaceId: string;
  slug: string;
  name: string;
  status: string;
  onboardingCompleted: boolean;
  selectedModules: OnboardingModuleId[];
  primaryColour: string;
  secondaryColour: string;
  logoUrl: string | null;
};

export type WorkspaceOnboardingDraft = {
  selectedModules?: string[];
  primaryColour?: string;
  secondaryColour?: string;
  companyDisplayName?: string;
  inviteEmails?: string[];
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

export function isWorkspaceOnboardingPrototypeSlug(slug: string | null | undefined) {
  return WORKSPACE_ONBOARDING_PROTOTYPE_SLUGS.has((slug ?? "").trim().toLowerCase());
}

/** Apex App Router path for the onboarding wizard (rewritten from workspace `/onboarding`). */
export function workspaceOnboardingPath(slug: string, step?: string) {
  const base = `/onboarding/${encodeURIComponent(slug.trim().toLowerCase())}`;
  if (!step || step === "welcome") return base;
  return `${base}?step=${encodeURIComponent(step)}`;
}

/** Customer-host URL for onboarding (`https://{slug}.unit311central.com/onboarding`). */
export function workspaceOnboardingUrl(slug: string, step?: string) {
  const origin = customerWorkspaceOrigin(slug);
  if (!origin) return workspaceOnboardingPath(slug, step);
  const base = workspacePostLoginUrl(origin, "onboarding");
  if (!step || step === "welcome") return base;
  return `${base}?step=${encodeURIComponent(step)}`;
}

/** Customer-host dashboard URL (`https://{slug}.unit311central.com/dashboard`). */
export function workspaceDashboardUrl(slug: string) {
  const origin = customerWorkspaceOrigin(slug);
  if (!origin) return `/${slug.trim().toLowerCase()}`;
  return workspacePostLoginUrl(origin, "dashboard");
}

/**
 * Whether this workspace should send the user through customer onboarding
 * after login (prototype + incomplete only).
 */
export async function workspaceNeedsCustomerOnboarding(slug: string): Promise<boolean> {
  const normalized = slug.trim().toLowerCase();
  if (!isWorkspaceOnboardingPrototypeSlug(normalized)) return false;
  const state = await getWorkspaceOnboardingState(normalized);
  if (!state) return false;
  return !state.onboardingCompleted;
}

export async function ensureWorkspaceOnboardingCompletedColumn(): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("workspaces").select("onboarding_completed").limit(1);
  if (!error) return true;

  // Column missing — best-effort apply via raw SQL is handled by migration route.
  if (
    error.message.includes("onboarding_completed") ||
    error.message.includes("schema cache") ||
    error.message.includes("does not exist")
  ) {
    return false;
  }
  throw new Error(error.message);
}

export async function getWorkspaceOnboardingState(
  slug: string,
): Promise<WorkspaceOnboardingState | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, status, onboarding_completed")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) {
    if (error.message.includes("onboarding_completed")) {
      const fallback = await findWorkspaceBySlug(normalized);
      if (!fallback) return null;
      return {
        workspaceId: fallback.id,
        slug: fallback.slug,
        name: fallback.name,
        status: fallback.status,
        onboardingCompleted: false,
        selectedModules: [],
        primaryColour: "#0b2d63",
        secondaryColour: "#2563eb",
        logoUrl: null,
      };
    }
    throw new Error(error.message);
  }
  if (!data) return null;

  const workspaceId = String(data.id);
  const [{ data: settings }, { data: modules }] = await Promise.all([
    supabase
      .from("workspace_settings")
      .select("primary_colour, secondary_colour, logo_url")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("workspace_modules")
      .select("module_key, enabled")
      .eq("workspace_id", workspaceId),
  ]);

  const selectedModules = ((modules ?? []) as Array<{ module_key: string; enabled: boolean }>)
    .filter((row) => row.enabled)
    .map((row) => row.module_key)
    .filter((key): key is OnboardingModuleId =>
      ONBOARDING_MODULES.some((module) => module.id === key),
    );

  return {
    workspaceId,
    slug: String(data.slug ?? normalized),
    name: String(data.name ?? normalized),
    status: String(data.status ?? ""),
    onboardingCompleted: Boolean(data.onboarding_completed),
    selectedModules,
    primaryColour: String(settings?.primary_colour ?? "#0b2d63"),
    secondaryColour: String(settings?.secondary_colour ?? "#2563eb"),
    logoUrl: settings?.logo_url ? String(settings.logo_url) : null,
  };
}

export async function saveWorkspaceOnboardingDraft(
  slug: string,
  draft: WorkspaceOnboardingDraft,
) {
  const state = await getWorkspaceOnboardingState(slug);
  if (!state) throw new Error("Workspace not found.");
  if (!isWorkspaceOnboardingPrototypeSlug(state.slug)) {
    throw new Error("Onboarding wizard is not enabled for this workspace.");
  }

  const supabase = requireSupabase();
  const now = new Date().toISOString();

  if (draft.primaryColour || draft.secondaryColour || draft.companyDisplayName) {
    const settingsPatch: Record<string, string> = { updated_at: now };
    if (draft.primaryColour) settingsPatch.primary_colour = draft.primaryColour;
    if (draft.secondaryColour) settingsPatch.secondary_colour = draft.secondaryColour;

    const { data: existing } = await supabase
      .from("workspace_settings")
      .select("id")
      .eq("workspace_id", state.workspaceId)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("workspace_settings").update(settingsPatch).eq("id", existing.id);
    } else {
      await supabase.from("workspace_settings").insert({
        workspace_id: state.workspaceId,
        ...settingsPatch,
        timezone: "Europe/London",
        currency: "USD",
        language: "en-GB",
        date_format: "DD/MM/YYYY",
        time_format: "24h",
      });
    }

    if (draft.companyDisplayName?.trim()) {
      await supabase
        .from("workspaces")
        .update({ name: draft.companyDisplayName.trim(), updated_at: now })
        .eq("id", state.workspaceId);
    }
  }

  if (draft.selectedModules) {
    const selected = new Set(
      draft.selectedModules
        .map((key) => key.trim())
        .filter((key) => ONBOARDING_MODULES.some((module) => module.id === key)),
    );

    for (const onboardingModule of ONBOARDING_MODULES) {
      const enabled = selected.has(onboardingModule.id);
      const { data: existing } = await supabase
        .from("workspace_modules")
        .select("id")
        .eq("workspace_id", state.workspaceId)
        .eq("module_key", onboardingModule.id)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("workspace_modules")
          .update({ enabled, updated_at: now })
          .eq("id", existing.id);
      } else if (enabled) {
        await supabase.from("workspace_modules").insert({
          workspace_id: state.workspaceId,
          module_key: onboardingModule.id,
          enabled: true,
        });
      }
    }
  }

  // Invite emails are collected in V1 for UX validation only — not sent.
  return getWorkspaceOnboardingState(slug);
}

export async function completeWorkspaceOnboarding(slug: string, draft?: WorkspaceOnboardingDraft) {
  if (draft) {
    await saveWorkspaceOnboardingDraft(slug, draft);
  }

  const state = await getWorkspaceOnboardingState(slug);
  if (!state) throw new Error("Workspace not found.");
  if (!isWorkspaceOnboardingPrototypeSlug(state.slug)) {
    throw new Error("Onboarding wizard is not enabled for this workspace.");
  }

  const supabase = requireSupabase();
  const { error } = await supabase
    .from("workspaces")
    .update({
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", state.workspaceId);

  if (error) throw new Error(error.message);

  return {
    ok: true as const,
    dashboardUrl: workspaceDashboardUrl(state.slug),
    centralUrl: CENTRAL_SITE_URL,
  };
}

export async function resetWorkspaceOnboarding(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (!isWorkspaceOnboardingPrototypeSlug(normalized)) {
    throw new Error("Onboarding reset is only available for prototype workspaces.");
  }

  const state = await getWorkspaceOnboardingState(normalized);
  if (!state) throw new Error("Workspace not found.");

  const supabase = requireSupabase();
  const { error } = await supabase
    .from("workspaces")
    .update({
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", state.workspaceId);

  if (error) throw new Error(error.message);
  return { ok: true as const, slug: state.slug, workspaceId: state.workspaceId };
}

export async function resetWorkspaceOnboardingForClient(clientId: string) {
  const supabase = requireSupabase();
  const { data: client, error } = await supabase
    .from("internal_clients")
    .select("id, company_name, platform_url, workspace_id")
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!client) throw new Error("Client not found.");

  let slug: string | null = null;

  if (client.workspace_id) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", client.workspace_id)
      .maybeSingle();
    slug = workspace?.slug ? String(workspace.slug) : null;
  }

  if (!slug && typeof client.platform_url === "string") {
    const match = client.platform_url.match(/https?:\/\/([a-z0-9-]+)\.unit311central\.com/i);
    if (match?.[1]) slug = match[1].toLowerCase();
  }

  if (!slug && String(client.company_name ?? "").toLowerCase().includes("fotheringham")) {
    slug = "fotheringham";
  }

  if (!slug || !isWorkspaceOnboardingPrototypeSlug(slug)) {
    throw new Error("No prototype onboarding workspace is linked to this client.");
  }

  return resetWorkspaceOnboarding(slug);
}

export async function resolveWorkspaceOnboardingRedirectForUser(user: {
  id: string;
  organisation_id?: string | null;
  email?: string | null;
  username?: string | null;
}): Promise<string | null> {
  const supabase = requireSupabase();

  // Prototype shortcut: always evaluate the fotheringham workspace when present.
  const { data: fotheringham, error: fotheringhamError } = await supabase
    .from("workspaces")
    .select("id, slug, status, onboarding_completed")
    .eq("slug", "fotheringham")
    .maybeSingle();

  if (fotheringhamError && fotheringhamError.message.includes("onboarding_completed")) {
    return null;
  }

  if (
    fotheringham &&
    isWorkspaceOnboardingPrototypeSlug(String(fotheringham.slug)) &&
    !fotheringham.onboarding_completed &&
    String(fotheringham.status ?? "").toLowerCase() === "active"
  ) {
    const workspaceId = String(fotheringham.id);

    const { data: membership } = await supabase
      .from("workspace_users")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      return workspaceOnboardingUrl("fotheringham");
    }

    if (user.organisation_id) {
      const { data: client } = await supabase
        .from("internal_clients")
        .select("id, company_name, workspace_id")
        .eq("platform_organisation_id", user.organisation_id)
        .maybeSingle();

      if (
        client &&
        (String(client.workspace_id ?? "") === workspaceId ||
          String(client.company_name ?? "").toLowerCase().includes("fotheringham"))
      ) {
        return workspaceOnboardingUrl("fotheringham");
      }
    }

    const identity = `${user.email ?? ""} ${user.username ?? ""}`.toLowerCase();
    if (identity.includes("demo@unit311central.com")) {
      const { data: demoClient } = await supabase
        .from("internal_clients")
        .select("id")
        .ilike("company_name", "%fotheringham%")
        .ilike("email", "demo@unit311central.com")
        .maybeSingle();
      if (demoClient) {
        return workspaceOnboardingUrl("fotheringham");
      }
    }
  }

  return null;
}

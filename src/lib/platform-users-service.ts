import {
  buildPlatformSession,
  createPlatformSessionToken,
  normalizePlatformUsername,
  verifyPlatformPassword,
  type PlatformSession,
  type PlatformUserRecord,
} from "@/lib/platform-auth";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveWorkspaceOnboardingRedirectForUser } from "@/lib/workspace-customer-onboarding-service";
import { formatWorkspaceDisplayStatus } from "@/lib/workspace-host";

function requirePlatformUsersSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  return createSupabaseServerClient();
}

function isActiveSubscriptionStatus(value: unknown) {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase() === "active"
  );
}

function isActiveAccountStatus(value: unknown) {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase() === "active"
  );
}

type SubscriptionGateClient = {
  id: string;
  subscription_status: string | null;
  account_status: string | null;
  workspace_id: string | null;
  platform_organisation_id: string | null;
};

async function findClientForSubscriptionGate(
  user: PlatformUserRecord,
  workspaceSlug?: string | null,
): Promise<{ client: SubscriptionGateClient | null; workspaceStatus: string | null }> {
  const supabase = requirePlatformUsersSupabase();
  const organisationId = user.organisation_id?.trim() || null;
  const userWorkspaceId = user.workspace_id?.trim() || null;
  const slug = workspaceSlug?.trim().toLowerCase() || null;

  let workspaceStatus: string | null = null;
  let workspaceId: string | null = userWorkspaceId;

  if (slug) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, status")
      .eq("slug", slug)
      .maybeSingle();
    if (workspace?.id) {
      workspaceId = String(workspace.id);
      workspaceStatus = workspace.status ? String(workspace.status) : null;
    }
  }

  const selectCols =
    "id, subscription_status, account_status, workspace_id, platform_organisation_id";

  if (organisationId) {
    const { data } = await supabase
      .from("internal_clients")
      .select(selectCols)
      .eq("platform_organisation_id", organisationId)
      .maybeSingle();
    if (data) {
      const client = data as SubscriptionGateClient;
      if (!workspaceId && client.workspace_id) workspaceId = String(client.workspace_id);
      if (workspaceId && workspaceStatus == null) {
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("status")
          .eq("id", workspaceId)
          .maybeSingle();
        workspaceStatus = workspace?.status ? String(workspace.status) : null;
      }
      return { client, workspaceStatus };
    }
  }

  if (workspaceId) {
    const { data } = await supabase
      .from("internal_clients")
      .select(selectCols)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (data) {
      if (workspaceStatus == null) {
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("status")
          .eq("id", workspaceId)
          .maybeSingle();
        workspaceStatus = workspace?.status ? String(workspace.status) : null;
      }
      return { client: data as SubscriptionGateClient, workspaceStatus };
    }
  }

  const { data: membership } = await supabase
    .from("workspace_users")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membership?.workspace_id) {
    const memberWorkspaceId = String(membership.workspace_id);
    const [{ data: client }, { data: workspace }] = await Promise.all([
      supabase
        .from("internal_clients")
        .select(selectCols)
        .eq("workspace_id", memberWorkspaceId)
        .maybeSingle(),
      supabase.from("workspaces").select("status").eq("id", memberWorkspaceId).maybeSingle(),
    ]);
    return {
      client: (client as SubscriptionGateClient | null) ?? null,
      workspaceStatus: workspace?.status ? String(workspace.status) : workspaceStatus,
    };
  }

  return { client: null, workspaceStatus };
}

/**
 * External users must complete payment before workspace access.
 * Gate uses client.subscription_status + workspace.status only —
 * never invoice paid status or organisation.payment_verified_at.
 * Test Activation sets subscription_status=active and workspace.status=Active
 * while leaving the invoice unpaid; that must unlock login the same as Wise.
 */
export async function resolveSubscriptionRedirectForUser(
  user: PlatformUserRecord,
  options?: { workspaceSlug?: string | null },
) {
  if (user.user_type !== "external") {
    return null;
  }

  try {
    const { client, workspaceStatus } = await findClientForSubscriptionGate(
      user,
      options?.workspaceSlug,
    );

    if (!client) {
      return "/payment";
    }

    const subscriptionActive = isActiveSubscriptionStatus(client.subscription_status);
    // Legacy rows may lack subscription_status after older CRM Active force-writes.
    const legacyActiveWithoutSubscriptionColumn =
      isActiveAccountStatus(client.account_status) && !client.subscription_status;

    if (!subscriptionActive && !legacyActiveWithoutSubscriptionColumn) {
      return "/payment";
    }

    if (workspaceStatus != null) {
      const display = formatWorkspaceDisplayStatus(workspaceStatus);
      if (display !== "Active") {
        return "/payment";
      }
    }

    return null;
  } catch {
    // Prefer sending external users to payment rather than granting access on errors.
    return "/payment";
  }
}

export async function findPlatformUserById(id: string) {
  const supabase = requirePlatformUsersSupabase();

  const { data, error } = await supabase
    .from("platform_users")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PlatformUserRecord | null) ?? null;
}

export async function findPlatformUsersByEmail(email: string) {
  const supabase = requirePlatformUsersSupabase();
  const normalized = normalizePlatformUsername(email);

  const { data: emailMatches, error: emailError } = await supabase
    .from("platform_users")
    .select("*")
    .eq("is_active", true)
    .eq("email", normalized);

  if (emailError && !emailError.message.includes("email")) {
    throw new Error(emailError.message);
  }

  const users = new Map<string, PlatformUserRecord>();
  for (const row of (emailMatches as PlatformUserRecord[] | null) ?? []) {
    users.set(row.id, row);
  }

  const { data: usernameMatches, error: usernameError } = await supabase
    .from("platform_users")
    .select("*")
    .eq("is_active", true)
    .eq("username", normalized);

  if (usernameError) {
    throw new Error(usernameError.message);
  }

  for (const row of (usernameMatches as PlatformUserRecord[] | null) ?? []) {
    users.set(row.id, row);
  }

  return [...users.values()];
}

export async function findPlatformUserByUsername(username: string) {
  const supabase = requirePlatformUsersSupabase();
  const normalized = normalizePlatformUsername(username);

  const { data, error } = await supabase
    .from("platform_users")
    .select("*")
    .eq("username", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PlatformUserRecord | null) ?? null;
}

export async function authenticatePlatformUser(username: string, password: string) {
  const normalized = normalizePlatformUsername(username);

  if (normalized.includes("@")) {
    const matches = await findPlatformUsersByEmail(normalized);
    for (const user of matches) {
      if (verifyPlatformPassword(password, user.password_hash)) {
        return user;
      }
    }
    return null;
  }

  const user = await findPlatformUserByUsername(normalized);
  if (!user || !verifyPlatformPassword(password, user.password_hash)) {
    return null;
  }

  return user;
}

export async function createSessionForUser(
  user: PlatformUserRecord,
  workspace?: { id: string; slug: string; name: string } | null,
) {
  const session = buildPlatformSession(user, workspace);
  return {
    session,
    token: await createPlatformSessionToken(session),
    redirectPath: user.redirect_path,
  };
}

export type LoginPlatformUserResult =
  | {
      session: PlatformSession;
      token: string;
      redirectPath: string;
    }
  | { forbidden: true };

export async function loginPlatformUser(
  username: string,
  password: string,
  options?: { workspaceSlug?: string | null },
): Promise<LoginPlatformUserResult | null> {
  const user = await authenticatePlatformUser(username, password);
  if (!user) {
    return null;
  }

  const { resolveWorkspaceBinding } = await import("@/lib/workspace-context");
  const { authorizeUserForWorkspace } = await import("@/lib/workspace-authorization");

  let workspace = await resolveWorkspaceBinding({
    workspaceSlug: options?.workspaceSlug,
    userWorkspaceId: user.workspace_id ?? null,
    fallbackInternal: user.user_type === "internal",
  });

  if (workspace) {
    const decision = await authorizeUserForWorkspace(user.id, workspace.id, {
      workspace,
      userTypeHint: user.user_type,
    });

    if (!decision.allowed) {
      // Explicit customer return_to host: never bind an unauthorised tenant.
      if (options?.workspaceSlug) {
        return { forbidden: true };
      }

      // No host return_to: fall back to the user's primary workspace when different.
      const primary = user.workspace_id
        ? await resolveWorkspaceBinding({
            userWorkspaceId: user.workspace_id,
            fallbackInternal: false,
          })
        : null;
      if (primary && primary.id !== workspace.id) {
        const primaryDecision = await authorizeUserForWorkspace(user.id, primary.id, {
          workspace: primary,
          userTypeHint: user.user_type,
        });
        workspace = primaryDecision.allowed ? primary : null;
      } else {
        workspace = null;
      }
    }
  }

  const session = await createSessionForUser(user, workspace);
  const subscriptionRedirect = await resolveSubscriptionRedirectForUser(user, {
    workspaceSlug: options?.workspaceSlug,
  });
  if (subscriptionRedirect) {
    return {
      ...session,
      redirectPath: subscriptionRedirect,
    };
  }

  try {
    const onboardingRedirect = await resolveWorkspaceOnboardingRedirectForUser({
      id: user.id,
      organisation_id: user.organisation_id ?? null,
      email: user.email ?? null,
      username: user.username,
    });
    if (onboardingRedirect) {
      return {
        ...session,
        redirectPath: onboardingRedirect,
      };
    }
  } catch {
    // Non-blocking — fall through to default redirect.
  }

  return session;
}

export type { PlatformSession, PlatformUserRecord };

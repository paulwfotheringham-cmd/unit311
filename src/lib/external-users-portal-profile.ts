/** Workspace-local portal profile overlays for External Users (until entitlements API). */

export const EXTERNAL_USER_PORTAL_MODULES = [
  "Clients",
  "Projects",
  "Files",
  "Reports",
  "Invoices",
  "Support",
  "Documents",
  "Messaging",
  "Calendar",
  "Engineering",
  "Training",
  "QMS",
] as const;

export type ExternalUserPortalModule = (typeof EXTERNAL_USER_PORTAL_MODULES)[number];

export const EXTERNAL_USER_ROLES = [
  "Administrator",
  "Manager",
  "Contributor",
  "Viewer",
] as const;

export type ExternalUserRole = (typeof EXTERNAL_USER_ROLES)[number];

export type ExternalUserActivityKind =
  | "Invitation sent"
  | "Accepted"
  | "Password changed"
  | "Logged in"
  | "Permission updated"
  | "Password reset"
  | "Disabled"
  | "Enabled"
  | "Unlocked"
  | "Client assigned"
  | "Force password change"
  | "Sessions expired";

export type ExternalUserActivityEvent = {
  id: string;
  at: string;
  kind: ExternalUserActivityKind;
  detail: string;
};

export type ExternalUserPortalProfile = {
  role: ExternalUserRole;
  department: string;
  phone: string;
  modules: ExternalUserPortalModule[];
  mfaEnabled: boolean;
  forcePasswordChange: boolean;
  invitationStatus: "None" | "Sent" | "Accepted";
  failedLoginAttempts: number;
  activity: ExternalUserActivityEvent[];
};

const STORAGE_KEY = "unit311-external-user-portal-profiles";

function emptyProfile(): ExternalUserPortalProfile {
  return {
    role: "Contributor",
    department: "",
    phone: "",
    modules: ["Projects", "Files", "Support", "Documents"],
    mfaEnabled: false,
    forcePasswordChange: false,
    invitationStatus: "None",
    failedLoginAttempts: 0,
    activity: [],
  };
}

function readAll(): Record<string, ExternalUserPortalProfile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ExternalUserPortalProfile>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, ExternalUserPortalProfile>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getExternalUserPortalProfile(userId: string): ExternalUserPortalProfile {
  const all = readAll();
  return all[userId] ? { ...emptyProfile(), ...all[userId] } : emptyProfile();
}

export function saveExternalUserPortalProfile(
  userId: string,
  patch: Partial<ExternalUserPortalProfile>,
) {
  const all = readAll();
  const next = { ...getExternalUserPortalProfile(userId), ...patch };
  all[userId] = next;
  writeAll(all);
  return next;
}

export function appendExternalUserActivity(
  userId: string,
  kind: ExternalUserActivityKind,
  detail: string,
) {
  const profile = getExternalUserPortalProfile(userId);
  const event: ExternalUserActivityEvent = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    kind,
    detail,
  };
  return saveExternalUserPortalProfile(userId, {
    activity: [event, ...profile.activity].slice(0, 40),
  });
}

export function countPasswordResetsLast30Days() {
  const all = readAll();
  const cutoff = Date.now() - 30 * 86_400_000;
  let count = 0;
  for (const profile of Object.values(all)) {
    for (const event of profile.activity ?? []) {
      if (event.kind === "Password reset" && Date.parse(event.at) >= cutoff) count += 1;
    }
  }
  return count;
}

export function defaultModulesForRole(role: ExternalUserRole): ExternalUserPortalModule[] {
  switch (role) {
    case "Administrator":
      return [...EXTERNAL_USER_PORTAL_MODULES];
    case "Manager":
      return [
        "Clients",
        "Projects",
        "Files",
        "Reports",
        "Invoices",
        "Support",
        "Documents",
        "Messaging",
        "Calendar",
        "Training",
      ];
    case "Contributor":
      return ["Projects", "Files", "Support", "Documents", "Messaging", "Calendar"];
    case "Viewer":
      return ["Projects", "Files", "Documents", "Reports"];
  }
}

export type ExternalUser = {
  id: string;
  name: string;
  /** Display cache — prefer Client Directory name when clientId is set. */
  organisation: string;
  /** FK → internal_clients.id (null = unlinked legacy row). */
  clientId: string | null;
  username: string;
  /** Optional platform email (migration 046). */
  email: string | null;
  lastLoggedIn: string | null;
  isActive: boolean;
  redirectPath: string;
  createdAt?: string | null;
};

type DbPlatformUser = {
  id: string;
  username: string;
  display_name: string;
  user_type: string;
  redirect_path: string;
  client_name: string | null;
  client_id?: string | null;
  email?: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export function mapExternalUser(
  row: DbPlatformUser,
  clientCompanyName?: string | null,
): ExternalUser {
  const clientId = row.client_id?.trim() || null;
  const organisation =
    (clientCompanyName?.trim() || row.client_name?.trim() || "") || "";

  return {
    id: row.id,
    name: row.display_name,
    organisation,
    clientId,
    username: row.username,
    email: row.email?.trim() || null,
    lastLoggedIn: row.last_login_at,
    isActive: row.is_active,
    redirectPath: row.redirect_path,
    createdAt: row.created_at ?? null,
  };
}

export function formatExternalUserLastLogin(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function createBlankExternalUserInput() {
  return {
    name: "",
    organisation: "",
    clientId: "",
    username: "",
    email: "",
    redirectPath: "/client/venturi",
  };
}

export function externalUserStatusClass(active: boolean) {
  return active
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
    : "border-rose-400/30 bg-rose-500/10 text-rose-100";
}

export function externalUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

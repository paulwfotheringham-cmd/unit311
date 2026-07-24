"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";

import { useInternalOperationsBasePath } from "@/components/testflighthub/InternalOperationsBasePathContext";
import {
  WsEmpty,
  WsInputClass,
  WsKpiTile,
  WsLabelClass,
  WsPrimaryButtonClass,
  WsSecondaryButtonClass,
  WsStatusPill,
} from "@/components/testflighthub/domain-workspace-ui";
import type { ManagedClient } from "@/lib/client-management-data";
import {
  externalUserInitials,
  externalUserStatusClass,
  formatExternalUserLastLogin,
  type ExternalUser,
} from "@/lib/external-users-data";
import {
  appendExternalUserActivity,
  countPasswordResetsLast30Days,
  defaultModulesForRole,
  EXTERNAL_USER_PORTAL_MODULES,
  EXTERNAL_USER_ROLES,
  getExternalUserPortalProfile,
  saveExternalUserPortalProfile,
  type ExternalUserPortalModule,
  type ExternalUserPortalProfile,
  type ExternalUserRole,
} from "@/lib/external-users-portal-profile";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import { cn } from "@/lib/utils";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

type DraftUser = {
  name: string;
  email: string;
  username: string;
  clientId: string;
  role: ExternalUserRole;
  department: string;
  phone: string;
  isActive: boolean;
  mfaEnabled: boolean;
  modules: ExternalUserPortalModule[];
  forcePasswordChange: boolean;
};

type InviteDraft = {
  step: 1 | 2 | 3 | 4;
  clientId: string;
  name: string;
  email: string;
  role: ExternalUserRole;
  phone: string;
  modules: ExternalUserPortalModule[];
};

type StatusFilter = "all" | "active" | "disabled" | "unlinked";
type LoginFilter = "all" | "today" | "never" | "7d";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isLoginToday(value: string | null) {
  if (!value) return false;
  const at = new Date(value);
  return !Number.isNaN(at.getTime()) && at >= startOfToday();
}

function isLoginWithinDays(value: string | null, days: number) {
  if (!value) return false;
  const at = Date.parse(value);
  if (Number.isNaN(at)) return false;
  return at >= Date.now() - days * 86_400_000;
}

function toDraft(user: ExternalUser, profile: ExternalUserPortalProfile): DraftUser {
  return {
    name: user.name,
    email: user.email ?? "",
    username: user.username,
    clientId: user.clientId ?? "",
    role: profile.role,
    department: profile.department,
    phone: profile.phone,
    isActive: user.isActive,
    mfaEnabled: profile.mfaEnabled,
    modules: [...profile.modules],
    forcePasswordChange: profile.forcePasswordChange,
  };
}

function draftsEqual(a: DraftUser, b: DraftUser) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function usernameFromEmail(email: string) {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  return local.replace(/[^a-z0-9._-]/g, "").slice(0, 32) || `user${Date.now().toString().slice(-6)}`;
}

function exportUsersCsv(users: ExternalUser[]) {
  const header = ["id", "name", "email", "username", "client", "active", "lastLogin", "createdAt"];
  const rows = users.map((user) =>
    [
      user.id,
      user.name,
      user.email ?? "",
      user.username,
      user.organisation,
      user.isActive ? "active" : "disabled",
      user.lastLoggedIn ?? "",
      user.createdAt ?? "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `external-users-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ExternalUsersWorkspace() {
  const basePath = useInternalOperationsBasePath();
  const clientsHref = getInternalNavHref("clients", basePath);

  const [users, setUsers] = useState<ExternalUser[]>([]);
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftUser | null>(null);
  const [baseline, setBaseline] = useState<DraftUser | null>(null);
  const [profileTick, setProfileTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterRole, setFilterRole] = useState<"all" | ExternalUserRole>("all");
  const [filterLogin, setFilterLogin] = useState<LoginFilter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [assignClientOpen, setAssignClientOpen] = useState(false);
  const [invite, setInvite] = useState<InviteDraft>({
    step: 1,
    clientId: "",
    name: "",
    email: "",
    role: "Contributor",
    phone: "",
    modules: defaultModulesForRole("Contributor"),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, clientsRes] = await Promise.all([
        fetch("/api/external-users", { cache: "no-store" }),
        fetch("/api/clients", { cache: "no-store" }),
      ]);
      const usersData = await readApiJson<{ users?: ExternalUser[]; error?: string }>(usersRes);
      if (!usersRes.ok) throw new Error(usersData.error ?? "Failed to load external users");
      const nextUsers = usersData.users ?? [];
      setUsers(nextUsers);

      if (clientsRes.ok) {
        const clientsData = await readApiJson<{ clients?: ManagedClient[] }>(clientsRes);
        setClients(clientsData.clients ?? []);
      } else {
        setClients([]);
      }

      setSelectedId((current) => {
        if (current && nextUsers.some((user) => user.id === current)) return current;
        return nextUsers[0]?.id ?? null;
      });
      setProfileTick((n) => n + 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => users.find((user) => user.id === selectedId) ?? null,
    [users, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setBaseline(null);
      return;
    }
    const profile = getExternalUserPortalProfile(selected.id);
    const next = toDraft(selected, profile);
    setDraft(next);
    setBaseline(next);
    setDeleteConfirm(false);
  }, [selected, profileTick]);

  const dirty = Boolean(draft && baseline && !draftsEqual(draft, baseline));

  const kpis = useMemo(() => {
    const active = users.filter((user) => user.isActive).length;
    const pending = users.filter(
      (user) => getExternalUserPortalProfile(user.id).invitationStatus === "Sent",
    ).length;
    const locked = users.filter((user) => !user.isActive).length;
    const lastLoginToday = users.filter((user) => isLoginToday(user.lastLoggedIn)).length;
    return {
      total: users.length,
      active,
      pending,
      locked,
      resets30: countPasswordResetsLast30Days(),
      lastLoginToday,
    };
  }, [users, profileTick]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const profile = getExternalUserPortalProfile(user.id);
      if (filterClient !== "all" && user.clientId !== filterClient) return false;
      if (filterStatus === "active" && !user.isActive) return false;
      if (filterStatus === "disabled" && user.isActive) return false;
      if (filterStatus === "unlinked" && user.clientId) return false;
      if (filterRole !== "all" && profile.role !== filterRole) return false;
      if (filterLogin === "today" && !isLoginToday(user.lastLoggedIn)) return false;
      if (filterLogin === "never" && user.lastLoggedIn) return false;
      if (filterLogin === "7d" && !isLoginWithinDays(user.lastLoggedIn, 7)) return false;
      if (!q) return true;
      const hay = [
        user.name,
        user.email,
        user.username,
        user.organisation,
        profile.role,
        profile.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [users, search, filterClient, filterStatus, filterRole, filterLogin, profileTick]);

  const activity = useMemo(() => {
    if (!selected) return [];
    const profile = getExternalUserPortalProfile(selected.id);
    const derived = [];
    if (selected.createdAt) {
      derived.push({
        id: `derived-created-${selected.id}`,
        at: selected.createdAt,
        kind: "Accepted" as const,
        detail: "Account provisioned in platform_users",
      });
    }
    if (selected.lastLoggedIn) {
      derived.push({
        id: `derived-login-${selected.id}`,
        at: selected.lastLoggedIn,
        kind: "Logged in" as const,
        detail: "Successful portal login",
      });
    }
    return [...profile.activity, ...derived].sort(
      (a, b) => Date.parse(b.at) - Date.parse(a.at),
    );
  }, [selected, profileTick]);

  async function patchUser(id: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/external-users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readApiJson<{ user?: ExternalUser; error?: string }>(response);
    if (!response.ok || !data.user) throw new Error(data.error ?? "Update failed");
    return data.user;
  }

  async function saveDraft() {
    if (!selected || !draft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await patchUser(selected.id, {
        name: draft.name,
        email: draft.email || null,
        username: draft.username,
        clientId: draft.clientId || selected.clientId,
        isActive: draft.isActive,
      });
      saveExternalUserPortalProfile(selected.id, {
        role: draft.role,
        department: draft.department,
        phone: draft.phone,
        modules: draft.modules,
        mfaEnabled: draft.mfaEnabled,
        forcePasswordChange: draft.forcePasswordChange,
      });
      if (baseline && draft.modules.join() !== baseline.modules.join()) {
        appendExternalUserActivity(selected.id, "Permission updated", "Portal module access changed");
      }
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      setProfileTick((n) => n + 1);
      setNotice("Changes saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function setActive(next: boolean) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await patchUser(selected.id, { isActive: next });
      appendExternalUserActivity(
        selected.id,
        next ? "Enabled" : "Disabled",
        next ? "Account enabled" : "Account disabled",
      );
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      setProfileTick((n) => n + 1);
      setNotice(next ? "Account enabled." : "Account disabled.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/external-users/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password" }),
      });
      const data = await readApiJson<{ temporaryPassword?: string; error?: string }>(response);
      if (!response.ok || !data.temporaryPassword) {
        throw new Error(data.error ?? "Password reset failed");
      }
      appendExternalUserActivity(selected.id, "Password reset", "Administrator reset password");
      setProfileTick((n) => n + 1);
      setNotice(`Temporary password: ${data.temporaryPassword}`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/external-users/${selected.id}`, { method: "DELETE" });
      const data = await readApiJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Delete failed");
      setUsers((current) => current.filter((user) => user.id !== selected.id));
      setSelectedId(null);
      setDeleteConfirm(false);
      setNotice("User deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function assignClient(clientId: string) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await patchUser(selected.id, { clientId });
      appendExternalUserActivity(selected.id, "Client assigned", "Linked to Client Directory");
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      setAssignClientOpen(false);
      setProfileTick((n) => n + 1);
      setNotice("Client linked.");
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendInvite() {
    if (!invite.clientId || !invite.name.trim() || !invite.email.trim()) {
      setError("Client, name, and email are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const username = usernameFromEmail(invite.email);
      const response = await fetch("/api/external-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: invite.name.trim(),
          email: invite.email.trim(),
          username,
          clientId: invite.clientId,
        }),
      });
      const data = await readApiJson<{
        user?: ExternalUser;
        temporaryPassword?: string;
        error?: string;
      }>(response);
      if (!response.ok || !data.user) throw new Error(data.error ?? "Invite failed");

      saveExternalUserPortalProfile(data.user.id, {
        role: invite.role,
        phone: invite.phone,
        modules: invite.modules,
        invitationStatus: "Sent",
      });
      appendExternalUserActivity(
        data.user.id,
        "Invitation sent",
        `Invite queued for ${invite.email.trim()} (email mocked)`,
      );
      setUsers((current) => [data.user!, ...current]);
      setSelectedId(data.user.id);
      setInviteOpen(false);
      setInvite({
        step: 1,
        clientId: "",
        name: "",
        email: "",
        role: "Contributor",
        phone: "",
        modules: defaultModulesForRole("Contributor"),
      });
      setProfileTick((n) => n + 1);
      setNotice(
        `Invitation created for ${data.user.name}. Temporary password: ${data.temporaryPassword ?? "—"} (email delivery mocked).`,
      );
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendBulkInvite() {
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!invite.clientId) {
      setError("Choose a client for bulk invite.");
      return;
    }
    if (lines.length === 0) {
      setError("Paste one email per line.");
      return;
    }
    setBusy(true);
    setError(null);
    let created = 0;
    try {
      for (const email of lines) {
        const name = email.split("@")[0] ?? email;
        const response = await fetch("/api/external-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            username: usernameFromEmail(email),
            clientId: invite.clientId,
          }),
        });
        const data = await readApiJson<{ user?: ExternalUser; error?: string }>(response);
        if (!response.ok || !data.user) continue;
        saveExternalUserPortalProfile(data.user.id, {
          role: "Contributor",
          modules: defaultModulesForRole("Contributor"),
          invitationStatus: "Sent",
        });
        appendExternalUserActivity(
          data.user.id,
          "Invitation sent",
          `Bulk invite queued for ${email} (email mocked)`,
        );
        created += 1;
      }
      await load();
      setBulkOpen(false);
      setBulkText("");
      setNotice(`Bulk invite created ${created} user${created === 1 ? "" : "s"} (email mocked).`);
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Bulk invite failed");
    } finally {
      setBusy(false);
    }
  }

  const selectedClient = clients.find((client) => client.id === (draft?.clientId || selected?.clientId));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-end gap-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={WsPrimaryButtonClass(busy)} onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            Invite User
          </button>
          <button
            type="button"
            className={WsSecondaryButtonClass(busy)}
            onClick={() => {
              setBulkOpen(true);
              setInvite((current) => ({ ...current, clientId: current.clientId || clients[0]?.id || "" }));
            }}
          >
            <Mail className="h-3.5 w-3.5" />
            Bulk Invite
          </button>
          <button
            type="button"
            className={WsSecondaryButtonClass(users.length === 0)}
            onClick={() => exportUsersCsv(filteredUsers)}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button type="button" className={WsSecondaryButtonClass(loading || busy)} onClick={() => void load()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <WsKpiTile label="Total External Users" value={kpis.total} />
        <WsKpiTile label="Active Users" value={kpis.active} />
        <WsKpiTile label="Pending Invitations" value={kpis.pending} />
        <WsKpiTile label="Locked Accounts" value={kpis.locked} />
        <WsKpiTile
          label="Password Resets (30d)"
          value={kpis.resets30}
          hint={kpis.resets30 === 0 ? "No resets recorded yet" : undefined}
        />
        <WsKpiTile label="Last Login Today" value={kpis.lastLoginToday} />
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-[#0b1524]/70 p-2.5 lg:grid-cols-6">
        <label className="lg:col-span-2">
          <span className={WsLabelClass()}>Search</span>
          <input
            className={WsInputClass()}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, company, role…"
          />
        </label>
        <label>
          <span className={WsLabelClass()}>Client</span>
          <select className={WsInputClass()} value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="all">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={WsLabelClass()}>Status</span>
          <select
            className={WsInputClass()}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled / Locked</option>
            <option value="unlinked">Not linked</option>
          </select>
        </label>
        <label>
          <span className={WsLabelClass()}>Role</span>
          <select
            className={WsInputClass()}
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as "all" | ExternalUserRole)}
          >
            <option value="all">All roles</option>
            {EXTERNAL_USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={WsLabelClass()}>Last login</span>
          <select
            className={WsInputClass()}
            value={filterLogin}
            onChange={(e) => setFilterLogin(e.target.value as LoginFilter)}
          >
            <option value="all">Any</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="never">Never</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-50">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[20rem] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <Loader2 className="h-5 w-5 animate-spin text-sky-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-5 xl:items-start">
          {/* LEFT 40% */}
          <div className="xl:col-span-2">
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_20px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
                <div className="flex items-center gap-2 text-white">
                  <Users className="h-4 w-4 text-sky-300" />
                  <span className="text-sm font-semibold">Users</span>
                </div>
                <span className="text-[11px] text-white/40">{filteredUsers.length}</span>
              </div>
              <div className="max-h-[70vh] space-y-1.5 overflow-y-auto p-2">
                {filteredUsers.length === 0 ? (
                  <WsEmpty message="No external users match these filters." />
                ) : (
                  filteredUsers.map((user) => {
                    const profile = getExternalUserPortalProfile(user.id);
                    const active = selectedId === user.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedId(user.id)}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
                          active
                            ? "border-sky-400/40 bg-sky-500/15"
                            : "border-white/10 bg-[#0b1524]/70 hover:border-white/20 hover:bg-white/[0.04]",
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-xs font-semibold text-sky-100">
                          {externalUserInitials(user.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-white">{user.name}</span>
                            <WsStatusPill className={externalUserStatusClass(user.isActive)}>
                              {user.isActive ? "Active" : "Locked"}
                            </WsStatusPill>
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-white/55">
                            {user.organisation || "Not linked"} · {profile.role}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-white/40">
                            {user.email || `@${user.username}`}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-white/35">
                            Last login {formatExternalUserLastLogin(user.lastLoggedIn)} · Portal{" "}
                            {user.isActive ? "Enabled" : "Disabled"}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT 60% */}
          <div className="xl:col-span-3">
            {!selected || !draft ? (
              <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-8">
                <WsEmpty message="Select a user to manage identity, permissions, and security." />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      User details
                    </p>
                    <h2 className="text-lg font-semibold text-white">{draft.name || selected.name}</h2>
                    <p className="text-xs text-white/45">
                      {selected.organisation || "Client not linked"} · @{draft.username}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {dirty ? (
                      <WsStatusPill className="border-amber-400/30 bg-amber-500/10 text-amber-100">
                        Unsaved changes
                      </WsStatusPill>
                    ) : (
                      <WsStatusPill className="border-emerald-400/30 bg-emerald-500/10 text-emerald-100">
                        Saved
                      </WsStatusPill>
                    )}
                    <button
                      type="button"
                      className={WsPrimaryButtonClass(busy || !dirty)}
                      onClick={() => void saveDraft()}
                    >
                      Save
                    </button>
                  </div>
                </div>

                <DetailSection title="General">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
                    <Field label="Email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
                    <Field
                      label="Username"
                      value={draft.username}
                      onChange={(v) => setDraft({ ...draft, username: v })}
                    />
                    <label>
                      <span className={WsLabelClass()}>Role</span>
                      <select
                        className={WsInputClass()}
                        value={draft.role}
                        onChange={(e) => {
                          const role = e.target.value as ExternalUserRole;
                          setDraft({
                            ...draft,
                            role,
                            modules: defaultModulesForRole(role),
                          });
                        }}
                      >
                        {EXTERNAL_USER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Department"
                      value={draft.department}
                      onChange={(v) => setDraft({ ...draft, department: v })}
                    />
                    <Field
                      label="Phone"
                      value={draft.phone}
                      onChange={(v) => setDraft({ ...draft, phone: v })}
                    />
                  </div>
                </DetailSection>

                <DetailSection title="Client link">
                  <div className="flex flex-wrap items-center gap-2">
                    <WsStatusPill
                      className={
                        selected.clientId
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                          : "border-amber-400/30 bg-amber-500/10 text-amber-100"
                      }
                    >
                      {selected.clientId ? "Linked" : "Not Linked"}
                    </WsStatusPill>
                    <span className="text-sm text-white/70">
                      {selectedClient?.companyName || selected.organisation || "No client assigned"}
                    </span>
                    <button
                      type="button"
                      className={WsSecondaryButtonClass(busy)}
                      onClick={() => setAssignClientOpen(true)}
                    >
                      Assign Client
                    </button>
                    <Link href={clientsHref} className={WsSecondaryButtonClass()}>
                      Open Client Directory
                    </Link>
                  </div>
                </DetailSection>

                <DetailSection title="Portal access">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <InfoChip label="Portal" value={draft.isActive ? "Enabled" : "Disabled"} />
                    <InfoChip label="MFA" value={draft.mfaEnabled ? "Enabled" : "Disabled"} />
                    <InfoChip
                      label="Password"
                      value={draft.forcePasswordChange ? "Must change" : "Valid"}
                    />
                    <InfoChip label="Last login" value={formatExternalUserLastLogin(selected.lastLoggedIn)} />
                    <InfoChip
                      label="Failed logins"
                      value={String(getExternalUserPortalProfile(selected.id).failedLoginAttempts)}
                    />
                    <InfoChip
                      label="Created"
                      value={
                        selected.createdAt
                          ? formatExternalUserLastLogin(selected.createdAt)
                          : "—"
                      }
                    />
                    <InfoChip
                      label="Invitation"
                      value={getExternalUserPortalProfile(selected.id).invitationStatus}
                    />
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm text-white/75">
                    <input
                      type="checkbox"
                      checked={draft.mfaEnabled}
                      onChange={(e) => setDraft({ ...draft, mfaEnabled: e.target.checked })}
                    />
                    MFA enabled (portal profile)
                  </label>
                </DetailSection>

                <DetailSection
                  title="Permissions"
                  subtitle="Module switches control portal visibility for this user."
                >
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {EXTERNAL_USER_PORTAL_MODULES.map((moduleName) => {
                      const on = draft.modules.includes(moduleName);
                      return (
                        <label
                          key={moduleName}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0b1524]/60 px-2.5 py-2 text-sm text-white/80"
                        >
                          <span>{moduleName}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            onClick={() =>
                              setDraft({
                                ...draft,
                                modules: on
                                  ? draft.modules.filter((m) => m !== moduleName)
                                  : [...draft.modules, moduleName],
                              })
                            }
                            className={cn(
                              "relative h-6 w-10 rounded-full border transition-colors",
                              on
                                ? "border-sky-400/50 bg-sky-500/40"
                                : "border-white/15 bg-white/10",
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                                on ? "left-5" : "left-0.5",
                              )}
                            />
                          </button>
                        </label>
                      );
                    })}
                  </div>
                </DetailSection>

                <DetailSection title="Client access">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <InfoChip label="Linked client" value={selectedClient?.companyName || "—"} />
                    <InfoChip label="Workspace" value={selectedClient ? "Client portal" : "—"} />
                    <InfoChip
                      label="Assigned projects"
                      value={draft.modules.includes("Projects") ? "Visible" : "Hidden"}
                    />
                    <InfoChip
                      label="Visible folders"
                      value={draft.modules.includes("Files") ? "Files module on" : "Hidden"}
                    />
                    <InfoChip
                      label="Support access"
                      value={draft.modules.includes("Support") ? "Enabled" : "Disabled"}
                    />
                    <InfoChip
                      label="Report access"
                      value={draft.modules.includes("Reports") ? "Enabled" : "Disabled"}
                    />
                  </div>
                </DetailSection>

                <DetailSection title="Security">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={WsSecondaryButtonClass(busy)} onClick={() => void resetPassword()}>
                      <KeyRound className="h-3.5 w-3.5" />
                      Reset Password
                    </button>
                    <button
                      type="button"
                      className={WsSecondaryButtonClass(busy)}
                      onClick={() => {
                        appendExternalUserActivity(
                          selected.id,
                          "Invitation sent",
                          "Re-sent invitation (email mocked)",
                        );
                        saveExternalUserPortalProfile(selected.id, { invitationStatus: "Sent" });
                        setProfileTick((n) => n + 1);
                        setNotice("Invitation re-queued (email mocked).");
                      }}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Send Invite
                    </button>
                    {draft.isActive ? (
                      <button type="button" className={WsSecondaryButtonClass(busy)} onClick={() => void setActive(false)}>
                        <Lock className="h-3.5 w-3.5" />
                        Disable Account
                      </button>
                    ) : (
                      <button type="button" className={WsSecondaryButtonClass(busy)} onClick={() => void setActive(true)}>
                        <Unlock className="h-3.5 w-3.5" />
                        Enable Account
                      </button>
                    )}
                    <button
                      type="button"
                      className={WsSecondaryButtonClass(busy || selected.isActive)}
                      onClick={() => void setActive(true)}
                    >
                      Unlock Account
                    </button>
                    <button
                      type="button"
                      className={WsSecondaryButtonClass(busy)}
                      onClick={() => {
                        setDraft({ ...draft, forcePasswordChange: true });
                        appendExternalUserActivity(
                          selected.id,
                          "Force password change",
                          "User must change password next login",
                        );
                        setProfileTick((n) => n + 1);
                      }}
                    >
                      Force Password Change
                    </button>
                    <button
                      type="button"
                      className={WsSecondaryButtonClass(busy)}
                      onClick={() => {
                        appendExternalUserActivity(
                          selected.id,
                          "Sessions expired",
                          "Administrator expired active sessions",
                        );
                        setProfileTick((n) => n + 1);
                        setNotice("Sessions marked expired (client must re-authenticate).");
                      }}
                    >
                      Expire Sessions
                    </button>
                    <button
                      type="button"
                      className={cn(WsSecondaryButtonClass(busy), "border-rose-400/30 text-rose-100")}
                      onClick={() => setDeleteConfirm(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete User
                    </button>
                  </div>
                  {deleteConfirm ? (
                    <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3">
                      <p className="text-sm text-rose-50">
                        Delete {selected.name}? This permanently removes the portal identity.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" className={WsPrimaryButtonClass(busy)} onClick={() => void deleteUser()}>
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          className={WsSecondaryButtonClass()}
                          onClick={() => setDeleteConfirm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </DetailSection>

                <DetailSection title="Activity timeline">
                  {activity.length === 0 ? (
                    <WsEmpty message="No activity recorded yet." />
                  ) : (
                    <ul className="space-y-2">
                      {activity.map((event) => (
                        <li
                          key={event.id}
                          className="rounded-lg border border-white/10 bg-[#0b1524]/60 px-2.5 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-sky-200">{event.kind}</span>
                            <span className="text-[10px] text-white/35">
                              {formatExternalUserLastLogin(event.at)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-white/55">{event.detail}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </DetailSection>
              </div>
            )}
          </div>
        </div>
      )}

      {inviteOpen ? (
        <Modal title="Invite portal user" onClose={() => setInviteOpen(false)}>
          <div className="mb-3 flex gap-2 text-[11px] uppercase tracking-[0.1em] text-white/40">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={cn(
                  "rounded-md border px-2 py-1",
                  invite.step === step
                    ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                    : "border-white/10",
                )}
              >
                Step {step}
              </span>
            ))}
          </div>
          {invite.step === 1 ? (
            <label className="block">
              <span className={WsLabelClass()}>Choose client</span>
              <select
                className={WsInputClass()}
                value={invite.clientId}
                onChange={(e) => setInvite({ ...invite, clientId: e.target.value })}
              >
                <option value="">Select client…</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {invite.step === 2 ? (
            <div className="space-y-2">
              <Field label="Name" value={invite.name} onChange={(v) => setInvite({ ...invite, name: v })} />
              <Field label="Email" value={invite.email} onChange={(v) => setInvite({ ...invite, email: v })} />
              <label>
                <span className={WsLabelClass()}>Role</span>
                <select
                  className={WsInputClass()}
                  value={invite.role}
                  onChange={(e) => {
                    const role = e.target.value as ExternalUserRole;
                    setInvite({ ...invite, role, modules: defaultModulesForRole(role) });
                  }}
                >
                  {EXTERNAL_USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Phone" value={invite.phone} onChange={(v) => setInvite({ ...invite, phone: v })} />
            </div>
          ) : null}
          {invite.step === 3 ? (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {EXTERNAL_USER_PORTAL_MODULES.map((moduleName) => {
                const on = invite.modules.includes(moduleName);
                return (
                  <label
                    key={moduleName}
                    className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-sm text-white/80"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setInvite({
                          ...invite,
                          modules: on
                            ? invite.modules.filter((m) => m !== moduleName)
                            : [...invite.modules, moduleName],
                        })
                      }
                    />
                    {moduleName}
                  </label>
                );
              })}
            </div>
          ) : null}
          {invite.step === 4 ? (
            <div className="space-y-1 text-sm text-white/70">
              <p>
                <span className="text-white/40">Client:</span>{" "}
                {clients.find((c) => c.id === invite.clientId)?.companyName || "—"}
              </p>
              <p>
                <span className="text-white/40">Name:</span> {invite.name || "—"}
              </p>
              <p>
                <span className="text-white/40">Email:</span> {invite.email || "—"}
              </p>
              <p>
                <span className="text-white/40">Role:</span> {invite.role}
              </p>
              <p>
                <span className="text-white/40">Modules:</span> {invite.modules.join(", ") || "None"}
              </p>
              <p className="pt-2 text-xs text-amber-100/80">
                Invitation email delivery is mocked. Account is created immediately with a temporary password.
              </p>
            </div>
          ) : null}
          <div className="mt-4 flex justify-between gap-2">
            <button
              type="button"
              className={WsSecondaryButtonClass(invite.step === 1)}
              onClick={() => setInvite((current) => ({ ...current, step: (current.step - 1) as InviteDraft["step"] }))}
            >
              Back
            </button>
            {invite.step < 4 ? (
              <button
                type="button"
                className={WsPrimaryButtonClass()}
                onClick={() =>
                  setInvite((current) => ({ ...current, step: (current.step + 1) as InviteDraft["step"] }))
                }
              >
                Continue
              </button>
            ) : (
              <button type="button" className={WsPrimaryButtonClass(busy)} onClick={() => void sendInvite()}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Invite
              </button>
            )}
          </div>
        </Modal>
      ) : null}

      {bulkOpen ? (
        <Modal title="Bulk invite" onClose={() => setBulkOpen(false)}>
          <label className="block">
            <span className={WsLabelClass()}>Client</span>
            <select
              className={WsInputClass()}
              value={invite.clientId}
              onChange={(e) => setInvite({ ...invite, clientId: e.target.value })}
            >
              <option value="">Select client…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block">
            <span className={WsLabelClass()}>Emails (one per line)</span>
            <textarea
              className={cn(WsInputClass(), "min-h-36 font-mono text-xs")}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"user1@client.com\nuser2@client.com"}
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={WsSecondaryButtonClass()} onClick={() => setBulkOpen(false)}>
              Cancel
            </button>
            <button type="button" className={WsPrimaryButtonClass(busy)} onClick={() => void sendBulkInvite()}>
              Create invitations
            </button>
          </div>
        </Modal>
      ) : null}

      {assignClientOpen && selected ? (
        <Modal title="Assign client" onClose={() => setAssignClientOpen(false)}>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#0b1524]/70 px-3 py-2 text-left text-sm text-white hover:border-sky-400/40"
                onClick={() => void assignClient(client.id)}
              >
                <span>{client.companyName}</span>
                <span className="text-[10px] text-white/40">{client.accountStatus}</span>
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function DetailSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.04] px-3.5 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
      <div className="mb-2.5 flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-sky-300/80" />
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle ? <p className="text-[11px] text-white/40">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className={WsLabelClass()}>{label}</span>
      <input className={WsInputClass()} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b1524]/70 px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="mt-0.5 text-sm text-white">{value}</p>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0b1524] p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button type="button" className={WsSecondaryButtonClass()} onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

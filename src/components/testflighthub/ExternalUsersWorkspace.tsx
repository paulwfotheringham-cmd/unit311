"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import {
  formatExternalUserLastLogin,
  type ExternalUser,
} from "@/lib/external-users-data";
import type { ManagedClient } from "@/lib/client-management-data";
import { cn } from "@/lib/utils";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import { KeyRound, Loader2, Plus, Save, Trash2 } from "lucide-react";

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

type ExternalUsersWorkspaceProps = {
  onUsersChange?: (users: ExternalUser[]) => void;
};

export default function ExternalUsersWorkspace({ onUsersChange }: ExternalUsersWorkspaceProps) {
  const [users, setUsers] = useState<ExternalUser[]>([]);
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [createClientId, setCreateClientId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<ExternalUser | null>(null);
  const snapshottedIdRef = useRef<string | null>(null);
  const { showDetail, openDetail, closeDetail } = useMobileDetailPanel();

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? users[0] ?? null,
    [users, selectedUserId],
  );

  const isDirty = useMemo(() => {
    if (!selectedUser || !savedSnapshot || savedSnapshot.id !== selectedUser.id) return true;
    return (
      selectedUser.name !== savedSnapshot.name ||
      selectedUser.clientId !== savedSnapshot.clientId ||
      selectedUser.username !== savedSnapshot.username ||
      selectedUser.redirectPath !== savedSnapshot.redirectPath
    );
  }, [selectedUser, savedSnapshot]);

  const syncUsers = useCallback(
    (nextUsers: ExternalUser[]) => {
      setUsers(nextUsers);
      onUsersChange?.(nextUsers);
    },
    [onUsersChange],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersResponse, clientsResponse] = await Promise.all([
        fetch("/api/external-users", { cache: "no-store" }),
        fetch("/api/clients", { cache: "no-store" }),
      ]);

      const usersData = await readApiJson<{ users?: ExternalUser[]; error?: string }>(
        usersResponse,
      );
      if (!usersResponse.ok) {
        throw new Error(usersData.error ?? "Failed to load external users");
      }

      const clientsData = await readApiJson<{ clients?: ManagedClient[]; error?: string }>(
        clientsResponse,
      );
      if (clientsResponse.ok) {
        const nextClients = clientsData.clients ?? [];
        setClients(nextClients);
        setCreateClientId((current) => current || nextClients[0]?.id || "");
      }

      const nextUsers = usersData.users ?? [];
      syncUsers(nextUsers);
      setSelectedUserId((current) => {
        if (current && nextUsers.some((user) => user.id === current)) return current;
        return nextUsers[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load external users");
      syncUsers([]);
      setSelectedUserId(null);
    } finally {
      setLoading(false);
    }
  }, [syncUsers]);

  useEffect(() => {
    startTransition(() => {
      void loadUsers();
    });
  }, [loadUsers]);

  useEffect(() => {
    startTransition(() => {
      if (!selectedUserId) {
        snapshottedIdRef.current = null;
        setSavedSnapshot(null);
        return;
      }
      if (snapshottedIdRef.current === selectedUserId) return;
      const user = users.find((item) => item.id === selectedUserId);
      if (user) {
        snapshottedIdRef.current = selectedUserId;
        setSavedSnapshot({ ...user });
      }
    });
  }, [selectedUserId, users]);

  function patchSelected(patch: Partial<ExternalUser>) {
    if (!selectedUser) return;
    const next = { ...selectedUser, ...patch };
    if (patch.clientId !== undefined) {
      const client = clients.find((item) => item.id === patch.clientId);
      next.organisation = client?.companyName ?? next.organisation;
    }
    syncUsers(users.map((user) => (user.id === next.id ? next : user)));
    setSaveMessage(null);
    setPasswordMessage(null);
  }

  async function handleSaveUser() {
    if (!selectedUser) return;
    if (!selectedUser.clientId?.trim()) {
      setError("Assign a Client Directory record before saving.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/external-users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedUser.name,
          clientId: selectedUser.clientId,
          username: selectedUser.username,
          redirectPath: selectedUser.redirectPath,
        }),
      });

      const data = await readApiJson<{ user?: ExternalUser; error?: string }>(response);
      if (!response.ok || !data.user) throw new Error(data.error ?? "Failed to save user");

      syncUsers(users.map((item) => (item.id === data.user!.id ? data.user! : item)));
      snapshottedIdRef.current = data.user.id;
      setSavedSnapshot(data.user);
      setSaveMessage("User saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save user");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddUser() {
    if (!createClientId.trim()) {
      setError("Select a Client before adding an external user.");
      return;
    }

    setBusy(true);
    setError(null);
    setPasswordMessage(null);

    const username = `client${Date.now().toString(36)}`;
    const client = clients.find((item) => item.id === createClientId);

    try {
      const response = await fetch("/api/external-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Client User",
          clientId: createClientId,
          username,
        }),
      });

      const data = await readApiJson<{
        user?: ExternalUser;
        temporaryPassword?: string;
        error?: string;
      }>(response);
      if (!response.ok || !data.user) throw new Error(data.error ?? "Failed to create user");

      syncUsers([data.user, ...users]);
      setSelectedUserId(data.user.id);
      snapshottedIdRef.current = data.user.id;
      setSavedSnapshot(data.user);
      setSaveMessage(
        client ? `User created for ${client.companyName}` : "User created",
      );
      if (data.temporaryPassword) {
        setPasswordMessage(`Temporary password: ${data.temporaryPassword}`);
      }
      openDetail();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create user");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) return;
    if (!window.confirm(`Reset password for "${selectedUser.name}"?`)) return;

    setBusy(true);
    setError(null);
    setPasswordMessage(null);

    try {
      const response = await fetch(`/api/external-users/${selectedUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password" }),
      });

      const data = await readApiJson<{ temporaryPassword?: string; error?: string }>(response);
      if (!response.ok || !data.temporaryPassword) {
        throw new Error(data.error ?? "Failed to reset password");
      }

      setPasswordMessage(`New password: ${data.temporaryPassword}`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) return;
    if (!window.confirm(`Delete external user "${selectedUser.name}"?`)) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/external-users/${selectedUser.id}`, { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete user");

      const remaining = users.filter((user) => user.id !== selectedUser.id);
      syncUsers(remaining);
      setSelectedUserId(remaining[0]?.id ?? null);
      setSaveMessage(null);
      if (remaining.length === 0) closeDetail();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading external users…
        </div>
      ) : (
        <ResponsiveMasterDetail
          showDetail={showDetail && !!selectedUser}
          onBack={closeDetail}
          backLabel="Back to external users"
          master={
            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">External Users</h2>
                  <p className="mt-1 text-xs text-white/45">
                    {users.length} client portal accounts · Client Directory FK required
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[12rem]">
                    <FieldLabel>Client for new user</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={createClientId}
                      onChange={(event) => setCreateClientId(event.target.value)}
                      disabled={busy || clients.length === 0}
                    >
                      {clients.length === 0 ? (
                        <option value="">No clients in Directory</option>
                      ) : (
                        clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.companyName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddUser()}
                    disabled={busy || !createClientId}
                    className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 disabled:opacity-60"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add user
                  </button>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {users.map((user) => {
                  const selected = user.id === selectedUser?.id;

                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          openDetail();
                        }}
                        className={cn(
                          "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                          selected
                            ? "border-sky-400/40 bg-sky-500/10 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{user.name}</p>
                            <p className="mt-1 text-xs text-white/45">
                              {user.clientId
                                ? user.organisation || "Linked client"
                                : "Unlinked — assign Client"}
                            </p>
                            <p className="mt-1 font-mono text-xs text-white/45">@{user.username}</p>
                          </div>
                          <p className="text-[10px] text-white/35">
                            {formatExternalUserLastLogin(user.lastLoggedIn)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          }
          detail={
            selectedUser ? (
              <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                      Client Portal User
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">{selectedUser.name}</h2>
                    <p className="mt-1 font-mono text-sm text-white/50">@{selectedUser.username}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveUser()}
                      disabled={busy || !isDirty}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResetPassword()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Reset password
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteUser()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {saveMessage && (
                  <p className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {saveMessage}
                  </p>
                )}

                {passwordMessage && (
                  <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs font-mono text-amber-100">
                    {passwordMessage}
                  </p>
                )}

                {!selectedUser.clientId ? (
                  <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    Unlinked — assign a Client Directory record to restore PRM-001 identity.
                  </p>
                ) : null}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Name</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedUser.name}
                      onChange={(event) => patchSelected({ name: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Client</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedUser.clientId ?? ""}
                      onChange={(event) =>
                        patchSelected({
                          clientId: event.target.value || null,
                        })
                      }
                      disabled={busy || clients.length === 0}
                    >
                      <option value="">Select Client…</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.companyName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Username</FieldLabel>
                    <input
                      className={cn(inputClassName(), "font-mono")}
                      value={selectedUser.username}
                      onChange={(event) => patchSelected({ username: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Last logged in</FieldLabel>
                    <input
                      className={cn(inputClassName(), "text-white/60")}
                      value={formatExternalUserLastLogin(selectedUser.lastLoggedIn)}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </section>
            ) : null
          }
        />
      )}
    </div>
  );
}

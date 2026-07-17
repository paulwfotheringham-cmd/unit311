"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import {
  createBlankUserInput,
  USER_REGION_OPTIONS,
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
  userFieldsEqual,
  userStatusClass,
  type ManagedUser,
} from "@/lib/user-management-data";
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

type UserManagementWorkspaceProps = {
  onUsersChange?: (users: ManagedUser[]) => void;
};

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

export default function UserManagementWorkspace({ onUsersChange }: UserManagementWorkspaceProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState<ManagedUser | null>(null);
  const snapshottedIdRef = useRef<string | null>(null);
  const { showDetail, openDetail, closeDetail } = useMobileDetailPanel();

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? users[0] ?? null,
    [users, selectedUserId],
  );

  const isDirty = useMemo(() => {
    if (!selectedUser) return false;
    if (!savedSnapshot || savedSnapshot.id !== selectedUser.id) return true;
    return !userFieldsEqual(selectedUser, savedSnapshot);
  }, [selectedUser, savedSnapshot]);

  const syncUsers = useCallback(
    (nextUsers: ManagedUser[]) => {
      setUsers(nextUsers);
      onUsersChange?.(nextUsers);
    },
    [onUsersChange],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const data = await readApiJson<{ users?: ManagedUser[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load users");

      const nextUsers = data.users ?? [];
      syncUsers(nextUsers);
      setSelectedUserId((current) => {
        if (current && nextUsers.some((user) => user.id === current)) return current;
        return nextUsers[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users");
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

  async function saveUser(user: ManagedUser) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorLabel: user.operatorLabel,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          region: user.region,
          licenseId: user.licenseId,
          notes: user.notes,
        }),
      });

      const data = await readApiJson<{ user?: ManagedUser; error?: string }>(response);
      if (!response.ok || !data.user) throw new Error(data.error ?? "Failed to save user");

      syncUsers(users.map((item) => (item.id === data.user!.id ? data.user! : item)));
      snapshottedIdRef.current = data.user.id;
      setSavedSnapshot(data.user);
      setSaveMessage("User saved");
      return data.user;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save user");
    } finally {
      setBusy(false);
    }
  }

  function patchSelected(patch: Partial<ManagedUser>) {
    if (!selectedUser) return;
    const next = { ...selectedUser, ...patch };
    syncUsers(users.map((user) => (user.id === next.id ? next : user)));
    setSaveMessage(null);
  }

  async function handleSaveUser() {
    if (!selectedUser) return;
    setError(null);
    setSaveMessage(null);
    await saveUser(selectedUser);
  }

  async function handleAddUser() {
    setBusy(true);
    setError(null);
    setPasswordMessage(null);

    const blank = createBlankUserInput();
    const username = `user${Date.now().toString(36)}`;

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...blank,
          fullName: "New Operator",
          username,
          role: "Staff",
        }),
      });

      const data = await readApiJson<{
        user?: ManagedUser;
        temporaryPassword?: string;
        error?: string;
      }>(response);
      if (!response.ok || !data.user) throw new Error(data.error ?? "Failed to create user");

      syncUsers([data.user, ...users]);
      setSelectedUserId(data.user.id);
      snapshottedIdRef.current = data.user.id;
      setSavedSnapshot(data.user);
      setSaveMessage("User created");
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
    if (!window.confirm(`Reset password for "${selectedUser.fullName}"?`)) return;

    setBusy(true);
    setError(null);
    setPasswordMessage(null);

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password" }),
      });

      const data = await readApiJson<{ temporaryPassword?: string; error?: string }>(response);
      if (!response.ok || !data.temporaryPassword) {
        throw new Error(data.error ?? "Failed to reset password");
      }

      setPasswordMessage(`New password: ${data.temporaryPassword}`);
      setNewPassword("");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPassword() {
    if (!selectedUser) return;

    const passwordToSet = newPassword.trim();
    if (passwordToSet.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!window.confirm(`Set a new password for "${selectedUser.fullName}"?`)) {
      return;
    }

    setBusy(true);
    setError(null);
    setPasswordMessage(null);

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-password",
          password: passwordToSet,
        }),
      });

      const data = await readApiJson<{ password?: string; error?: string }>(response);
      if (!response.ok || !data.password) {
        throw new Error(data.error ?? "Failed to set password");
      }

      setPasswordMessage(`Password set: ${data.password}`);
      setNewPassword("");
    } catch (setPasswordError) {
      setError(setPasswordError instanceof Error ? setPasswordError.message : "Failed to set password");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) return;
    if (!window.confirm(`Delete user "${selectedUser.fullName}"?`)) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, { method: "DELETE" });
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
          {error.includes("internal_operators") && (
            <span className="mt-2 block text-xs text-red-200/80">
              Run{" "}
              <span className="font-mono">supabase/migrations/019_create_internal_operators.sql</span>{" "}
              in Supabase.
            </span>
          )}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading users…
        </div>
      ) : (
        <ResponsiveMasterDetail
          showDetail={showDetail && !!selectedUser}
          onBack={closeDetail}
          backLabel="Back to internal users"
          master={
            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Internal Users</h2>
                  <p className="mt-1 text-xs text-white/45">{users.length} internal accounts</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddUser()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add user
                </button>
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
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/80">
                              {user.operatorLabel}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">{user.fullName}</p>
                            <p className="mt-1 font-mono text-xs text-white/45">@{user.username}</p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                              userStatusClass(user.status),
                            )}
                          >
                            {user.status}
                          </span>
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
                      {selectedUser.operatorLabel}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">{selectedUser.fullName}</h2>
                    <p className="mt-1 font-mono text-sm text-white/50">@{selectedUser.username}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                        userStatusClass(selectedUser.status),
                      )}
                    >
                      {selectedUser.status}
                    </span>
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

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Operator Label</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedUser.operatorLabel}
                      onChange={(event) => patchSelected({ operatorLabel: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Full Name</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedUser.fullName}
                      onChange={(event) => patchSelected({ fullName: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Username</FieldLabel>
                    <input
                      className={cn(inputClassName(), "font-mono")}
                      value={selectedUser.username}
                      onChange={(event) => patchSelected({ username: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <input
                      type="email"
                      className={inputClassName()}
                      value={selectedUser.email}
                      onChange={(event) => patchSelected({ email: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Phone</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedUser.phone}
                      onChange={(event) => patchSelected({ phone: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Access Role</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedUser.role}
                      onChange={(event) =>
                        patchSelected({ role: event.target.value as ManagedUser["role"] })
                      }
                    >
                      {USER_ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Region</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedUser.region}
                      onChange={(event) =>
                        patchSelected({ region: event.target.value as ManagedUser["region"] })
                      }
                    >
                      {USER_REGION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Status</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedUser.status}
                      onChange={(event) =>
                        patchSelected({ status: event.target.value as ManagedUser["status"] })
                      }
                    >
                      {USER_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>License / Certification</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedUser.licenseId}
                      onChange={(event) => patchSelected({ licenseId: event.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Notes</FieldLabel>
                    <textarea
                      rows={3}
                      className={cn(inputClassName(), "resize-y")}
                      value={selectedUser.notes}
                      onChange={(event) => patchSelected({ notes: event.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>New password</FieldLabel>
                    <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        autoComplete="new-password"
                        className={cn(inputClassName(), "mt-0 font-mono sm:flex-1")}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Enter at least 8 characters"
                        disabled={busy}
                      />
                      <button
                        type="button"
                        onClick={() => void handleSetPassword()}
                        disabled={busy || newPassword.trim().length < 8}
                        className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Set password
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/40">
                      Sets the login password for @{selectedUser.username}. Use Reset password for a
                      random value, or enter one here and click Set password.
                    </p>
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

"use client";

import { useEffect, useState } from "react";
import { UserCircle2 } from "lucide-react";

import {
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/testflighthub/workspace-chrome";

type ProfilePayload = {
  displayName: string;
  username: string;
  email: string | null;
  role: string | null;
  userType: string;
  userId: string;
  workspaceId: string | null;
  workspaceSlug: string | null;
  workspaceName: string | null;
};

export default function ProfileWorkspace() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/whoami", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<ProfilePayload>;
      if (!response.ok) {
        throw new Error(body.error || "Failed to load profile.");
      }
      setProfile({
        displayName: body.displayName?.trim() || "Operator",
        username: body.username?.trim() || "",
        email: body.email ?? null,
        role: body.role ?? null,
        userType: body.userType ?? "internal",
        userId: body.userId ?? "",
        workspaceId: body.workspaceId ?? null,
        workspaceSlug: body.workspaceSlug ?? null,
        workspaceName: body.workspaceName ?? null,
      });
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#0a1422]/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10">
            <UserCircle2 className="h-5 w-5 text-sky-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Profile</h2>
            <p className="text-sm text-white/55">
              Your Unit311 Central operator profile for this session.
            </p>
          </div>
        </div>
      </section>

      {loading ? <WorkspaceLoading label="Loading profile…" /> : null}
      {!loading && error ? (
        <WorkspaceError message={error} onRetry={() => void loadProfile()} />
      ) : null}
      {!loading && !error && profile ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              Name
            </p>
            <p className="mt-2 text-white">{profile.displayName}</p>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              Email
            </p>
            <p className="mt-2 text-white">
              {profile.email || profile.username || "—"}
            </p>
            {profile.username && profile.email && profile.username !== profile.email ? (
              <>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  Username
                </p>
                <p className="mt-2 text-white">{profile.username}</p>
              </>
            ) : null}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              Role
            </p>
            <p className="mt-2 text-white">
              {profile.role ||
                (profile.userType === "internal"
                  ? "Internal operator"
                  : "External user")}
            </p>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              Workspace
            </p>
            <p className="mt-2 text-white">
              {profile.workspaceName ||
                profile.workspaceSlug ||
                "No active workspace"}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

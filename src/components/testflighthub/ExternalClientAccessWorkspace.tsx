"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  FolderKanban,
  LifeBuoy,
  Mail,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";

import {
  ECA_PORTAL_MODULES,
  ecaStatusClass,
  type EcaAuditEvent,
  type EcaPortalModule,
} from "@/lib/external-client-access-data";
import { createInvitation, togglePortalModule, updatePortalConfig } from "@/lib/external-client-access-mock-store";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import { cn } from "@/lib/utils";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import { useEcaMockStore } from "./useEcaMockStore";
import {
  WsEmpty,
  WsInputClass,
  WsKpiTile,
  WsLabelClass,
  WsPrimaryButtonClass,
  WsSecondaryButtonClass,
  WsSection,
  WsSlideOver,
  WsStatusPill,
} from "./domain-workspace-ui";

const INVITATION_ROLES = ["Administrator", "Manager", "Contributor", "Viewer"] as const;
const PERMISSION_ROLES = ["Administrator", "Manager", "Contributor", "Viewer"] as const;
const PERMISSION_ACTIONS = [
  "Read",
  "Write",
  "Delete",
  "Approve",
  "Download",
  "Upload",
  "Administration",
] as const;

type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
type PermissionRole = (typeof PERMISSION_ROLES)[number];

type AuditKindFilter = EcaAuditEvent["kind"] | "All";

type Notice = {
  tone: "success" | "warning" | "info";
  message: string;
};

type InvitationForm = {
  email: string;
  clientName: string;
  role: string;
  modules: EcaPortalModule[];
};

const defaultInvitationForm = (): InvitationForm => ({
  email: "",
  clientName: "",
  role: "Contributor",
  modules: ["Projects", "Files", "Support"],
});

const DEFAULT_PERMISSION_MATRIX: Record<PermissionRole, Record<PermissionAction, boolean>> = {
  Administrator: {
    Read: true,
    Write: true,
    Delete: true,
    Approve: true,
    Download: true,
    Upload: true,
    Administration: true,
  },
  Manager: {
    Read: true,
    Write: true,
    Delete: true,
    Approve: true,
    Download: true,
    Upload: true,
    Administration: false,
  },
  Contributor: {
    Read: true,
    Write: true,
    Delete: false,
    Approve: false,
    Download: true,
    Upload: true,
    Administration: false,
  },
  Viewer: {
    Read: true,
    Write: false,
    Delete: false,
    Approve: false,
    Download: true,
    Upload: false,
    Administration: false,
  },
};

function formatDateTime(iso: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss?: () => void }) {
  const toneClass =
    notice.tone === "success"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : notice.tone === "warning"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
        : "border-sky-400/30 bg-sky-500/10 text-sky-100";

  return (
    <div className={cn("flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm", toneClass)}>
      <p>{notice.message}</p>
      {onDismiss ? (
        <button type="button" className="shrink-0 text-xs underline opacity-80" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={WsLabelClass()}>{label}</label>
      {children}
    </div>
  );
}

export default function ExternalClientAccessWorkspace() {
  const basePath = useInternalOperationsBasePath();
  const store = useEcaMockStore();
  const [selectedPortalId, setSelectedPortalId] = useState(store.portals[0]?.id ?? "");
  const [auditFilter, setAuditFilter] = useState<AuditKindFilter>("All");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState(1);
  const [inviteForm, setInviteForm] = useState<InvitationForm>(defaultInvitationForm);
  const [inviteSent, setInviteSent] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [permissionMatrix, setPermissionMatrix] = useState(DEFAULT_PERMISSION_MATRIX);

  const selectedPortal = useMemo(
    () => store.portals.find((portal) => portal.id === selectedPortalId) ?? null,
    [store.portals, selectedPortalId],
  );

  const kpis = useMemo(() => {
    const portalUsers = store.portals.reduce((sum, portal) => sum + portal.users, 0);
    const activeSessions = store.portals.reduce((sum, portal) => sum + portal.activeSessions, 0);
    const pendingInvitations =
      store.invitations.filter((row) => row.status !== "Accepted").length +
      store.portals.reduce((sum, portal) => sum + portal.pendingInvites, 0);
    const lockedAccounts = store.portals.reduce((sum, portal) => sum + portal.lockedAccounts, 0);
    const storageUsed = store.portals.reduce((sum, portal) => sum + portal.storageGb, 0);
    const lastLogin = store.portals.reduce<string | null>((latest, portal) => {
      if (!portal.lastLogin) return latest;
      if (!latest || portal.lastLogin > latest) return portal.lastLogin;
      return latest;
    }, null);

    return {
      clients: store.portals.length,
      portalUsers,
      activeSessions,
      pendingInvitations,
      lockedAccounts,
      portalUsage: activeSessions,
      storageUsed,
      recentActivity: store.audit.length,
      lastLogin,
    };
  }, [store.audit.length, store.invitations, store.portals]);

  const filteredAudit = useMemo(() => {
    const rows =
      auditFilter === "All" ? store.audit : store.audit.filter((row) => row.kind === auditFilter);
    return rows.slice(0, 20);
  }, [auditFilter, store.audit]);

  const quickLinks = [
    { label: "External users", view: "users-external" as const, icon: Users },
    { label: "Client directory", view: "clients" as const, icon: Building2 },
    { label: "Client files", view: "files-client" as const, icon: FolderKanban },
    { label: "Projects", view: "projects" as const, icon: FolderKanban },
    { label: "Support desk", view: "support" as const, icon: LifeBuoy },
    { label: "Training", view: "training" as const, icon: Shield },
  ];

  const resetInviteWizard = () => {
    setInviteStep(1);
    setInviteForm(defaultInvitationForm());
    setInviteSent(false);
  };

  const openInviteWizard = () => {
    resetInviteWizard();
    if (selectedPortal) {
      setInviteForm((form) => ({ ...form, clientName: selectedPortal.clientName }));
    }
    setInviteOpen(true);
  };

  const closeInviteWizard = () => {
    setInviteOpen(false);
    resetInviteWizard();
  };

  const sendInvitation = () => {
    if (!inviteForm.email.trim() || !inviteForm.clientName.trim()) return;
    createInvitation({
      email: inviteForm.email.trim(),
      clientName: inviteForm.clientName.trim(),
      role: inviteForm.role,
      modules: inviteForm.modules,
    });
    setInviteSent(true);
    setInviteStep(7);
    setNotice({
      tone: "success",
      message: `Invitation sent to ${inviteForm.email.trim()} with ${inviteForm.modules.length} modules enabled.`,
    });
  };

  const togglePermission = (role: PermissionRole, action: PermissionAction) => {
    setPermissionMatrix((matrix) => ({
      ...matrix,
      [role]: {
        ...matrix[role],
        [action]: !matrix[role][action],
      },
    }));
    setNotice({
      tone: "info",
      message: `Updated ${action.toLowerCase()} permission for ${role} (local preview — persist via user management).`,
    });
  };

  const toggleModule = (moduleName: EcaPortalModule) => {
    if (!selectedPortal) return;
    togglePortalModule(selectedPortal.id, moduleName);
  };

  const patchPortal = (patch: Parameters<typeof updatePortalConfig>[1]) => {
    if (!selectedPortal) return;
    updatePortalConfig(selectedPortal.id, patch);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-end gap-4">
        <div className="flex flex-wrap gap-2">
          <Link href={getInternalNavHref("users-external", basePath)} className={WsSecondaryButtonClass()}>
            <Users className="h-4 w-4" />
            External users
          </Link>
          <button type="button" className={WsPrimaryButtonClass()} onClick={openInviteWizard}>
            <UserPlus className="h-4 w-4" />
            Send invitation
          </button>
        </div>
      </div>

      {notice ? <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-9">
        <WsKpiTile label="Clients" value={kpis.clients} hint="Configured portals" />
        <WsKpiTile label="Portal users" value={kpis.portalUsers} />
        <WsKpiTile label="Active sessions" value={kpis.activeSessions} />
        <WsKpiTile label="Pending invitations" value={kpis.pendingInvitations} />
        <WsKpiTile label="Locked accounts" value={kpis.lockedAccounts} />
        <WsKpiTile label="Portal usage" value={kpis.portalUsage} hint="Current sessions" />
        <WsKpiTile label="Storage used" value={`${kpis.storageUsed.toFixed(1)} GB`} />
        <WsKpiTile label="Recent activity" value={kpis.recentActivity} hint="Audit events" />
        <WsKpiTile
          label="Last logins"
          value={kpis.lastLogin ? formatDateTime(kpis.lastLogin) : "—"}
          hint="Most recent portal access"
        />
      </section>

      <WsSection title="Related workspaces" subtitle="Jump to linked client operations modules.">
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.view}
                href={getInternalNavHref(link.view, basePath)}
                className={WsSecondaryButtonClass()}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
              </Link>
            );
          })}
        </div>
      </WsSection>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <WsSection title="Client portals" subtitle="Select a portal to configure branding and modules.">
          <div className="space-y-2">
            {store.portals.map((portal) => {
              const selected = portal.id === selectedPortalId;
              return (
                <button
                  key={portal.id}
                  type="button"
                  onClick={() => setSelectedPortalId(portal.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                    selected
                      ? "border-violet-400/40 bg-violet-500/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{portal.portalName}</p>
                      <p className="truncate text-xs text-white/45">{portal.clientName}</p>
                    </div>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: portal.brandPrimary }}
                    >
                      {portal.logoLabel}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/45">
                    <span>{portal.users} users</span>
                    <span>·</span>
                    <span>{portal.activeSessions} sessions</span>
                    <span>·</span>
                    <span>{portal.storageGb.toFixed(1)} GB</span>
                  </div>
                </button>
              );
            })}
          </div>
        </WsSection>

        {selectedPortal ? (
          <div className="space-y-5">
            <WsSection
              title="Portal configuration"
              subtitle={`${selectedPortal.clientName} · ${selectedPortal.modules.length} modules enabled`}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Portal name">
                  <input
                    className={WsInputClass()}
                    value={selectedPortal.portalName}
                    onChange={(event) => patchPortal({ portalName: event.target.value })}
                  />
                </Field>
                <Field label="Logo label">
                  <input
                    className={WsInputClass()}
                    value={selectedPortal.logoLabel}
                    onChange={(event) => patchPortal({ logoLabel: event.target.value })}
                  />
                </Field>
                <Field label="Brand primary">
                  <input
                    type="color"
                    className={cn(WsInputClass(), "h-11 cursor-pointer p-1")}
                    value={selectedPortal.brandPrimary}
                    onChange={(event) => patchPortal({ brandPrimary: event.target.value })}
                  />
                </Field>
                <Field label="Brand accent">
                  <input
                    type="color"
                    className={cn(WsInputClass(), "h-11 cursor-pointer p-1")}
                    value={selectedPortal.brandAccent}
                    onChange={(event) => patchPortal({ brandAccent: event.target.value })}
                  />
                </Field>
                <Field label="Landing page">
                  <select
                    className={WsInputClass()}
                    value={selectedPortal.landingPage}
                    onChange={(event) => patchPortal({ landingPage: event.target.value })}
                  >
                    {selectedPortal.modules.map((moduleName) => (
                      <option key={moduleName} value={moduleName}>
                        {moduleName}
                      </option>
                    ))}
                    <option value={selectedPortal.landingPage}>{selectedPortal.landingPage}</option>
                  </select>
                </Field>
                <Field label="Support contact">
                  <input
                    className={WsInputClass()}
                    value={selectedPortal.supportContact}
                    onChange={(event) => patchPortal({ supportContact: event.target.value })}
                  />
                </Field>
                <Field label="Document branding">
                  <input
                    className={WsInputClass()}
                    value={selectedPortal.documentBranding}
                    onChange={(event) => patchPortal({ documentBranding: event.target.value })}
                  />
                </Field>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedPortal.notificationsEnabled}
                      onChange={(event) =>
                        patchPortal({ notificationsEnabled: event.target.checked })
                      }
                      className="h-4 w-4 rounded border-white/20 bg-[#0b1524]"
                    />
                    <span className="text-sm text-white/80">Email notifications enabled</span>
                  </label>
                </div>
              </div>
            </WsSection>

            <WsSection
              title="Module visibility"
              subtitle="Control which modules appear in the client portal navigation."
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ECA_PORTAL_MODULES.map((moduleName) => {
                  const enabled = selectedPortal.modules.includes(moduleName);
                  return (
                    <button
                      key={moduleName}
                      type="button"
                      onClick={() => toggleModule(moduleName)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                        enabled
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20",
                      )}
                    >
                      <span>{moduleName}</span>
                      <WsStatusPill className={ecaStatusClass(enabled ? "enabled" : "disabled")}>
                        {enabled ? "Visible" : "Hidden"}
                      </WsStatusPill>
                    </button>
                  );
                })}
              </div>
            </WsSection>
          </div>
        ) : (
          <WsEmpty message="Select a client portal to configure branding, modules, and access." />
        )}
      </div>

      <WsSection
        title="Role permissions"
        subtitle="Read/write matrix for portal roles. Toggle locally to preview policy changes."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-white/40">
                <th className="px-2 py-2 font-medium">Role</th>
                {PERMISSION_ACTIONS.map((action) => (
                  <th key={action} className="px-2 py-2 text-center font-medium">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_ROLES.map((role) => (
                <tr key={role} className="border-b border-white/5">
                  <td className="px-2 py-2.5 font-medium text-white">{role}</td>
                  {PERMISSION_ACTIONS.map((action) => {
                    const allowed = permissionMatrix[role][action];
                    return (
                      <td key={action} className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission(role, action)}
                          className={cn(
                            "inline-flex h-8 min-w-[4.5rem] items-center justify-center rounded-lg border px-2 text-[11px] font-semibold transition-colors",
                            allowed
                              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                              : "border-white/10 bg-white/[0.03] text-white/40",
                          )}
                        >
                          {allowed ? "Allow" : "Deny"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-white/40">
          Manage individual user accounts and credentials in{" "}
          <Link
            href={getInternalNavHref("users-external", basePath)}
            className="text-sky-300 underline underline-offset-2"
          >
            External users
          </Link>
          .
        </p>
      </WsSection>

      <WsSection
        title="Audit log"
        subtitle="Recent portal security and activity events."
        actions={
          <select
            className="rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-xs text-white outline-none"
            value={auditFilter}
            onChange={(event) => setAuditFilter(event.target.value as AuditKindFilter)}
          >
            <option value="All">All events</option>
            <option value="Invitation">Invitations</option>
            <option value="Password Reset">Password resets</option>
            <option value="Permission Change">Permission changes</option>
            <option value="Failed Login">Failed logins</option>
            <option value="Successful Login">Successful logins</option>
            <option value="Portal Activity">Portal activity</option>
          </select>
        }
      >
        {filteredAudit.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-white/40">
                  <th className="px-2 py-2 font-medium">When</th>
                  <th className="px-2 py-2 font-medium">Kind</th>
                  <th className="px-2 py-2 font-medium">Client</th>
                  <th className="px-2 py-2 font-medium">Actor</th>
                  <th className="px-2 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudit.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="px-2 py-2.5 text-white/75">{formatDateTime(row.at)}</td>
                    <td className="px-2 py-2.5">
                      <WsStatusPill className={ecaStatusClass(row.kind)}>{row.kind}</WsStatusPill>
                    </td>
                    <td className="px-2 py-2.5 text-white/75">{row.clientName}</td>
                    <td className="px-2 py-2.5 text-white/75">{row.actor}</td>
                    <td className="px-2 py-2.5 text-white/75">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <WsEmpty message="No audit events match the selected filter." />
        )}
      </WsSection>

      <WsSection title="Pending invitations" subtitle="Outstanding portal invitations across clients.">
        {store.invitations.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-white/40">
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Client</th>
                  <th className="px-2 py-2 font-medium">Role</th>
                  <th className="px-2 py-2 font-medium">Modules</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {store.invitations.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="px-2 py-2.5 font-medium text-white">{row.email}</td>
                    <td className="px-2 py-2.5 text-white/75">{row.clientName}</td>
                    <td className="px-2 py-2.5 text-white/75">{row.role}</td>
                    <td className="px-2 py-2.5 text-white/75">{row.modules.join(", ")}</td>
                    <td className="px-2 py-2.5">
                      <WsStatusPill className={ecaStatusClass(row.status)}>{row.status}</WsStatusPill>
                    </td>
                    <td className="px-2 py-2.5 text-white/75">{row.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <WsEmpty message="No invitations have been issued yet." />
        )}
      </WsSection>

      {inviteOpen ? (
        <WsSlideOver
          title="Portal invitation"
          subtitle={`Step ${inviteStep} of 7`}
          onClose={closeInviteWizard}
          footer={
            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                className={WsSecondaryButtonClass(inviteStep === 1 || inviteSent)}
                disabled={inviteStep === 1 || inviteSent}
                onClick={() => setInviteStep((step) => Math.max(1, step - 1))}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <div className="flex flex-wrap gap-2">
                {inviteStep < 6 ? (
                  <button
                    type="button"
                    className={WsPrimaryButtonClass()}
                    onClick={() => setInviteStep((step) => Math.min(7, step + 1))}
                  >
                    Continue
                  </button>
                ) : inviteStep === 6 ? (
                  <button type="button" className={WsPrimaryButtonClass()} onClick={sendInvitation}>
                    <Mail className="h-4 w-4" />
                    Send invitation
                  </button>
                ) : (
                  <button type="button" className={WsPrimaryButtonClass()} onClick={closeInviteWizard}>
                    Finish
                  </button>
                )}
              </div>
            </div>
          }
        >
          {inviteStep === 1 ? (
            <Field label="Email address">
              <input
                type="email"
                className={WsInputClass()}
                value={inviteForm.email}
                onChange={(event) =>
                  setInviteForm((form) => ({ ...form, email: event.target.value }))
                }
                placeholder="user@client.example"
              />
            </Field>
          ) : null}

          {inviteStep === 2 ? (
            <Field label="Client">
              <select
                className={WsInputClass()}
                value={inviteForm.clientName}
                onChange={(event) =>
                  setInviteForm((form) => ({ ...form, clientName: event.target.value }))
                }
              >
                <option value="">Select client</option>
                {store.portals.map((portal) => (
                  <option key={portal.id} value={portal.clientName}>
                    {portal.clientName}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {inviteStep === 3 ? (
            <div className="space-y-3">
              <p className="text-sm text-white/55">Choose the portal role for this invitation.</p>
              <div className="grid gap-2">
                {INVITATION_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setInviteForm((form) => ({ ...form, role }))}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors",
                      inviteForm.role === role
                        ? "border-violet-400/40 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20",
                    )}
                  >
                    <p className="text-sm font-semibold text-white">{role}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {inviteStep === 4 ? (
            <div className="space-y-3">
              <p className="text-sm text-white/55">Select modules included in the invitation.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ECA_PORTAL_MODULES.map((moduleName) => {
                  const selected = inviteForm.modules.includes(moduleName);
                  return (
                    <button
                      key={moduleName}
                      type="button"
                      onClick={() =>
                        setInviteForm((form) => ({
                          ...form,
                          modules: selected
                            ? form.modules.filter((item) => item !== moduleName)
                            : [...form.modules, moduleName],
                        }))
                      }
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.03] text-white/55",
                      )}
                    >
                      {moduleName}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {inviteStep === 5 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className={WsLabelClass()}>Invitation preview</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-white/45">Email</dt>
                  <dd className="text-white/85">{inviteForm.email || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/45">Client</dt>
                  <dd className="text-white/85">{inviteForm.clientName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/45">Role</dt>
                  <dd className="text-white/85">{inviteForm.role}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/45">Modules</dt>
                  <dd className="max-w-[16rem] text-right text-white/85">
                    {inviteForm.modules.length ? inviteForm.modules.join(", ") : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {inviteStep === 6 ? (
            <div className="space-y-3">
              <p className="text-sm text-white/55">
                Review the invitation details, then send. The recipient receives a secure portal link
                and onboarding instructions.
              </p>
              <NoticeBanner
                notice={{
                  tone: "info",
                  message: `Ready to invite ${inviteForm.email || "the recipient"} to ${inviteForm.clientName || "the selected client"}.`,
                }}
              />
            </div>
          ) : null}

          {inviteStep === 7 && inviteSent ? (
            <NoticeBanner
              notice={{
                tone: "success",
                message: `Invitation sent to ${inviteForm.email}. The user will appear in External users once accepted.`,
              }}
            />
          ) : null}
        </WsSlideOver>
      ) : null}
    </div>
  );
}

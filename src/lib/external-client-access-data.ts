/** External Client Access (MOD-160 / program MOD-620). */

export const ECA_PORTAL_MODULES = [
  "Projects",
  "Files",
  "Support",
  "Training",
  "Invoices",
  "Contracts",
  "Documents",
  "Reports",
  "Calendar",
  "Communications",
  "Tasks",
  "Assets",
  "Custom Pages",
] as const;

export type EcaPortalModule = (typeof ECA_PORTAL_MODULES)[number];

export type EcaPortalConfig = {
  id: string;
  clientId: string;
  clientName: string;
  portalName: string;
  logoLabel: string;
  brandPrimary: string;
  brandAccent: string;
  modules: EcaPortalModule[];
  landingPage: string;
  supportContact: string;
  notificationsEnabled: boolean;
  documentBranding: string;
  users: number;
  activeSessions: number;
  pendingInvites: number;
  lockedAccounts: number;
  storageGb: number;
  lastLogin: string;
};

export type EcaAuditEvent = {
  id: string;
  at: string;
  kind:
    | "Invitation"
    | "Password Reset"
    | "Permission Change"
    | "Failed Login"
    | "Successful Login"
    | "Portal Activity";
  actor: string;
  detail: string;
  clientName: string;
};

export type EcaInvitation = {
  id: string;
  email: string;
  clientName: string;
  role: string;
  modules: EcaPortalModule[];
  status: "Draft" | "Sent" | "Accepted";
  createdAt: string;
};

export function ecaStatusClass(status: string): string {
  const key = status.toLowerCase();
  if (key.includes("accept") || key.includes("success") || key.includes("enabled")) {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  }
  if (key.includes("fail") || key.includes("locked")) {
    return "border-rose-400/30 bg-rose-500/10 text-rose-100";
  }
  if (key.includes("pending") || key.includes("sent") || key.includes("draft")) {
    return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  }
  return "border-white/15 bg-white/[0.04] text-white/70";
}

export function createSeedEcaPortals(): EcaPortalConfig[] {
  return [
    {
      id: "portal-001",
      clientId: "client-aeroparts",
      clientName: "AeroParts Iberia",
      portalName: "AeroParts Workspace",
      logoLabel: "AP",
      brandPrimary: "#0ea5e9",
      brandAccent: "#0369a1",
      modules: ["Projects", "Files", "Support", "Documents", "Reports", "Training"],
      landingPage: "Projects",
      supportContact: "support@aeroparts-iberia.example",
      notificationsEnabled: true,
      documentBranding: "AeroParts letterhead",
      users: 18,
      activeSessions: 4,
      pendingInvites: 2,
      lockedAccounts: 0,
      storageGb: 42.6,
      lastLogin: "2026-07-20T21:14:00Z",
    },
    {
      id: "portal-002",
      clientId: "client-skyline",
      clientName: "Skyline Survey Co",
      portalName: "Skyline Client Portal",
      logoLabel: "SS",
      brandPrimary: "#34d399",
      brandAccent: "#059669",
      modules: ["Projects", "Files", "Support", "Calendar", "Communications", "Assets"],
      landingPage: "Files",
      supportContact: "help@skyline.example",
      notificationsEnabled: true,
      documentBranding: "Skyline branded PDF",
      users: 9,
      activeSessions: 1,
      pendingInvites: 1,
      lockedAccounts: 1,
      storageGb: 18.2,
      lastLogin: "2026-07-19T10:02:00Z",
    },
    {
      id: "portal-003",
      clientId: "client-northwind",
      clientName: "Northwind Logistics",
      portalName: "Northwind Portal",
      logoLabel: "NL",
      brandPrimary: "#a78bfa",
      brandAccent: "#7c3aed",
      modules: ["Projects", "Invoices", "Contracts", "Documents", "Reports"],
      landingPage: "Documents",
      supportContact: "portal@northwind.example",
      notificationsEnabled: false,
      documentBranding: "Northwind standard",
      users: 12,
      activeSessions: 2,
      pendingInvites: 0,
      lockedAccounts: 0,
      storageGb: 27.4,
      lastLogin: "2026-07-20T08:40:00Z",
    },
  ];
}

export function createSeedEcaAudit(): EcaAuditEvent[] {
  return [
    { id: "aud-1", at: "2026-07-20T21:14:00Z", kind: "Successful Login", actor: "carmen@aeroparts.example", detail: "Portal session started", clientName: "AeroParts Iberia" },
    { id: "aud-2", at: "2026-07-20T16:05:00Z", kind: "Invitation", actor: "Operations", detail: "Invited leo@skyline.example as Contributor", clientName: "Skyline Survey Co" },
    { id: "aud-3", at: "2026-07-19T19:22:00Z", kind: "Failed Login", actor: "unknown@external.example", detail: "Invalid password (3rd attempt)", clientName: "Skyline Survey Co" },
    { id: "aud-4", at: "2026-07-19T12:10:00Z", kind: "Permission Change", actor: "Operations", detail: "Enabled Invoices module for Northwind", clientName: "Northwind Logistics" },
    { id: "aud-5", at: "2026-07-18T09:45:00Z", kind: "Password Reset", actor: "Operations", detail: "Reset issued for maria@aeroparts.example", clientName: "AeroParts Iberia" },
  ];
}

export function createSeedEcaInvitations(): EcaInvitation[] {
  return [
    {
      id: "inv-1",
      email: "leo@skyline.example",
      clientName: "Skyline Survey Co",
      role: "Contributor",
      modules: ["Projects", "Files", "Support"],
      status: "Sent",
      createdAt: "2026-07-20",
    },
    {
      id: "inv-2",
      email: "ana@aeroparts.example",
      clientName: "AeroParts Iberia",
      role: "Viewer",
      modules: ["Documents", "Reports"],
      status: "Draft",
      createdAt: "2026-07-19",
    },
  ];
}

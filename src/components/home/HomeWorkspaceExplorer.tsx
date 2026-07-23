"use client";

import { useId, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Banknote,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  Cable,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  Database,
  FileStack,
  FileText,
  FolderKanban,
  Gauge,
  GitBranch,
  GraduationCap,
  Handshake,
  HardDrive,
  LayoutDashboard,
  Link2,
  Mail,
  MessageSquare,
  Package,
  Plug,
  Scale,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
  UserCog,
  Users,
  UsersRound,
  Video,
  Wallet,
  Wrench,
} from "lucide-react";

type Capability = {
  label: string;
  icon: LucideIcon;
};

type WorkspaceVisual = "central" | "clients" | "finance" | "people" | "engineering" | "corporate" | "assets" | "productivity" | "integrations";

type Workspace = {
  id: string;
  title: string;
  descriptor: string;
  description: string;
  icon: LucideIcon;
  visual: WorkspaceVisual;
  accent: string;
  capabilities: Capability[];
  footnote?: string;
};

const WORKSPACES: Workspace[] = [
  {
    id: "business-central",
    title: "Business Central",
    descriptor: "Executive oversight",
    description:
      "Executive oversight, strategic planning, AI-powered decision making and enterprise-wide workflow automation.",
    icon: LayoutDashboard,
    visual: "central",
    accent: "rgba(125, 211, 252, 0.55)",
    capabilities: [
      { label: "Executive Dashboard", icon: Gauge },
      { label: "Executive AI Assistant", icon: Sparkles },
      { label: "Role-Based Workspaces", icon: Users },
      { label: "Workflow & Approvals", icon: ClipboardCheck },
      { label: "Organisation Dashboard", icon: Building2 },
      { label: "Competitors", icon: Target },
      { label: "Whiteboards", icon: FileStack },
      { label: "Executive Decks", icon: ChartColumn },
      { label: "Strategic Planning", icon: Activity },
    ],
    footnote:
      "Workflow & Approvals supports simple through to highly complex multi-stage approval processes across projects, procurement, HR, finance, contracts, quality management, engineering change requests, expenses, leave requests and any other business workflow.",
  },
  {
    id: "clients-projects",
    title: "Clients & Projects",
    descriptor: "Relationships & delivery",
    description:
      "Manage client relationships, pipeline, onboarding and project delivery in one connected workspace.",
    icon: Briefcase,
    visual: "clients",
    accent: "rgba(147, 197, 253, 0.55)",
    capabilities: [
      { label: "Client Directory", icon: Users },
      { label: "CRM & Pipeline", icon: Handshake },
      { label: "Client Onboarding", icon: ClipboardList },
      { label: "Internal Projects", icon: FolderKanban },
      { label: "External Projects", icon: Briefcase },
      { label: "Quality Management", icon: ShieldCheck },
    ],
  },
  {
    id: "financials",
    title: "Financials",
    descriptor: "Finance & reporting",
    description:
      "Run finance operations, banking connections and reporting from a unified financial command centre.",
    icon: Wallet,
    visual: "finance",
    accent: "rgba(110, 231, 183, 0.45)",
    capabilities: [
      { label: "Financial Dashboard", icon: ChartColumn },
      { label: "General Ledger", icon: FileText },
      { label: "Accounts Receivable", icon: Banknote },
      { label: "Accounts Payable", icon: Wallet },
      { label: "Expenses", icon: ClipboardList },
      { label: "Banking Integration", icon: Building2 },
      { label: "Financial Reporting", icon: Activity },
    ],
  },
  {
    id: "hr-people",
    title: "HR & People",
    descriptor: "Workforce management",
    description:
      "Coordinate workforce management across people, leave, performance, payroll and training.",
    icon: UsersRound,
    visual: "people",
    accent: "rgba(196, 181, 253, 0.5)",
    capabilities: [
      { label: "HR Dashboard", icon: Gauge },
      { label: "Employees", icon: Users },
      { label: "Leave", icon: CalendarDays },
      { label: "Performance", icon: Target },
      { label: "Recruitment", icon: UserCog },
      { label: "Payroll", icon: Banknote },
      { label: "Training", icon: GraduationCap },
      { label: "Representatives & Distributors", icon: Handshake },
    ],
  },
  {
    id: "engineering",
    title: "Engineering",
    descriptor: "Engineering delivery",
    description:
      "Plan capacity, deliver engineering projects and maintain technical quality and compliance.",
    icon: Wrench,
    visual: "engineering",
    accent: "rgba(125, 211, 252, 0.5)",
    capabilities: [
      { label: "Engineering Dashboard", icon: Gauge },
      { label: "Resource Utilisation", icon: Activity },
      { label: "Capacity Planning", icon: ChartColumn },
      { label: "Engineering Projects", icon: FolderKanban },
      { label: "Technical Documentation", icon: FileText },
      { label: "Quality & Compliance", icon: ShieldCheck },
      { label: "Risks & Issues", icon: ClipboardCheck },
    ],
  },
  {
    id: "corporate-operations",
    title: "Corporate Operations",
    descriptor: "Governance & compliance",
    description:
      "Govern company structure, contracts, compliance and advisory relationships from one place.",
    icon: Scale,
    visual: "corporate",
    accent: "rgba(186, 230, 253, 0.5)",
    capabilities: [
      { label: "Company Information", icon: Building2 },
      { label: "Cap Table & Shareholder Management", icon: ChartColumn },
      { label: "Software & Licences", icon: HardDrive },
      { label: "Contracts", icon: FileText },
      { label: "Bank Accounts", icon: Banknote },
      { label: "Professional Advisers", icon: Users },
      { label: "Compliance & Governance", icon: ShieldCheck },
    ],
  },
  {
    id: "assets-logistics",
    title: "Assets & Logistics",
    descriptor: "Inventory & procurement",
    description:
      "Track assets, inventory, logistics movements and procurement across your organisation.",
    icon: Package,
    visual: "assets",
    accent: "rgba(253, 224, 71, 0.35)",
    capabilities: [
      { label: "Asset Register", icon: Boxes },
      { label: "Inventory", icon: Package },
      { label: "Logistics", icon: Truck },
      { label: "Procurement", icon: ClipboardList },
    ],
  },
  {
    id: "productivity",
    title: "Productivity & Collaboration",
    descriptor: "Communication & knowledge",
    description:
      "Centralise communication, knowledge, calendar and support across your organisation.",
    icon: MessageSquare,
    visual: "productivity",
    accent: "rgba(165, 180, 252, 0.5)",
    capabilities: [
      { label: "Information Repository", icon: Database },
      { label: "Email", icon: Mail },
      { label: "Calendar", icon: CalendarDays },
      { label: "Messaging", icon: MessageSquare },
      { label: "Voice & Video", icon: Video },
      { label: "Social", icon: Share2 },
      { label: "Support Desk / WhatsApp", icon: Cable },
    ],
  },
  {
    id: "integrations",
    title: "Business Integrations",
    descriptor: "Connect your existing systems",
    description:
      "Connect Unit311 Central to the specialist systems your business already relies on—integrate rather than replace.",
    icon: Plug,
    visual: "integrations",
    accent: "rgba(56, 189, 248, 0.5)",
    capabilities: [
      { label: "Microsoft 365", icon: Cloud },
      { label: "Outlook", icon: Mail },
      { label: "Teams", icon: MessageSquare },
      { label: "SharePoint", icon: FileStack },
      { label: "OneDrive", icon: HardDrive },
      { label: "Power BI", icon: ChartColumn },
      { label: "Dynamics 365", icon: Building2 },
      { label: "SAP", icon: Database },
      { label: "Oracle", icon: Database },
      { label: "Xero", icon: Wallet },
      { label: "Sage", icon: Wallet },
      { label: "QuickBooks", icon: Wallet },
      { label: "Salesforce", icon: Target },
      { label: "HubSpot", icon: Handshake },
      { label: "Jira", icon: ClipboardCheck },
      { label: "GitHub", icon: GitBranch },
      { label: "Monday.com", icon: LayoutDashboard },
      { label: "Asana", icon: FolderKanban },
      { label: "Google Workspace", icon: Cloud },
      { label: "Dropbox", icon: HardDrive },
      { label: "REST APIs", icon: Link2 },
      { label: "Webhooks", icon: Cable },
      { label: "Custom Integrations", icon: Plug },
    ],
    footnote:
      "Unit311 Central is designed to integrate with the business systems you already use, connecting data and workflows without forcing a rip-and-replace approach.",
  },
];

function Atmosphere({ visual }: { visual: WorkspaceVisual }) {
  switch (visual) {
    case "central":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <rect x="18" y="42" width="124" height="10" rx="5" fill="currentColor" opacity="0.1" />
          <rect x="18" y="62" width="92" height="8" rx="4" fill="currentColor" opacity="0.07" />
          <rect x="18" y="84" width="124" height="38" rx="10" fill="currentColor" opacity="0.06" />
          <rect x="18" y="132" width="58" height="34" rx="9" fill="currentColor" opacity="0.08" />
          <rect x="84" y="132" width="58" height="34" rx="9" fill="currentColor" opacity="0.05" />
          <rect x="18" y="176" width="124" height="8" rx="4" fill="currentColor" opacity="0.05" />
        </svg>
      );
    case "clients":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <path d="M42 70C58 92 78 98 104 86" stroke="currentColor" strokeWidth="1.2" opacity="0.22" />
          <path d="M36 128C62 112 96 118 124 146" stroke="currentColor" strokeWidth="1.2" opacity="0.18" />
          <path d="M78 56C86 88 88 120 74 162" stroke="currentColor" strokeWidth="1.1" opacity="0.14" />
          <circle cx="42" cy="70" r="5" fill="currentColor" opacity="0.28" />
          <circle cx="104" cy="86" r="4.5" fill="currentColor" opacity="0.22" />
          <circle cx="36" cy="128" r="4" fill="currentColor" opacity="0.2" />
          <circle cx="124" cy="146" r="5" fill="currentColor" opacity="0.18" />
          <circle cx="78" cy="56" r="3.5" fill="currentColor" opacity="0.16" />
          <circle cx="74" cy="162" r="3.5" fill="currentColor" opacity="0.14" />
        </svg>
      );
    case "finance":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <path
            className="workspace-atmosphere-flow"
            d="M16 158C36 148 44 118 62 112C84 104 90 142 112 136C128 131 138 108 148 96"
            stroke="currentColor"
            strokeWidth="1.4"
            opacity="0.28"
          />
          <path
            d="M16 172C40 166 52 148 70 146C92 143 98 168 120 162C134 157 142 142 148 132"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.12"
          />
          <circle cx="62" cy="112" r="2.5" fill="currentColor" opacity="0.3" />
          <circle cx="112" cy="136" r="2.5" fill="currentColor" opacity="0.24" />
          <circle cx="148" cy="96" r="2.5" fill="currentColor" opacity="0.28" />
        </svg>
      );
    case "people":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <circle cx="80" cy="108" r="34" stroke="currentColor" strokeWidth="1" opacity="0.1" />
          <circle cx="80" cy="108" r="54" stroke="currentColor" strokeWidth="1" opacity="0.06" />
          <circle cx="54" cy="88" r="7" fill="currentColor" opacity="0.18" />
          <circle cx="104" cy="84" r="6" fill="currentColor" opacity="0.16" />
          <circle cx="80" cy="128" r="7.5" fill="currentColor" opacity="0.2" />
          <circle cx="48" cy="132" r="5" fill="currentColor" opacity="0.12" />
          <circle cx="116" cy="126" r="5.5" fill="currentColor" opacity="0.14" />
          <path d="M54 88L80 128L104 84M48 132L80 128L116 126" stroke="currentColor" strokeWidth="1" opacity="0.14" />
        </svg>
      );
    case "engineering":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <path d="M24 48H136M24 78H136M24 108H136M24 138H136M24 168H136" stroke="currentColor" strokeWidth="0.8" opacity="0.08" />
          <path d="M40 40V180M70 40V180M100 40V180M130 40V180" stroke="currentColor" strokeWidth="0.8" opacity="0.07" />
          <path d="M34 164L78 72L118 128L142 92" stroke="currentColor" strokeWidth="1.2" opacity="0.22" />
          <path d="M52 52H92V84H52V52Z" stroke="currentColor" strokeWidth="1" opacity="0.16" />
          <circle cx="78" cy="72" r="3" fill="currentColor" opacity="0.28" />
        </svg>
      );
    case "corporate":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <rect x="28" y="48" width="44" height="132" rx="8" stroke="currentColor" strokeWidth="1" opacity="0.14" />
          <rect x="80" y="68" width="52" height="112" rx="8" stroke="currentColor" strokeWidth="1" opacity="0.1" />
          <rect x="40" y="64" width="20" height="14" rx="3" fill="currentColor" opacity="0.08" />
          <rect x="40" y="90" width="20" height="14" rx="3" fill="currentColor" opacity="0.06" />
          <rect x="40" y="116" width="20" height="14" rx="3" fill="currentColor" opacity="0.07" />
          <rect x="92" y="88" width="28" height="18" rx="4" fill="currentColor" opacity="0.07" />
          <rect x="92" y="120" width="28" height="18" rx="4" fill="currentColor" opacity="0.05" />
          <path d="M28 180H132" stroke="currentColor" strokeWidth="1" opacity="0.12" />
        </svg>
      );
    case "assets":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <rect x="30" y="148" width="36" height="28" rx="5" fill="currentColor" opacity="0.1" />
          <rect x="72" y="132" width="36" height="44" rx="5" fill="currentColor" opacity="0.12" />
          <rect x="114" y="116" width="28" height="60" rx="5" fill="currentColor" opacity="0.08" />
          <path
            className="workspace-atmosphere-flow"
            d="M24 96C48 88 68 104 88 92C108 80 124 70 144 78"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.22"
          />
          <path d="M24 112C52 106 70 118 92 110C112 103 128 94 144 100" stroke="currentColor" strokeWidth="1" opacity="0.1" />
        </svg>
      );
    case "productivity":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <path d="M20 120C48 72 112 72 140 120" stroke="currentColor" strokeWidth="1.2" opacity="0.16" />
          <path d="M28 140C54 100 106 100 132 140" stroke="currentColor" strokeWidth="1.1" opacity="0.12" />
          <path d="M36 158C58 128 102 128 124 158" stroke="currentColor" strokeWidth="1" opacity="0.09" />
          <circle cx="52" cy="78" r="10" stroke="currentColor" strokeWidth="1" opacity="0.14" />
          <circle cx="108" cy="74" r="8" stroke="currentColor" strokeWidth="1" opacity="0.12" />
          <circle cx="80" cy="98" r="6" fill="currentColor" opacity="0.14" />
        </svg>
      );
    case "integrations":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <rect x="28" y="64" width="22" height="22" rx="6" stroke="currentColor" strokeWidth="1" opacity="0.18" />
          <rect x="110" y="58" width="22" height="22" rx="6" stroke="currentColor" strokeWidth="1" opacity="0.14" />
          <rect x="68" y="108" width="24" height="24" rx="7" stroke="currentColor" strokeWidth="1" opacity="0.2" />
          <rect x="34" y="148" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1" opacity="0.12" />
          <rect x="108" y="146" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1" opacity="0.12" />
          <path d="M50 75L68 118M110 69L92 118M80 132L44 158M80 132L118 156" stroke="currentColor" strokeWidth="1" opacity="0.16" />
        </svg>
      );
    default:
      return null;
  }
}

function CapabilityChip({ label, icon: Icon }: Capability) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.035] px-3.5 py-2 text-[12.5px] font-medium tracking-wide text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm sm:text-[13px]">
      <Icon className="h-3.5 w-3.5 shrink-0 text-sky-300/85 sm:h-4 sm:w-4" strokeWidth={1.6} aria-hidden />
      {label}
    </span>
  );
}

function ExpandedPanel({
  panelId,
  workspace,
}: {
  panelId: string;
  workspace: Workspace | null;
}) {
  const Icon = workspace?.icon;

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={workspace ? `${panelId}-${workspace.id}` : undefined}
      aria-hidden={!workspace}
      className={[
        "workspace-panel relative overflow-hidden rounded-[28px] border border-white/[0.1] p-6 sm:rounded-[32px] sm:p-8 lg:p-10",
        workspace ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.1] via-white/[0.03] to-transparent" aria-hidden />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl"
        style={{ background: workspace ? workspace.accent : "transparent", opacity: 0.18 }}
        aria-hidden
      />

      {workspace && Icon ? (
        <div className="relative">
          <div className="flex items-start gap-4 sm:gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/12 bg-white/[0.05] text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-16 sm:w-16">
              <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white sm:text-[1.65rem] lg:text-[1.85rem]">
                {workspace.title}
              </h3>
              <p className="mt-2.5 max-w-3xl text-[14px] leading-relaxed text-white/58 sm:mt-3 sm:text-[16px] sm:leading-relaxed lg:text-[17px]">
                {workspace.description}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5 sm:mt-8 sm:gap-3">
            {workspace.capabilities.map((capability) => (
              <CapabilityChip key={capability.label} {...capability} />
            ))}
          </div>

          {workspace.footnote ? (
            <p className="mt-6 max-w-4xl text-[13px] leading-relaxed text-white/45 sm:mt-7 sm:text-[14px]">
              {workspace.footnote}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="h-28" aria-hidden />
      )}
    </div>
  );
}

function WorkspaceTile({
  workspace,
  isOpen,
  panelId,
  onToggle,
}: {
  workspace: Workspace;
  isOpen: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  const Icon = workspace.icon;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isOpen}
      aria-expanded={isOpen}
      aria-controls={panelId}
      id={`${panelId}-${workspace.id}`}
      onClick={onToggle}
      className={[
        "workspace-tile group relative flex min-h-[232px] flex-col overflow-hidden rounded-[28px] text-left sm:min-h-[248px] sm:rounded-[30px]",
        "md:min-h-[268px] lg:min-h-[280px] lg:rounded-[28px] xl:min-h-[300px] xl:rounded-[24px] 2xl:min-h-[328px] 2xl:rounded-[28px]",
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]",
        isOpen ? "is-open" : "",
      ].join(" ")}
      style={{ "--tile-accent": workspace.accent } as CSSProperties}
    >
      <span className="workspace-tile-sheen" aria-hidden />
      <span className="workspace-tile-glow" aria-hidden />

      <span
        className="pointer-events-none absolute inset-0 text-sky-200/80"
        style={{ color: workspace.accent }}
        aria-hidden
      >
        <Atmosphere visual={workspace.visual} />
      </span>

      <span className="relative z-[1] grid h-full grid-rows-[auto_auto_1fr] p-6 sm:p-7 md:p-7 lg:p-8 xl:p-4 2xl:p-5">
        <span className="workspace-tile-icon flex h-16 w-16 items-center justify-center rounded-[22px] sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-[24px] md:h-[4.75rem] md:w-[4.75rem] lg:h-20 lg:w-20 lg:rounded-[26px] xl:h-14 xl:w-14 xl:rounded-[18px] 2xl:h-16 2xl:w-16 2xl:rounded-[22px]">
          <Icon
            className="h-8 w-8 text-white sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-10 lg:w-10 xl:h-7 xl:w-7 2xl:h-8 2xl:w-8"
            strokeWidth={1.35}
            aria-hidden
          />
        </span>

        <span className="mt-5 grid grid-rows-[2.6rem_auto] gap-1.5 sm:mt-5 sm:grid-rows-[2.8rem_auto] sm:gap-2 md:mt-5 md:grid-rows-[3.4rem_2.2rem] md:gap-2 lg:mt-6 lg:grid-rows-[3.6rem_2.3rem] xl:mt-5 xl:grid-rows-[4.05rem_2.4rem] xl:gap-1.5 2xl:mt-5 2xl:grid-rows-[4.5rem_2.6rem] 2xl:gap-2">
          <span className="self-start line-clamp-2 text-[1.2rem] font-semibold leading-[1.2] tracking-[-0.03em] text-white sm:text-[1.28rem] md:line-clamp-2 md:text-[1.32rem] lg:text-[1.35rem] xl:line-clamp-3 xl:text-[15px] xl:leading-[1.35] 2xl:text-[16.5px] 2xl:leading-[1.35]">
            {workspace.title}
          </span>
          <span className="self-start line-clamp-2 text-[13px] font-medium leading-snug tracking-[0.01em] text-white/40 sm:text-[13.5px] md:text-[13.5px] lg:text-[14px] xl:text-[11.5px] xl:leading-[1.35] 2xl:text-[12.5px]">
            {workspace.descriptor}
          </span>
        </span>

        <span aria-hidden className="min-h-0" />
      </span>
    </button>
  );
}

export default function HomeWorkspaceExplorer() {
  const [openId, setOpenId] = useState<string | null>(null);
  const panelId = useId();
  const openWorkspace = WORKSPACES.find((workspace) => workspace.id === openId) ?? null;

  function toggleWorkspace(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <div
      className="relative mt-10 sm:mt-11 lg:mt-12"
      onKeyDown={(event) => {
        if (event.key === "Escape" && openId) {
          setOpenId(null);
        }
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-[8%] top-[12%] h-[55%] rounded-full opacity-70 blur-3xl"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(56,189,248,0.09), rgba(37,99,235,0.04) 45%, transparent 70%)",
        }}
      />

      <div
        role="tablist"
        aria-label="Unit311 Central workspaces"
        className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 md:gap-5 lg:gap-5 xl:grid-cols-9 xl:gap-3 2xl:gap-3.5"
      >
        {WORKSPACES.map((workspace) => (
          <WorkspaceTile
            key={workspace.id}
            workspace={workspace}
            isOpen={openId === workspace.id}
            panelId={panelId}
            onToggle={() => toggleWorkspace(workspace.id)}
          />
        ))}
      </div>

      <div
        className={[
          "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          openWorkspace ? "mt-5 grid-rows-[1fr] sm:mt-6 lg:mt-7" : "mt-0 grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="min-h-0 overflow-hidden">
          <ExpandedPanel panelId={panelId} workspace={openWorkspace} />
        </div>
      </div>
    </div>
  );
}

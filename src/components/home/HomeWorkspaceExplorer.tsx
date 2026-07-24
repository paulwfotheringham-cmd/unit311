"use client";

import { useId, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Banknote,
  Boxes,
  Briefcase,
  Cable,
  ChartColumn,
  ClipboardList,
  Cloud,
  Cpu,
  Database,
  FolderKanban,
  Gauge,
  GraduationCap,
  Handshake,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Package,
  Plug,
  ShieldCheck,
  Target,
  Truck,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

type Capability = {
  label: string;
  detail: string;
  icon: LucideIcon;
};

type FeaturedCapabilities = [Capability, Capability, Capability, Capability];

type WorkspaceVisual =
  | "central"
  | "clients"
  | "finance"
  | "people"
  | "technology"
  | "operations"
  | "productivity"
  | "integrations";

type WorkspaceAccent = {
  /** Comma-separated RGB for CSS variables */
  rgb: string;
  label: string;
};

type Workspace = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  visual: WorkspaceVisual;
  accent: WorkspaceAccent;
  featuredCapabilities: FeaturedCapabilities;
  additionalCapabilityCount: number;
};

const WORKSPACES: Workspace[] = [
  {
    id: "business-central",
    title: "Business Central",
    subtitle: "Executive oversight",
    description:
      "Executive oversight, strategic planning, AI-powered decision making and enterprise-wide business management.",
    icon: LayoutDashboard,
    visual: "central",
    accent: { rgb: "59, 130, 246", label: "blue" },
    featuredCapabilities: [
      {
        label: "Executive Dashboard",
        detail: "Live executive KPIs, operational insights and strategic reporting.",
        icon: Gauge,
      },
      {
        label: "Client Management",
        detail: "Organisation-wide client visibility with relationship context.",
        icon: Users,
      },
      {
        label: "Sales & Onboarding",
        detail: "Move opportunities from discovery through structured onboarding.",
        icon: Handshake,
      },
      {
        label: "Project Portfolio",
        detail: "Portfolio health, delivery risk and progress in one executive view.",
        icon: ChartColumn,
      },
    ],
    additionalCapabilityCount: 2,
  },
  {
    id: "clients-projects",
    title: "Clients & Projects",
    subtitle: "Relationships & delivery",
    description:
      "Manage client relationships, pipeline, onboarding and project delivery in one connected workspace.",
    icon: Briefcase,
    visual: "clients",
    accent: { rgb: "20, 184, 166", label: "teal" },
    featuredCapabilities: [
      {
        label: "Client Directory",
        detail: "Accounts, contacts and commercial history in one place.",
        icon: Users,
      },
      {
        label: "CRM & Pipeline",
        detail: "Qualify demand and advance opportunities with clear stage ownership.",
        icon: Handshake,
      },
      {
        label: "Client Onboarding",
        detail: "Standardise kickoff so every new client starts consistently.",
        icon: ClipboardList,
      },
      {
        label: "Project Delivery",
        detail: "Govern internal and external work with shared visibility.",
        icon: FolderKanban,
      },
    ],
    additionalCapabilityCount: 2,
  },
  {
    id: "financials",
    title: "Financials",
    subtitle: "Finance & reporting",
    description:
      "Run finance operations, banking connections and reporting from a unified financial command centre.",
    icon: Wallet,
    visual: "finance",
    accent: { rgb: "16, 185, 129", label: "emerald" },
    featuredCapabilities: [
      {
        label: "Financial Dashboard",
        detail: "Cash, runway and performance signals in a single operating picture.",
        icon: ChartColumn,
      },
      {
        label: "Receivables & Payables",
        detail: "Track invoices, collections and supplier obligations clearly.",
        icon: Banknote,
      },
      {
        label: "Expenses",
        detail: "Capture and review spend with policy-aware workflows.",
        icon: ClipboardList,
      },
      {
        label: "Financial Reporting",
        detail: "Produce board-ready reporting without spreadsheet sprawl.",
        icon: Activity,
      },
    ],
    additionalCapabilityCount: 2,
  },
  {
    id: "hr-people",
    title: "HR & People",
    subtitle: "Workforce management",
    description:
      "Coordinate workforce management across people, leave, performance, payroll and training.",
    icon: UsersRound,
    visual: "people",
    accent: { rgb: "168, 85, 247", label: "purple" },
    featuredCapabilities: [
      {
        label: "HR Dashboard",
        detail: "See headcount, capacity and people risk before it becomes friction.",
        icon: Gauge,
      },
      {
        label: "Employees",
        detail: "Maintain employee records, roles and organisational structure.",
        icon: Users,
      },
      {
        label: "Leave & Performance",
        detail: "Balance time-off and track goals, reviews and development.",
        icon: Target,
      },
      {
        label: "Training",
        detail: "Plan learning paths and keep workforce skills current.",
        icon: GraduationCap,
      },
    ],
    additionalCapabilityCount: 2,
  },
  {
    id: "technology-management",
    title: "Technology Management",
    subtitle: "Technology estate",
    description:
      "Manage your organisation's complete technology estate across devices, software, infrastructure, cloud, identity and security.",
    icon: Cpu,
    visual: "technology",
    accent: { rgb: "56, 189, 248", label: "sky" },
    featuredCapabilities: [
      {
        label: "Devices & Assets",
        detail: "Track hardware, assignments, warranties and the physical estate.",
        icon: HardDrive,
      },
      {
        label: "Software & SaaS",
        detail: "Govern licences, subscriptions, renewals and application inventory.",
        icon: KeyRound,
      },
      {
        label: "Infrastructure & Cloud",
        detail: "Operate servers, platforms and cloud footprint across providers.",
        icon: Cloud,
      },
      {
        label: "Identity & Security",
        detail: "Coordinate identity, access, certificates and security controls.",
        icon: ShieldCheck,
      },
    ],
    additionalCapabilityCount: 8,
  },
  {
    id: "operations",
    title: "Operations",
    subtitle: "Inventory & logistics",
    description:
      "Run day-to-day operations across assets, inventory, logistics movements and procurement.",
    icon: Package,
    visual: "operations",
    accent: { rgb: "6, 182, 212", label: "cyan" },
    featuredCapabilities: [
      {
        label: "Asset Register",
        detail: "Know what you own, where it sits and who is accountable.",
        icon: Boxes,
      },
      {
        label: "Inventory",
        detail: "Monitor stock levels and movement across locations.",
        icon: Package,
      },
      {
        label: "Logistics",
        detail: "Coordinate shipments, transfers and operational flow.",
        icon: Truck,
      },
      {
        label: "Procurement",
        detail: "Run purchasing with visibility from request to receipt.",
        icon: ClipboardList,
      },
    ],
    additionalCapabilityCount: 2,
  },
  {
    id: "productivity",
    title: "Productivity & Collaboration",
    subtitle: "Communication & knowledge",
    description:
      "Centralise communication, knowledge, calendar and support across your organisation.",
    icon: MessageSquare,
    visual: "productivity",
    accent: { rgb: "99, 102, 241", label: "indigo" },
    featuredCapabilities: [
      {
        label: "Knowledge Repository",
        detail: "Keep institutional knowledge searchable and structured.",
        icon: Database,
      },
      {
        label: "Email & Calendar",
        detail: "Operate shared inboxes and schedules in business context.",
        icon: Mail,
      },
      {
        label: "Communications",
        detail: "Connect teams through organised channels and threads.",
        icon: MessageSquare,
      },
      {
        label: "Support Desk",
        detail: "Handle support conversations with clear ownership and history.",
        icon: Cable,
      },
    ],
    additionalCapabilityCount: 2,
  },
  {
    id: "integrations",
    title: "Business Integrations",
    subtitle: "Connect your existing systems",
    description:
      "Connect Unit311 Central to the specialist systems your business already relies on—integrate rather than replace.",
    icon: Plug,
    visual: "integrations",
    accent: { rgb: "100, 116, 139", label: "blue-grey" },
    featuredCapabilities: [
      {
        label: "Microsoft 365",
        detail: "Connect identity, documents and collaboration into the workspace.",
        icon: Cloud,
      },
      {
        label: "Finance Systems",
        detail: "Sync accounting platforms without forcing a rip-and-replace.",
        icon: Wallet,
      },
      {
        label: "CRM Platforms",
        detail: "Bridge commercial systems so pipeline data stays current.",
        icon: Target,
      },
      {
        label: "APIs & Integrations",
        detail: "Extend Unit311 Central through secure, composable interfaces.",
        icon: Plug,
      },
    ],
    additionalCapabilityCount: 2,
  },
];

function accentStyle(accent: WorkspaceAccent): CSSProperties {
  return {
    "--ws-accent-rgb": accent.rgb,
    "--tile-accent": `rgba(${accent.rgb}, 0.55)`,
  } as CSSProperties;
}

function PanelAtmosphere({ visual }: { visual: WorkspaceVisual }) {
  switch (visual) {
    case "central":
      return (
        <svg viewBox="0 0 420 320" fill="none" aria-hidden className="h-full w-full">
          <circle cx="210" cy="150" r="18" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="110" cy="90" r="10" stroke="currentColor" strokeWidth="1" />
          <circle cx="310" cy="88" r="10" stroke="currentColor" strokeWidth="1" />
          <circle cx="90" cy="210" r="9" stroke="currentColor" strokeWidth="1" />
          <circle cx="330" cy="208" r="9" stroke="currentColor" strokeWidth="1" />
          <circle cx="210" cy="250" r="11" stroke="currentColor" strokeWidth="1" />
          <path
            d="M120 96L194 140M300 96L226 140M100 202L194 162M320 202L226 162M210 168V239"
            stroke="currentColor"
            strokeWidth="1"
          />
          <rect x="158" y="118" width="104" height="64" rx="12" stroke="currentColor" strokeWidth="1.1" />
          <path d="M172 138H248M172 152H228M172 166H238" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
    case "clients":
      return (
        <svg viewBox="0 0 420 320" fill="none" aria-hidden className="h-full w-full">
          <path d="M70 170C120 90 180 80 210 120C240 80 300 90 350 170" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="100" cy="150" r="8" stroke="currentColor" strokeWidth="1" />
          <circle cx="170" cy="110" r="8" stroke="currentColor" strokeWidth="1" />
          <circle cx="250" cy="112" r="8" stroke="currentColor" strokeWidth="1" />
          <circle cx="320" cy="148" r="8" stroke="currentColor" strokeWidth="1" />
          <circle cx="210" cy="190" r="12" stroke="currentColor" strokeWidth="1.2" />
          <path d="M108 156L198 184M178 118L204 178M242 120L220 178M312 154L222 184" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
    case "finance":
      return (
        <svg viewBox="0 0 420 320" fill="none" aria-hidden className="h-full w-full">
          <path d="M60 240L120 190L170 210L230 140L290 170L360 90" stroke="currentColor" strokeWidth="1.4" />
          <path d="M60 260L120 220L170 235L230 180L290 200L360 130" stroke="currentColor" strokeWidth="1" opacity="0.55" />
          <rect x="80" y="70" width="18" height="70" rx="4" stroke="currentColor" strokeWidth="1" />
          <rect x="120" y="95" width="18" height="45" rx="4" stroke="currentColor" strokeWidth="1" />
          <rect x="160" y="55" width="18" height="85" rx="4" stroke="currentColor" strokeWidth="1" />
          <circle cx="230" cy="140" r="3.5" fill="currentColor" />
          <circle cx="290" cy="170" r="3.5" fill="currentColor" />
          <circle cx="360" cy="90" r="3.5" fill="currentColor" />
        </svg>
      );
    case "people":
      return (
        <svg viewBox="0 0 420 320" fill="none" aria-hidden className="h-full w-full">
          <circle cx="210" cy="150" r="58" stroke="currentColor" strokeWidth="1" />
          <circle cx="210" cy="150" r="96" stroke="currentColor" strokeWidth="1" opacity="0.55" />
          <circle cx="150" cy="120" r="11" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="270" cy="118" r="11" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="210" cy="180" r="13" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="130" cy="200" r="9" stroke="currentColor" strokeWidth="1" />
          <circle cx="290" cy="198" r="9" stroke="currentColor" strokeWidth="1" />
          <path d="M160 128L200 170M260 126L220 170M140 194L198 184M280 192L222 184" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
    case "technology":
      return (
        <svg viewBox="0 0 420 320" fill="none" aria-hidden className="h-full w-full">
          <rect x="70" y="70" width="90" height="60" rx="12" stroke="currentColor" strokeWidth="1.1" />
          <rect x="180" y="70" width="90" height="60" rx="12" stroke="currentColor" strokeWidth="1.1" />
          <rect x="290" y="70" width="60" height="60" rx="12" stroke="currentColor" strokeWidth="1.1" />
          <rect x="110" y="170" width="200" height="80" rx="14" stroke="currentColor" strokeWidth="1.2" />
          <path d="M115 100H180M270 100H290M160 130V170M225 130V170M320 130V190" stroke="currentColor" strokeWidth="1" />
          <circle cx="160" cy="210" r="4" fill="currentColor" />
          <circle cx="210" cy="210" r="4" fill="currentColor" />
          <circle cx="260" cy="210" r="4" fill="currentColor" />
        </svg>
      );
    case "operations":
      return (
        <svg viewBox="0 0 420 320" fill="none" aria-hidden className="h-full w-full">
          <rect x="70" y="180" width="70" height="50" rx="8" stroke="currentColor" strokeWidth="1.1" />
          <rect x="160" y="150" width="70" height="80" rx="8" stroke="currentColor" strokeWidth="1.1" />
          <rect x="250" y="120" width="70" height="110" rx="8" stroke="currentColor" strokeWidth="1.1" />
          <path d="M60 100C120 80 170 120 220 95C270 70 310 70 360 95" stroke="currentColor" strokeWidth="1.2" />
          <path d="M60 124C130 110 170 145 230 120C280 100 320 100 360 118" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <circle cx="105" cy="98" r="3" fill="currentColor" />
          <circle cx="220" cy="95" r="3" fill="currentColor" />
          <circle cx="330" cy="88" r="3" fill="currentColor" />
        </svg>
      );
    case "productivity":
      return (
        <svg viewBox="0 0 420 320" fill="none" aria-hidden className="h-full w-full">
          <path d="M70 190C130 100 290 100 350 190" stroke="currentColor" strokeWidth="1.2" />
          <path d="M90 220C145 145 275 145 330 220" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <path d="M110 245C160 185 260 185 310 245" stroke="currentColor" strokeWidth="1" opacity="0.45" />
          <circle cx="140" cy="120" r="16" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="280" cy="118" r="14" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="210" cy="155" r="10" stroke="currentColor" strokeWidth="1.1" />
          <path d="M156 128L200 150M264 128L220 150" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
    case "integrations":
      return (
        <svg viewBox="0 0 420 320" fill="none" aria-hidden className="h-full w-full">
          <rect x="70" y="80" width="48" height="48" rx="12" stroke="currentColor" strokeWidth="1.1" />
          <rect x="300" y="78" width="48" height="48" rx="12" stroke="currentColor" strokeWidth="1.1" />
          <rect x="186" y="136" width="48" height="48" rx="12" stroke="currentColor" strokeWidth="1.2" />
          <rect x="90" y="220" width="42" height="42" rx="11" stroke="currentColor" strokeWidth="1.1" />
          <rect x="290" y="218" width="42" height="42" rx="11" stroke="currentColor" strokeWidth="1.1" />
          <path d="M118 104L186 150M300 102L234 150M210 184L132 230M210 184L290 230" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      );
    default:
      return null;
  }
}

function TileAtmosphere({ visual }: { visual: WorkspaceVisual }) {
  switch (visual) {
    case "central":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <rect x="18" y="42" width="124" height="10" rx="5" fill="currentColor" opacity="0.1" />
          <rect x="18" y="62" width="92" height="8" rx="4" fill="currentColor" opacity="0.07" />
          <rect x="18" y="84" width="124" height="38" rx="10" fill="currentColor" opacity="0.06" />
          <rect x="18" y="132" width="58" height="34" rx="9" fill="currentColor" opacity="0.08" />
          <rect x="84" y="132" width="58" height="34" rx="9" fill="currentColor" opacity="0.05" />
        </svg>
      );
    case "clients":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <path d="M42 70C58 92 78 98 104 86" stroke="currentColor" strokeWidth="1.2" opacity="0.22" />
          <path d="M36 128C62 112 96 118 124 146" stroke="currentColor" strokeWidth="1.2" opacity="0.18" />
          <circle cx="42" cy="70" r="5" fill="currentColor" opacity="0.28" />
          <circle cx="104" cy="86" r="4.5" fill="currentColor" opacity="0.22" />
          <circle cx="36" cy="128" r="4" fill="currentColor" opacity="0.2" />
          <circle cx="124" cy="146" r="5" fill="currentColor" opacity="0.18" />
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
          <circle cx="62" cy="112" r="2.5" fill="currentColor" opacity="0.3" />
          <circle cx="112" cy="136" r="2.5" fill="currentColor" opacity="0.24" />
          <circle cx="148" cy="96" r="2.5" fill="currentColor" opacity="0.28" />
        </svg>
      );
    case "people":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <circle cx="80" cy="108" r="34" stroke="currentColor" strokeWidth="1" opacity="0.1" />
          <circle cx="54" cy="88" r="7" fill="currentColor" opacity="0.18" />
          <circle cx="104" cy="84" r="6" fill="currentColor" opacity="0.16" />
          <circle cx="80" cy="128" r="7.5" fill="currentColor" opacity="0.2" />
        </svg>
      );
    case "technology":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <rect x="28" y="56" width="40" height="28" rx="7" stroke="currentColor" strokeWidth="1" opacity="0.18" />
          <rect x="78" y="56" width="40" height="28" rx="7" stroke="currentColor" strokeWidth="1" opacity="0.14" />
          <rect x="48" y="112" width="64" height="40" rx="10" stroke="currentColor" strokeWidth="1" opacity="0.2" />
          <path d="M48 70H78M68 84V112M98 84V112" stroke="currentColor" strokeWidth="1" opacity="0.14" />
        </svg>
      );
    case "operations":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <rect x="30" y="148" width="36" height="28" rx="5" fill="currentColor" opacity="0.1" />
          <rect x="72" y="132" width="36" height="44" rx="5" fill="currentColor" opacity="0.12" />
          <rect x="114" y="116" width="28" height="60" rx="5" fill="currentColor" opacity="0.08" />
        </svg>
      );
    case "productivity":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <path d="M20 120C48 72 112 72 140 120" stroke="currentColor" strokeWidth="1.2" opacity="0.16" />
          <circle cx="52" cy="78" r="10" stroke="currentColor" strokeWidth="1" opacity="0.14" />
          <circle cx="108" cy="74" r="8" stroke="currentColor" strokeWidth="1" opacity="0.12" />
        </svg>
      );
    case "integrations":
      return (
        <svg className="workspace-atmosphere" viewBox="0 0 160 220" fill="none" aria-hidden>
          <rect x="28" y="64" width="22" height="22" rx="6" stroke="currentColor" strokeWidth="1" opacity="0.18" />
          <rect x="110" y="58" width="22" height="22" rx="6" stroke="currentColor" strokeWidth="1" opacity="0.14" />
          <rect x="68" y="108" width="24" height="24" rx="7" stroke="currentColor" strokeWidth="1" opacity="0.2" />
          <path d="M50 75L68 118M110 69L92 118" stroke="currentColor" strokeWidth="1" opacity="0.16" />
        </svg>
      );
    default:
      return null;
  }
}

function WorkspaceOverviewPanel({ workspace }: { workspace: Workspace }) {
  const Icon = workspace.icon;

  return (
    <div className="relative h-[22rem] sm:h-[23.5rem] lg:h-[22rem]">
      <div
        className="workspace-panel-atmosphere pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] lg:block"
        aria-hidden
      >
        <PanelAtmosphere visual={workspace.visual} />
      </div>

      <div className="relative z-[1] flex h-full flex-col lg:max-w-[62%] xl:max-w-[58%]">
        <div className="flex items-start gap-3.5 sm:gap-5">
          <span className="workspace-hero-icon shrink-0">
            <Icon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" strokeWidth={1.45} aria-hidden />
          </span>
          <div className="min-w-0 pt-0.5 sm:pt-1">
            <h3 className="truncate text-[1.35rem] font-semibold tracking-[-0.035em] text-white sm:text-[1.65rem] lg:text-[2rem]">
              {workspace.title}
            </h3>
            <p className="workspace-panel-kicker mt-1.5 truncate text-[13px] font-semibold tracking-[0.01em] sm:text-[14px]">
              {workspace.subtitle}
            </p>
            <p className="mt-3 line-clamp-2 max-w-2xl text-[14px] leading-relaxed text-white/68 sm:mt-4 sm:text-[15px] sm:leading-relaxed">
              {workspace.description}
            </p>
          </div>
        </div>

        <section className="mt-5 flex min-h-0 flex-1 flex-col sm:mt-6">
          <h4 className="workspace-panel-section-label text-[11px] font-semibold uppercase tracking-[0.14em]">
            Key capabilities
          </h4>
          <ul className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3" style={{ gridTemplateRows: "repeat(2, minmax(0, 1fr))" }}>
            {workspace.featuredCapabilities.map((capability) => {
              const CapIcon = capability.icon;
              return (
                <li key={capability.label} className="workspace-feature-card !items-start">
                  <span className="workspace-feature-icon">
                    <CapIcon className="h-4 w-4" strokeWidth={1.55} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-1 block text-[13px] font-semibold leading-snug text-white/90 sm:text-[14px]">
                      {capability.label}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-white/48 sm:text-[13px]">
                      {capability.detail}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 h-4 text-[12px] leading-none text-white/42 sm:text-[13px]">
            {workspace.additionalCapabilityCount > 0
              ? `Plus ${workspace.additionalCapabilityCount} additional capabilities...`
              : "\u00a0"}
          </p>
        </section>
      </div>
    </div>
  );
}

function ExpandedPanel({
  panelId,
  workspace,
  className = "",
}: {
  panelId: string;
  workspace: Workspace;
  className?: string;
}) {
  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={`${panelId}-${workspace.id}`}
      className={[
        "workspace-panel is-detached relative overflow-hidden border px-4 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-6",
        "rounded-[20px] sm:rounded-[26px] lg:rounded-[28px]",
        className,
      ].join(" ")}
      style={accentStyle(workspace.accent)}
      data-workspace={workspace.id}
    >
      <div className="workspace-panel-glow" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" aria-hidden />
      <div key={workspace.id} className="workspace-panel-fade relative z-[1]">
        <WorkspaceOverviewPanel workspace={workspace} />
      </div>
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
        "workspace-tile group relative flex flex-col overflow-hidden rounded-[16px] text-left sm:rounded-[18px]",
        "min-h-[7.75rem] sm:min-h-[8.75rem] md:min-h-[9.25rem] xl:min-h-[9rem] xl:rounded-[14px] 2xl:min-h-[9.35rem] 2xl:rounded-[16px]",
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]",
        isOpen ? "is-open is-detached" : "",
      ].join(" ")}
      style={accentStyle(workspace.accent)}
    >
      <span className="workspace-tile-sheen" aria-hidden />
      <span className="workspace-tile-glow" aria-hidden />

      <span
        className="pointer-events-none absolute inset-0"
        style={{ color: `rgba(${workspace.accent.rgb}, 0.85)` }}
        aria-hidden
      >
        <TileAtmosphere visual={workspace.visual} />
      </span>

      <span className="relative z-[1] flex h-full flex-col justify-between gap-2 p-3 sm:gap-2.5 sm:p-3.5 md:gap-3 md:p-4 xl:gap-2.5 xl:p-3 2xl:gap-3 2xl:p-3.5">
        <span className="workspace-tile-icon flex h-10 w-10 items-center justify-center rounded-[12px] sm:h-11 sm:w-11 sm:rounded-[13px] md:h-12 md:w-12 md:rounded-[14px] xl:h-11 xl:w-11 xl:rounded-[12px] 2xl:h-11 2xl:w-11">
          <Icon
            className="h-5 w-5 text-white sm:h-5 sm:w-5 md:h-6 md:w-6 xl:h-5 xl:w-5"
            strokeWidth={1.45}
            aria-hidden
          />
        </span>

        <span className="flex min-h-0 flex-col gap-1 sm:gap-1.5">
          <span className="line-clamp-2 text-[0.95rem] font-semibold leading-[1.2] tracking-[-0.03em] text-white sm:text-[1rem] md:text-[1.02rem] xl:line-clamp-3 xl:text-[13px] xl:leading-[1.25] 2xl:text-[13.5px]">
            {workspace.title}
          </span>
          <span className="line-clamp-2 text-[12px] font-medium leading-snug tracking-[0.01em] text-white/40 sm:text-[12px] md:text-[12.5px] xl:text-[11px] xl:leading-[1.3] 2xl:text-[11.5px]">
            {workspace.subtitle}
          </span>
        </span>
      </span>
    </button>
  );
}

export default function HomeWorkspaceExplorer() {
  const [openId, setOpenId] = useState<string>(WORKSPACES[0].id);
  const panelId = useId();
  const openWorkspace = WORKSPACES.find((workspace) => workspace.id === openId) ?? WORKSPACES[0];

  function selectWorkspace(id: string) {
    setOpenId(id);
  }

  return (
    <div
      className="workspace-explorer relative mt-8 sm:mt-11 lg:mt-12"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpenId(WORKSPACES[0].id);
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
        className="workspace-explorer-open relative grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-3 lg:grid-cols-4 lg:gap-3 xl:grid-cols-4 xl:gap-2.5 2xl:grid-cols-8 2xl:gap-2.5"
      >
        {WORKSPACES.map((workspace) => (
          <WorkspaceTile
            key={workspace.id}
            workspace={workspace}
            isOpen={openId === workspace.id}
            panelId={panelId}
            onToggle={() => selectWorkspace(workspace.id)}
          />
        ))}
      </div>

      <div className="mt-3 sm:mt-4">
        <ExpandedPanel panelId={panelId} workspace={openWorkspace} />
      </div>
    </div>
  );
}

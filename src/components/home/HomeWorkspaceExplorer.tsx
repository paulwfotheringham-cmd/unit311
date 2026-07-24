"use client";

import Link from "next/link";
import { useId, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
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
  Wallet,
  Wrench,
} from "lucide-react";

type Capability = {
  label: string;
  icon: LucideIcon;
};

type QuickAction = {
  label: string;
  href: string;
};

type WorkspaceVisual = "central" | "clients" | "finance" | "people" | "engineering" | "corporate" | "assets" | "productivity" | "integrations";

type Workspace = {
  id: string;
  title: string;
  descriptor: string;
  description: string;
  aiSummary: string;
  icon: LucideIcon;
  visual: WorkspaceVisual;
  accent: string;
  capabilities: Capability[];
  highlights?: string[];
  quickActions?: QuickAction[];
  footnote?: string;
};

const WORKSPACES: Workspace[] = [
  {
    id: "business-central",
    title: "Business Central",
    descriptor: "Executive oversight",
    description:
      "Executive oversight, strategic planning, AI-powered decision making and enterprise-wide workflow automation.",
    aiSummary:
      "Surfaces what needs attention across the organisation — priorities, approvals and strategic signals — so leadership can act without chasing updates.",
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
    aiSummary:
      "Keeps commercial and delivery teams aligned — from first conversation through onboarding to live project progress.",
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
    aiSummary:
      "Gives finance a single operating picture — cash, receivables, payables and reporting — without jumping between systems.",
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
    aiSummary:
      "Helps people leaders see capacity, leave risk and performance signals in one place before issues become operational friction.",
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
    aiSummary:
      "Connects utilisation, capacity and delivery risk so engineering leads can balance commitments with quality and compliance.",
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
    aiSummary:
      "Centralises the records and relationships that keep the company governed — structure, contracts, licences and advisers.",
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
    aiSummary:
      "Gives operations clarity on where assets and stock sit, what is moving, and what needs procurement attention.",
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
    aiSummary:
      "Pulls messaging, knowledge, calendar and support into one collaboration layer so work stays visible and searchable.",
    icon: MessageSquare,
    visual: "productivity",
    accent: "rgba(165, 180, 252, 0.5)",
    capabilities: [
      { label: "Information Repository", icon: Database },
      { label: "Email", icon: Mail },
      { label: "Calendar", icon: CalendarDays },
      { label: "Communications", icon: MessageSquare },
      { label: "Calendar", icon: CalendarDays },
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
    aiSummary:
      "Designed to sit alongside your stack — connecting Microsoft, finance, CRM and delivery tools without forcing rip-and-replace.",
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

function ExpandedPanel({
  panelId,
  workspace,
}: {
  panelId: string;
  workspace: Workspace | null;
}) {
  const Icon = workspace?.icon;
  const keyCapabilities = workspace?.capabilities.slice(0, 6) ?? [];
  const highlights =
    workspace?.highlights ??
    (workspace?.footnote ? [workspace.footnote] : []);
  const quickActions: QuickAction[] = workspace?.quickActions ?? [
    { label: "Book a founder session", href: "/book" },
    { label: "Create your workspace", href: "/signup" },
  ];

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={workspace ? `${panelId}-${workspace.id}` : undefined}
      aria-hidden={!workspace}
      className={[
        "workspace-panel relative overflow-hidden border border-white/[0.1] px-5 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-6",
        "rounded-b-[22px] rounded-t-none sm:rounded-b-[26px] lg:rounded-b-[28px]",
        workspace ? "" : "pointer-events-none",
      ].join(" ")}
      style={
        workspace
          ? ({ "--tile-accent": workspace.accent } as CSSProperties)
          : undefined
      }
    >
      <div className="workspace-panel-bridge" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent" aria-hidden />
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full blur-3xl"
        style={{ background: workspace ? workspace.accent : "transparent", opacity: 0.14 }}
        aria-hidden
      />

      {workspace && Icon ? (
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8 xl:gap-10">
          <div className="min-w-0 space-y-5 sm:space-y-6">
            <div className="flex items-start gap-3.5 sm:gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/12 bg-white/[0.05] text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-12 sm:w-12 sm:rounded-[17px]">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/75">
                  Workspace overview
                </p>
                <h3 className="mt-1 text-[1.25rem] font-semibold tracking-[-0.02em] text-white sm:text-[1.45rem] lg:text-[1.6rem]">
                  {workspace.title}
                </h3>
                <p className="mt-1 text-[12.5px] font-medium text-white/42 sm:text-[13px]">
                  {workspace.descriptor}
                </p>
              </div>
            </div>

            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                What this workspace is for
              </h4>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/68 sm:text-[15px] sm:leading-relaxed">
                {workspace.description}
              </p>
            </section>

            <section className="rounded-2xl border border-sky-400/15 bg-sky-500/[0.06] px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2 text-sky-200/90">
                <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} aria-hidden />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                  AI summary
                </h4>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/72 sm:text-[14.5px]">
                {workspace.aiSummary}
              </p>
            </section>

            {highlights.length > 0 ? (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  Important information
                </h4>
                <ul className="mt-2.5 space-y-2">
                  {highlights.map((item) => (
                    <li
                      key={item}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5 text-[13px] leading-relaxed text-white/58 sm:text-[13.5px]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="min-w-0 space-y-5 sm:space-y-6">
            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Key capabilities
              </h4>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {keyCapabilities.map((capability) => {
                  const CapIcon = capability.icon;
                  return (
                    <li
                      key={capability.label}
                      className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sky-300/85">
                        <CapIcon className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                      </span>
                      <span className="min-w-0 text-[13px] font-medium leading-snug text-white/78">
                        {capability.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {workspace.capabilities.length > keyCapabilities.length ? (
                <p className="mt-2.5 text-[12px] text-white/35">
                  Plus {workspace.capabilities.length - keyCapabilities.length} more modules inside
                  the live workspace.
                </p>
              ) : null}
            </section>

            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Quick actions
              </h4>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="inline-flex items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-[13px] font-semibold text-white/85 transition-colors hover:border-sky-300/35 hover:bg-sky-500/10 hover:text-white sm:min-w-[12.5rem]"
                  >
                    <span>{action.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-sky-300/80" aria-hidden />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="h-24" aria-hidden />
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
        "workspace-tile group relative flex flex-col overflow-hidden rounded-[16px] text-left sm:rounded-[18px]",
        // Balanced selector height — ~15–20% taller than ultra-compact, still content-led.
        "min-h-[9.25rem] sm:min-h-[9.75rem] xl:min-h-[8.85rem] xl:rounded-[14px] 2xl:min-h-[9.35rem] 2xl:rounded-[16px]",
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

      <span className="relative z-[1] flex h-full flex-col justify-between gap-2.5 p-3.5 sm:gap-3 sm:p-4 md:p-4 lg:gap-3 lg:p-4 xl:gap-2.5 xl:p-3 2xl:gap-3 2xl:p-3.5">
        <span className="workspace-tile-icon flex h-11 w-11 items-center justify-center rounded-[12px] sm:h-12 sm:w-12 sm:rounded-[14px] md:h-[3.15rem] md:w-[3.15rem] lg:h-12 lg:w-12 xl:h-10 xl:w-10 xl:rounded-[11px] 2xl:h-11 2xl:w-11 2xl:rounded-[12px]">
          <Icon
            className="h-5 w-5 text-white sm:h-[1.35rem] sm:w-[1.35rem] md:h-6 md:w-6 lg:h-6 lg:w-6 xl:h-[1.15rem] xl:w-[1.15rem] 2xl:h-5 2xl:w-5"
            strokeWidth={1.45}
            aria-hidden
          />
        </span>

        <span className="flex min-h-0 flex-col gap-1 sm:gap-1.5">
          <span className="line-clamp-2 text-[0.95rem] font-semibold leading-[1.2] tracking-[-0.03em] text-white sm:text-[1rem] md:text-[1.02rem] lg:text-[1.05rem] xl:line-clamp-3 xl:text-[12.5px] xl:leading-[1.25] 2xl:text-[13.5px] 2xl:leading-[1.25]">
            {workspace.title}
          </span>
          <span className="line-clamp-2 text-[11px] font-medium leading-snug tracking-[0.01em] text-white/40 sm:text-[11.5px] md:text-[12px] lg:text-[12px] xl:text-[10px] xl:leading-[1.25] 2xl:text-[10.5px]">
            {workspace.descriptor}
          </span>
        </span>
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
      className="workspace-explorer relative mt-10 sm:mt-11 lg:mt-12"
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
        className={[
          "relative grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-3 lg:gap-3 xl:grid-cols-9 xl:gap-2 2xl:gap-2.5",
          openWorkspace ? "workspace-explorer-open" : "",
        ].join(" ")}
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
          "grid transition-[grid-template-rows] duration-150 ease-out",
          openWorkspace ? "mt-0 grid-rows-[1fr]" : "mt-0 grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="min-h-0 overflow-hidden">
          <ExpandedPanel panelId={panelId} workspace={openWorkspace} />
        </div>
      </div>
    </div>
  );
}

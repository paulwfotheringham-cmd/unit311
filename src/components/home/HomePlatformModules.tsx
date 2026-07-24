import type { CSSProperties } from "react";
import {
  BarChart3,
  Database,
  MessageSquare,
  Package,
  Share2,
  Users,
  UsersRound,
  Video,
  Wallet,
  FolderKanban,
  Contact,
} from "lucide-react";

const MODULES = [
  {
    title: "Client",
    description: "Client accounts, contacts, and delivery workspaces.",
    icon: Users,
    accent: "#60a5fa",
  },
  {
    title: "CRM",
    description: "Leads, pipeline, connections, and relationship tracking.",
    icon: Contact,
    accent: "#818cf8",
  },
  {
    title: "Project Management",
    description: "Projects, milestones, schedules, and delivery control.",
    icon: FolderKanban,
    accent: "#38bdf8",
  },
  {
    title: "Financials / Integration",
    description: "Expenses, ledgers, reporting, and finance integrations.",
    icon: Wallet,
    accent: "#34d399",
  },
  {
    title: "HR",
    description: "People records, roles, onboarding, and team operations.",
    icon: UsersRound,
    accent: "#a78bfa",
  },
  {
    title: "Inventory / Asset Mgmt / Logistics",
    description: "Stock, assets, shipments, and movement across locations.",
    icon: Package,
    accent: "#fbbf24",
  },
  {
    title: "Data Repository",
    description: "Central files, folders, internal and client document stores.",
    icon: Database,
    accent: "#22d3ee",
  },
  {
    title: "Reporting",
    description: "Advanced rapid reports for every role in your business.",
    icon: BarChart3,
    accent: "#3b82f6",
  },
  {
    title: "Messaging",
    description: "Channels, DMs, groups, and persistent chat history.",
    icon: MessageSquare,
    accent: "#6366f1",
  },
  {
    title: "Communications",
    description: "Voice, video, screen share, and live meetings.",
    icon: Video,
    accent: "#22c55e",
  },
  {
    title: "Social Media",
    description: "Social presence, campaigns, and audience engagement.",
    icon: Share2,
    accent: "#ec4899",
  },
] as const;

type Module = (typeof MODULES)[number];

function ModuleCard({ title, description, icon: Icon, accent }: Module) {
  return (
    <article
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1220]/90 bg-gradient-to-b from-white/[0.09] to-white/[0.03] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:min-h-[220px] sm:rounded-[20px] sm:p-6 lg:rounded-[22px] lg:p-7"
      style={{ "--module-accent": accent } as CSSProperties}
    >
      <div
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 sm:h-14 sm:w-14"
        style={{
          background: `linear-gradient(145deg, ${accent}30, ${accent}12)`,
          boxShadow: `0 12px 32px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.14)`,
        }}
      >
        <Icon className="h-4.5 w-4.5 sm:h-7 sm:w-7" style={{ color: accent }} strokeWidth={1.75} aria-hidden />
      </div>

      <h3 className="relative mt-3 text-[13px] font-semibold leading-snug tracking-tight text-white sm:mt-6 sm:text-[1.075rem] lg:text-xl">
        {title}
      </h3>

      <p className="relative mt-1.5 flex-1 text-[11.5px] leading-relaxed text-white/52 sm:mt-3 sm:text-[15px] sm:leading-[1.65]">
        {description}
      </p>
    </article>
  );
}

export default function HomePlatformModules() {
  return (
    <div className="relative mt-12 sm:mt-16 lg:mt-20">
      <div
        className="pointer-events-none absolute inset-x-4 top-1/2 h-[min(720px,85%)] -translate-y-1/2 rounded-[48px] opacity-70 sm:inset-x-8 lg:inset-x-12"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.06) 40%, transparent 72%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-40"
        aria-hidden
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-[1400px] auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
        {MODULES.map((module) => (
          <ModuleCard key={module.title} {...module} />
        ))}
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import Unit311WorkspacePreview from "./Unit311WorkspacePreview";

const CONSTRUCTION_BG = "/images/construction-bg.jpg";

const MODULES = [
  {
    title: "Client",
    description: "Client accounts, contacts, and delivery workspaces.",
    href: "/internaldashboard?view=clients",
  },
  {
    title: "CRM",
    description: "Leads, pipeline, connections, and relationship tracking.",
    href: "/internaldashboard?view=crm",
  },
  {
    title: "Project Management",
    description: "Projects, milestones, schedules, and delivery control.",
    href: "/internaldashboard?view=projects",
  },
  {
    title: "Financials / Integration",
    description: "Expenses, ledgers, reporting, and finance integrations.",
    href: "/internaldashboard?view=financials",
  },
  {
    title: "HR",
    description: "People records, roles, onboarding, and team operations.",
    href: "/internaldashboard?view=hr",
  },
  {
    title: "Inventory / Asset Mgmt / Logistics",
    description: "Stock, assets, shipments, and movement across locations.",
    href: "/internaldashboard?view=logistics",
  },
  {
    title: "Data Repository",
    description: "Central files, folders, internal and client document stores.",
    href: "/internaldashboard?view=files",
  },
  {
    title: "Email",
    description: "Shared inboxes, threads, replies, and notification flows.",
    href: "/internaldashboard?view=info-email",
  },
  {
    title: "Messaging",
    description: "Internal channels, client messaging, and live collaboration.",
    href: "/internaldashboard?view=messaging",
  },
  {
    title: "Social Media",
    description: "Social presence, campaigns, and audience engagement.",
    href: "/internaldashboard?view=social",
  },
] as const;

function SectionTitle({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 sm:gap-6 ${centered ? "justify-center" : ""}`}
    >
      <span
        className={`h-px bg-[#3b82f6] ${centered ? "w-[80px] sm:w-[140px]" : "w-12 sm:w-20"}`}
        aria-hidden
      />
      <p className="text-center text-[22px] font-semibold uppercase tracking-[0.18em] text-[#3b82f6]">
        {children}
      </p>
      <span
        className={`h-px bg-[#3b82f6] ${centered ? "w-[80px] sm:w-[140px]" : "w-12 sm:w-20"}`}
        aria-hidden
      />
    </div>
  );
}

export default function HomeOfferPlatform() {
  return (
    <section id="services" className="relative scroll-mt-28 overflow-x-hidden bg-[#050816] py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src={CONSTRUCTION_BG}
          alt=""
          fill
          className="object-cover object-center grayscale"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#050816]/84" />
      </div>

      <div className="relative mx-auto max-w-[1760px] px-5 sm:px-8 lg:px-10">
        <SectionTitle centered>What every new business needs</SectionTitle>

        <p className="mx-auto mt-5 max-w-3xl text-center text-[15px] leading-relaxed text-white/60 sm:text-[17px]">
          Unit311 brings the core operating stack into one workspace — from first client to finance,
          files, email, messaging, and social.
        </p>

        <div className="mx-auto mt-10 grid w-full max-w-[1400px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {MODULES.map((item, index) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex min-h-[220px] flex-col rounded-xl bg-white px-5 py-6 text-left shadow-[0_4px_24px_rgba(11,45,99,0.12)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(11,45,99,0.16)] sm:min-h-[240px] sm:px-6 sm:py-7"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-[17px] font-bold leading-snug text-[#1a2b4a] sm:text-[18px]">
                {item.title}
              </h3>
              <p className="mt-3 flex-1 text-[14px] leading-relaxed text-[#1a2b4a]/72 sm:text-[15px]">
                {item.description}
              </p>
              <span className="mt-4 text-sm font-semibold text-[#2563eb] group-hover:underline">
                Explore module
              </span>
            </Link>
          ))}
        </div>

        <div id="platform" className="mt-16 scroll-mt-28 sm:mt-20 lg:mt-24">
          <SectionTitle centered>Unit311 Central Workspace</SectionTitle>

          <div className="mt-10 w-full">
            <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-white/50">
              Click any module in the sidebar to preview how Unit311 Central organises clients, projects,
              finance, files, email, and operations — without signing in.
            </p>
            <Unit311WorkspacePreview className="w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Eye,
  Heart,
  ImagePlus,
  MessageCircle,
  MousePointerClick,
  PenLine,
  Repeat2,
  Search,
  Send,
  Share2,
  Target,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";

type PostMode = "create" | "schedule";

type PostStat = {
  label: string;
  value: string;
  icon: React.ReactNode;
};

type LastPost = {
  date: string;
  preview: string;
  stats: PostStat[];
};

type PlatformConfig = {
  id: "linkedin" | "instagram";
  name: string;
  handle: string;
  accent: string;
  accentBorder: string;
  icon: React.ReactNode;
  lastPost: LastPost;
};

const PLATFORMS: PlatformConfig[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    handle: "@bcndrone",
    accent: "from-[#0A66C2]/20 to-[#0A66C2]/5",
    accentBorder: "border-[#0A66C2]/35",
    icon: (
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#0A66C2] text-[10px] font-bold text-white">
        in
      </span>
    ),
    lastPost: {
      date: "12 Mar 2026 · 09:15",
      preview:
        "Precision aerial surveying across Catalonia — Matrice 4T fleet delivering orthomosaics and DSM layers for infrastructure clients.",
      stats: [
        { label: "Impressions", value: "4.2K", icon: <Eye className="h-3.5 w-3.5" /> },
        { label: "Reactions", value: "86", icon: <ThumbsUp className="h-3.5 w-3.5" /> },
        { label: "Comments", value: "14", icon: <MessageCircle className="h-3.5 w-3.5" /> },
        { label: "Reposts", value: "9", icon: <Repeat2 className="h-3.5 w-3.5" /> },
      ],
    },
  },
  {
    id: "instagram",
    name: "Instagram",
    handle: "@bcndrone",
    accent: "from-fuchsia-500/20 via-pink-500/15 to-amber-500/10",
    accentBorder: "border-pink-400/35",
    icon: (
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-[10px] font-bold text-white">
        IG
      </span>
    ),
    lastPost: {
      date: "10 Mar 2026 · 18:40",
      preview:
        "Golden hour over the port — FPV reel from this week's coastal inspection mission. Full case study on the blog.",
      stats: [
        { label: "Reach", value: "6.8K", icon: <Eye className="h-3.5 w-3.5" /> },
        { label: "Likes", value: "312", icon: <Heart className="h-3.5 w-3.5" /> },
        { label: "Comments", value: "28", icon: <MessageCircle className="h-3.5 w-3.5" /> },
        { label: "Saves", value: "47", icon: <Share2 className="h-3.5 w-3.5" /> },
      ],
    },
  },
];

const SEO_KEYWORDS = [
  { keyword: "drone surveying barcelona", position: 4, change: 2, volume: "1.2K" },
  { keyword: "aerial inspection catalonia", position: 7, change: -1, volume: "880" },
  { keyword: "matrice 4t training spain", position: 11, change: 3, volume: "640" },
  { keyword: "orthomosaic drone services", position: 15, change: 0, volume: "520" },
  { keyword: "unit311", position: 1, change: 0, volume: "390" },
  { keyword: "thermal drone inspection port", position: 19, change: 4, volume: "310" },
] as const;

const PPC_CAMPAIGNS = [
  { name: "Survey leads — ES", spend: "€842", clicks: 312, ctr: "3.8%", cpc: "€2.70", conversions: 14 },
  { name: "Training courses", spend: "€516", clicks: 198, ctr: "4.1%", cpc: "€2.61", conversions: 9 },
  { name: "Inspection — retarget", spend: "€284", clicks: 94, ctr: "2.2%", cpc: "€3.02", conversions: 5 },
] as const;

const PPC_SUMMARY = {
  spend: "€1,642",
  impressions: "28.4K",
  clicks: 604,
  avgCpc: "€2.72",
  conversions: 28,
  roas: "4.2x",
} as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50 placeholder:text-white/30";
}

function panelShellClassName() {
  return "overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl";
}

function SeoRankingsPanel() {
  return (
    <article className={panelShellClassName()}>
      <div className="border-b border-white/10 bg-gradient-to-r from-emerald-500/15 to-teal-500/5 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white sm:text-lg">SEO rankings</h3>
            <p className="text-xs text-white/50">Google positions · unit311.com</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-white/10 p-4 sm:p-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Avg. position</p>
          <p className="mt-1 text-lg font-semibold text-white">9.5</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Top 10</p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">3 keywords</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Visibility</p>
          <p className="mt-1 flex items-center gap-1 text-lg font-semibold text-white">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            +12%
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Tracked keywords
        </p>
        <ul className="mt-3 space-y-2">
          {SEO_KEYWORDS.map((row) => {
            const improved = row.change > 0;
            const declined = row.change < 0;

            return (
              <li
                key={row.keyword}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white/85">{row.keyword}</p>
                  <p className="text-[10px] text-white/40">{row.volume} monthly searches</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">#{row.position}</p>
                  <p
                    className={cn(
                      "flex items-center justify-end gap-0.5 text-[10px] font-medium",
                      improved
                        ? "text-emerald-300"
                        : declined
                          ? "text-rose-300"
                          : "text-white/40",
                    )}
                  >
                    {improved ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : declined ? (
                      <ArrowDownRight className="h-3 w-3" />
                    ) : null}
                    {row.change === 0 ? "—" : `${Math.abs(row.change)} pos`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-center text-[11px] text-white/35">
          Mock SEO data — connect Search Console for live rankings.
        </p>
      </div>
    </article>
  );
}

function PpcStatsPanel() {
  return (
    <article className={panelShellClassName()}>
      <div className="border-b border-white/10 bg-gradient-to-r from-amber-500/15 to-orange-500/5 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-200">
            <MousePointerClick className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white sm:text-lg">Pay per click</h3>
            <p className="text-xs text-white/50">Google Ads · last 30 days</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-4 sm:grid-cols-3 sm:p-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Spend</p>
          <p className="mt-1 text-lg font-semibold text-white">{PPC_SUMMARY.spend}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Clicks</p>
          <p className="mt-1 text-lg font-semibold text-white">{PPC_SUMMARY.clicks}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Avg. CPC</p>
          <p className="mt-1 text-lg font-semibold text-white">{PPC_SUMMARY.avgCpc}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Impressions</p>
          <p className="mt-1 text-lg font-semibold text-white">{PPC_SUMMARY.impressions}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Conversions</p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">{PPC_SUMMARY.conversions}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/40">ROAS</p>
          <p className="mt-1 flex items-center gap-1 text-lg font-semibold text-white">
            <Target className="h-4 w-4 text-amber-300" />
            {PPC_SUMMARY.roas}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Active campaigns
        </p>
        <ul className="mt-3 space-y-2">
          {PPC_CAMPAIGNS.map((campaign) => (
            <li
              key={campaign.name}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white">{campaign.name}</p>
                <p className="text-sm font-semibold text-white">{campaign.spend}</p>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] text-white/45">
                <span>{campaign.clicks} clicks</span>
                <span>{campaign.ctr} CTR</span>
                <span>{campaign.cpc} CPC</span>
                <span className="text-emerald-300/90">{campaign.conversions} conv.</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-[11px] text-white/35">
          Mock PPC data — connect Google Ads for live stats.
        </p>
      </div>
    </article>
  );
}

function LastPostCard({ platform }: { platform: PlatformConfig }) {
  return (
    <div className="border-t border-white/10 bg-black/20 p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
        Last post
      </p>
      <p className="mt-1 text-xs text-white/45">{platform.lastPost.date}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/75">{platform.lastPost.preview}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {platform.lastPost.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2"
          >
            <div className="flex items-center gap-1.5 text-white/40">
              {stat.icon}
              <span className="text-[10px] uppercase tracking-wide">{stat.label}</span>
            </div>
            <p className="mt-1 text-base font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformColumn({ platform }: { platform: PlatformConfig }) {
  const [mode, setMode] = useState<PostMode>("create");
  const [text, setText] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [imageName, setImageName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageName(file?.name ?? null);
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl",
        platform.accentBorder,
      )}
    >
      <div
        className={cn(
          "border-b border-white/10 bg-gradient-to-r px-4 py-4 sm:px-5",
          platform.accent,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white">
            {platform.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white sm:text-lg">{platform.name}</h3>
            <p className="text-xs text-white/50">{platform.handle}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
              mode === "create"
                ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/75",
            )}
          >
            <PenLine className="h-3.5 w-3.5 shrink-0" />
            Create new post
          </button>
          <button
            type="button"
            onClick={() => setMode("schedule")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
              mode === "schedule"
                ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/75",
            )}
          >
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            Schedule new post
          </button>
        </div>
      </div>

      <form
        className="space-y-4 p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div>
          <FieldLabel>Post text</FieldLabel>
          <textarea
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={`What would you like to share on ${platform.name}?`}
            className={cn(inputClassName(), "resize-none")}
          />
        </div>

        <div>
          <FieldLabel>Add image</FieldLabel>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-1.5 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-[#0b1524]/60 px-4 py-8 text-center transition-colors hover:border-sky-400/40 hover:bg-[#0b1524]"
          >
            <ImagePlus className="h-8 w-8 text-white/35" />
            <span className="text-sm font-medium text-white/70">
              {imageName ? imageName : "Click to upload an image"}
            </span>
            <span className="text-xs text-white/35">PNG, JPG up to 10 MB</span>
          </button>
        </div>

        {mode === "schedule" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Choose date</FieldLabel>
              <input
                type="date"
                value={scheduleDate}
                onChange={(event) => setScheduleDate(event.target.value)}
                className={inputClassName()}
              />
            </div>
            <div>
              <FieldLabel>Choose time</FieldLabel>
              <input
                type="time"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
                className={inputClassName()}
              />
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-50"
          disabled={!text.trim()}
        >
          {mode === "create" ? (
            <>
              <Send className="h-4 w-4" />
              Publish now
            </>
          ) : (
            <>
              <CalendarClock className="h-4 w-4" />
              Schedule post
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-white/35">
          Mockup only — posts are not published to {platform.name}.
        </p>
      </form>

      <LastPostCard platform={platform} />
    </article>
  );
}

export default function SocialWorkspace() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#60a5fa]">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Social publishing</h2>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {PLATFORMS.map((platform) => (
          <PlatformColumn key={platform.id} platform={platform} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <SeoRankingsPanel />
        <PpcStatsPanel />
      </div>
    </div>
  );
}

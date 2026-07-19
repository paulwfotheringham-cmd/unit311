"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { id: "impact", label: "Business Impact" },
  { id: "operations", label: "Business Operations" },
  { id: "productivity", label: "Business Productivity" },
  { id: "technology", label: "Technology" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_VIDEOS: Record<TabId, string> = {
  impact: "/videos/bestvideo1.mp4",
  operations: "/videos/video2best.mp4",
  productivity: "/videos/bestvideo1.mp4",
  technology: "/videos/bestvideo1.mp4",
};

export default function HomeBusinessCaseTabbedVideo() {
  const [activeTab, setActiveTab] = useState<TabId>("impact");
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const restartVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const nextSrc = TAB_VIDEOS[activeTab];
    if (!video.currentSrc.endsWith(nextSrc)) {
      video.src = nextSrc;
      video.load();
    }

    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [activeTab]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {});
  }, []);

  function handleReplay() {
    restartVideo();
  }

  async function handleFullscreen() {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await player.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by browser policy.
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2"
        role="tablist"
        aria-label="Business case video categories"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg px-2.5 py-2 text-[10px] font-semibold leading-tight transition-colors duration-300 sm:px-3 sm:py-2.5 sm:text-[11px] lg:text-xs",
                isActive
                  ? "bg-white text-[#0f172a] shadow-[0_4px_14px_rgba(255,255,255,0.12)]"
                  : "bg-[#1a2332]/90 text-white/45 hover:bg-[#243044]/90 hover:text-white/65",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        ref={playerRef}
        className="relative mt-3 flex min-h-[280px] w-full flex-1 flex-col overflow-hidden rounded-2xl border border-sky-500/20 bg-[#070b14]/85 shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:mt-4 lg:mt-5 lg:min-h-[420px] xl:min-h-[480px]"
      >
        <div className="relative min-h-[280px] flex-1 bg-[#030712] lg:min-h-[420px] xl:min-h-[480px]">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover object-top"
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            preload="auto"
            aria-label={`${TABS.find((tab) => tab.id === activeTab)?.label ?? "Business case"} demo video`}
          >
            <source src={TAB_VIDEOS[activeTab]} type="video/mp4" />
          </video>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030712]/50 via-transparent to-transparent" />

          <div className="absolute bottom-3 right-3 flex gap-1.5 sm:bottom-4 sm:right-4">
            <button
              type="button"
              onClick={handleReplay}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#0a1220]/75 text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:border-sky-400/35 hover:bg-[#0f172a]/90 sm:h-10 sm:w-10"
              aria-label="Replay video"
            >
              <RotateCcw className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => void handleFullscreen()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#0a1220]/75 text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:border-sky-400/35 hover:bg-[#0f172a]/90 sm:h-10 sm:w-10"
              aria-label="Full screen video"
            >
              <Maximize2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

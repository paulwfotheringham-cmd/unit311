"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import WorkspaceDemoLoopVideo from "./WorkspaceDemoLoopVideo";

function OverviewVideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#020617]/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-overview-video-title"
        className="relative max-h-[92svh] w-full overflow-hidden rounded-t-[24px] border border-white/15 bg-[#07111F] shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:max-w-4xl sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close overview video"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full border border-white/10 bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white sm:right-4 sm:top-4"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-white/10 px-4 py-3 pr-12 sm:px-5 sm:py-4 sm:pr-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
            Unit311 Central
          </p>
          <h2 id="home-overview-video-title" className="mt-1 text-base font-semibold text-white sm:text-lg">
            Platform overview
          </h2>
        </div>

        <div className="p-3 sm:p-5">
          <WorkspaceDemoLoopVideo
            className="w-full"
            src="/videos/overview.mp4"
            poster={null}
            preload="auto"
            controls
            loop={false}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HomeHeroActions() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <>
      <div className="mt-8 flex w-full flex-col gap-3 sm:mt-14 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
        <Link
          href="/book"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-center text-sm font-semibold leading-snug text-[#0b2d63] transition-colors hover:bg-white/90 sm:w-auto sm:px-6"
        >
          Book a Free Intro & Demo Session
        </Link>
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0b2d63] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#092454] sm:w-auto sm:px-6"
        >
          Watch Overview
        </button>
      </div>

      <OverviewVideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
    </>
  );
}

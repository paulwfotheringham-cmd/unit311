"use client";

import { useEffect, useRef, useState } from "react";

const WORKSPACE_DEMO_VIDEO = "/videos/unit311central.mp4";
const WORKSPACE_DEMO_POSTER = "/images/homepage-mockup-reference.png";
const PLAYBACK_RATE = 1;
const LOOP_TRIM_SECONDS = 0.12;

type WorkspaceDemoLoopVideoProps = {
  className?: string;
  src?: string;
  poster?: string | null;
  preload?: "auto" | "metadata" | "none";
  controls?: boolean;
  loop?: boolean;
};

export default function WorkspaceDemoLoopVideo({
  className = "",
  src = WORKSPACE_DEMO_VIDEO,
  poster = WORKSPACE_DEMO_POSTER,
  preload = "metadata",
  controls = false,
  loop = true,
}: WorkspaceDemoLoopVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(media.matches);

    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const primePlayback = () => {
      video.muted = true;
      video.volume = 0;
      video.playbackRate = PLAYBACK_RATE;
      void video.play().catch(() => {});
    };

    const handleLoadedMetadata = () => {
      video.playbackRate = PLAYBACK_RATE;
    };

    const handleTimeUpdate = () => {
      if (!loop) return;
      if (!video.duration || Number.isNaN(video.duration)) return;

      if (video.currentTime >= video.duration - LOOP_TRIM_SECONDS) {
        video.currentTime = 0;
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          primePlayback();
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(container);
    primePlayback();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      observer.disconnect();
    };
  }, [loop, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[16/11] w-full overflow-hidden rounded-xl bg-[#0b1220] sm:aspect-[16/10] sm:rounded-2xl ${className}`}
    >
      {prefersReducedMotion && poster != null ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt="Unit311 Central workspace preview"
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <video
          ref={videoRef}
          className="h-full w-full object-cover object-top"
          autoPlay
          muted
          loop={loop}
          playsInline
          disablePictureInPicture
          controls={controls}
          preload={preload}
          {...(poster != null ? { poster } : {})}
          aria-label="Unit311 Central workspace demo"
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const HERO_VIDEO = "/images/video.mp4";
const PLAYBACK_RATE = 0.8;
const LOOP_LEAD_IN_SECONDS = 0.05;
const LOOP_TRIM_SECONDS = 0.12;
const HERO_OBJECT_POSITION = "50% 42%";

export default function HeroVideoBackground() {
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
      if (!video.duration || Number.isNaN(video.duration)) return;

      if (video.currentTime >= video.duration - LOOP_TRIM_SECONDS) {
        video.currentTime = LOOP_LEAD_IN_SECONDS;
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
      { threshold: 0.05 },
    );

    observer.observe(container);
    primePlayback();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      observer.disconnect();
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0 min-h-full w-full overflow-hidden"
      aria-hidden
    >
      {prefersReducedMotion ? (
        <div
          className="absolute inset-0 bg-[#020617]"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(37, 99, 235, 0.22), transparent 70%), #020617",
          }}
        />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: HERO_OBJECT_POSITION }}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          controls={false}
          preload="auto"
          aria-hidden
          tabIndex={-1}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

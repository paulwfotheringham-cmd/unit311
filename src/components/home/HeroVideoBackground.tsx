"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const HERO_VIDEO = "/images/video.mp4";
const HERO_IMAGE = "/images/hero/drone-quarry-scan.webp";
const HERO_OBJECT_POSITION = "50% 50%";
const PLAYBACK_RATE = 0.8;
const LOOP_LEAD_IN_SECONDS = 0.05;
const LOOP_TRIM_SECONDS = 0.12;

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
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {prefersReducedMotion ? (
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          className="object-cover"
          style={{ objectPosition: HERO_OBJECT_POSITION }}
          sizes="100vw"
        />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ width: "100%", height: "100%", objectPosition: HERO_OBJECT_POSITION }}
          autoPlay
          muted
          loop
          playsInline
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

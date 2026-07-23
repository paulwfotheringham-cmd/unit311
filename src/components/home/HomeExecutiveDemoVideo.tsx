"use client";

import { useEffect, useRef } from "react";

const EXEC_VIDEO_SRC = "/videos/FINAL.mp4";
const VISIBLE_RATIO = 0.55;

export default function HomeExecutiveDemoVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasLeftViewportRef = useRef(true);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const resetVideo = () => {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // Ignore seek errors while metadata is still loading.
      }
    };

    const playFromStart = async () => {
      resetVideo();
      video.muted = false;
      video.defaultMuted = false;
      video.volume = 1;
      try {
        await video.play();
      } catch {
        // Browser autoplay policies may still block unmuted playback without a prior gesture.
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visibleEnough = entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO;

        if (visibleEnough) {
          if (hasLeftViewportRef.current) {
            hasLeftViewportRef.current = false;
            void playFromStart();
          }
          return;
        }

        if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
          hasLeftViewportRef.current = true;
          resetVideo();
        }
      },
      { threshold: [0, 0.2, 0.5, 0.55, 0.6, 1] },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mt-9 w-full sm:mt-10">
      <div ref={containerRef} className="mx-auto w-full max-w-[960px]">
        <div className="overflow-hidden rounded-[18px] border border-white/[0.1] bg-black/20 shadow-[0_20px_48px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-[20px]">
          <video
            ref={videoRef}
            className="exec-demo-video block h-auto w-full"
            src={EXEC_VIDEO_SRC}
            preload="metadata"
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            controls={false}
            controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
            tabIndex={-1}
            aria-label="Unit311 Central platform demonstration"
          />
        </div>
      </div>
    </div>
  );
}

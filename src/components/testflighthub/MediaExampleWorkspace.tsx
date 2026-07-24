"use client";

import { MEDIA_EXAMPLE_CLIPS } from "@/lib/media-example-data";

export default function MediaExampleWorkspace() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {MEDIA_EXAMPLE_CLIPS.map((clip) => (
          <article
            key={clip.id}
            className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl"
          >
            <div className="border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white sm:text-lg">{clip.title}</h3>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {clip.durationLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/50">{clip.description}</p>
            </div>

            <div className="bg-black/40 p-3 sm:p-4">
              <video
                className="aspect-video w-full rounded-xl border border-white/10 bg-black object-cover"
                src={clip.src}
                poster={clip.poster}
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              >
                Your browser does not support embedded video playback.
              </video>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Construction } from "lucide-react";

type ModulePlaceholderWorkspaceProps = {
  title: string;
  description: string;
  bullets?: readonly string[];
};

export default function ModulePlaceholderWorkspace({
  title,
  description,
  bullets,
}: ModulePlaceholderWorkspaceProps) {
  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10">
          <Construction className="h-5 w-5 text-sky-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/80">
            Coming soon
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">{description}</p>
          {bullets && bullets.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-white/50">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

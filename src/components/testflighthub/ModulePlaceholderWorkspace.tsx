"use client";

type ModulePlaceholderWorkspaceProps = {
  title: string;
  description: string;
  bullets?: readonly string[];
};

export default function ModulePlaceholderWorkspace({
  title: _title,
  description,
  bullets,
}: ModulePlaceholderWorkspaceProps) {
  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
      <div className="min-w-0">
        <p className="max-w-2xl text-sm leading-relaxed text-white/60">{description}</p>
        {bullets && bullets.length > 0 ? (
          <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-white/50">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

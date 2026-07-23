import HomeSectionTitle from "./HomeSectionTitle";
import HomeWorkspaceExplorer from "./HomeWorkspaceExplorer";
import HomeExecutiveDemoVideo from "./HomeExecutiveDemoVideo";
import WorkspaceDemoLoopVideo from "./WorkspaceDemoLoopVideo";

export default function HomeOfferPlatform() {
  return (
    <section
      id="services"
      className="relative scroll-mt-20 overflow-x-hidden bg-[#050816] py-12 sm:scroll-mt-28 sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 18% 12%, rgba(56,189,248,0.07), transparent 55%), radial-gradient(ellipse 70% 50% at 88% 18%, rgba(59,130,246,0.08), transparent 58%), radial-gradient(ellipse 65% 45% at 50% 100%, rgba(37,99,235,0.06), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(ellipse 75% 70% at 50% 40%, black 20%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 70% at 50% 40%, black 20%, transparent 78%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 0%, rgba(56,189,248,0.08) 42%, transparent 43%), linear-gradient(205deg, transparent 0%, rgba(59,130,246,0.06) 58%, transparent 59%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-6 xl:px-8 2xl:px-10">
        <HomeSectionTitle singleLine>
          Explore everything Unit311 Central has to offer
        </HomeSectionTitle>

        <div className="mx-auto mt-5 w-full sm:mt-6">
          <p className="mx-auto max-w-[900px] text-balance text-center text-[15px] font-medium leading-relaxed text-white/72 sm:text-[16px] md:text-[18px] md:leading-relaxed">
            Unit311 Central brings together every major business function into a single intelligent
            platform.
          </p>

          <HomeExecutiveDemoVideo />

          <p className="mx-auto mt-12 max-w-[900px] text-balance text-center text-sm leading-relaxed text-white/55 sm:mt-14 sm:text-[15px] md:mt-16 md:text-[17px] md:leading-relaxed">
            Explore each workspace below to discover how Unit311 Central helps manage your
            organisation, connect your existing business systems, and automate the way you work.
          </p>
        </div>

        <HomeWorkspaceExplorer />

        <div id="platform" className="mt-16 scroll-mt-24 sm:mt-20 sm:scroll-mt-28 md:mt-24 lg:mt-28">
          <HomeSectionTitle>Unit311 Central Workspace</HomeSectionTitle>

          <div className="mt-8 w-full sm:mt-10">
            <div className="mx-auto w-full max-w-full sm:max-w-[92%] lg:max-w-[1200px]">
              <div className="overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.14] to-white/[0.06] p-2 shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:rounded-[28px] sm:p-4 lg:rounded-[32px]">
                <WorkspaceDemoLoopVideo
                  className="w-full"
                  src="/videos/overview.mp4"
                  poster={null}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

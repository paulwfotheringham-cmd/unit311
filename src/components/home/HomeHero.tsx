import HeroVideoBackground from "./HeroVideoBackground";
import HomeBrandWordmark from "./HomeBrandWordmark";
import HomeHeroActions from "./HomeHeroActions";

export default function HomeHero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#020617]">
      <HeroVideoBackground />

      <div
        className="pointer-events-none absolute inset-0 z-[1] sm:hidden"
        aria-hidden
        style={{
          background:
            "linear-gradient(to top, rgba(2, 6, 23, 0.96) 0%, rgba(2, 6, 23, 0.82) 38%, rgba(2, 6, 23, 0.45) 68%, rgba(2, 6, 23, 0.2) 100%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-[1] hidden sm:block"
        aria-hidden
        style={{
          background:
            "linear-gradient(to right, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.45) 45%, rgba(0, 0, 0, 0.18) 70%, transparent 88%)",
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 hidden pt-[max(0px,env(safe-area-inset-top))] lg:block">
        <div className="mx-auto flex h-28 max-w-[1400px] items-center px-10">
          <div className="pointer-events-auto max-w-[640px]">
            <HomeBrandWordmark />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1400px] items-end px-4 pb-12 pt-[3.75rem] sm:px-8 sm:pb-20 sm:pt-[6.5rem] lg:items-center lg:px-10 lg:pb-24 lg:pt-[120px]">
        <div className="relative max-w-[640px]">
          <h1 className="text-[1.75rem] font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-[2.75rem] sm:leading-[0.95] lg:text-[3.35rem] xl:text-[3.75rem]">
            Connect your business into a single operational platform
          </h1>

          <p className="mt-5 max-w-[540px] text-[15px] font-medium leading-[1.65] text-white/88 sm:mt-6 sm:text-[17px] sm:leading-[1.7]">
            Bring your people, information and day-to-day business functions together, fully integrated
            into a single secure platform. Reduce your costs and complexity, integrate your external
            core business applications and give every employee and leaders instant access to trusted
            information that helps your organisation operate, grow and make better decisions.
          </p>

          <HomeHeroActions />
        </div>
      </div>
    </section>
  );
}

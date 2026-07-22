import Image from "next/image";
import HomeSectionTitle from "./HomeSectionTitle";
import HomePlatformModules from "./HomePlatformModules";
import WorkspaceDemoLoopVideo from "./WorkspaceDemoLoopVideo";

const CONSTRUCTION_BG = "/images/construction-bg.webp";

export default function HomeOfferPlatform() {
  return (
    <section id="services" className="relative scroll-mt-20 overflow-x-hidden bg-[#050816] py-12 sm:scroll-mt-28 sm:py-20 lg:py-24">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src={CONSTRUCTION_BG}
          alt=""
          fill
          className="object-cover object-center grayscale"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#050816]/84" />
      </div>

      <div className="relative mx-auto max-w-[1760px] px-4 sm:px-8 lg:px-10">
        <HomeSectionTitle singleLine>
          What can Unit311 Central bring to your business?
        </HomeSectionTitle>

        <p className="mx-auto mt-5 max-w-3xl text-balance text-center text-sm leading-relaxed text-white/55 sm:mt-6 sm:text-[15px] md:text-[17px] md:leading-relaxed">
          Unit311 Central provides you with a core business operating stack in a single workspace
        </p>

        <HomePlatformModules />

        <div id="platform" className="mt-12 scroll-mt-24 sm:mt-16 sm:scroll-mt-28 md:mt-20 lg:mt-24">
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

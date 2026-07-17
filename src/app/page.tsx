import HomeHero from "@/components/home/HomeHero";
import HomeBusinessCase from "@/components/home/HomeBusinessCase";
import HomeOfferPlatform from "@/components/home/HomeOfferPlatform";
import HomePricing from "@/components/home/HomePricing";

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <HomeHero />
      <HomeOfferPlatform />
      <HomeBusinessCase />
      <HomePricing />
    </div>
  );
}

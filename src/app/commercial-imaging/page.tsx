import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import CTA from "@/components/sections/CTA";
import Hero from "@/components/sections/Hero";
import SectionHeader from "@/components/sections/SectionHeader";
import FeatureGrid from "@/components/ui/FeatureGrid";
import { COMMERCIAL_SERVICES } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd, serviceJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Commercial Aerial Imaging",
  description:
    "Commission premium Unit311 commercial aerial imaging and cinematography for hotels, resorts, yachts, real estate, and brand campaigns.",
  path: "/commercial-imaging",
});

export default function CommercialImagingPage() {
  return (
    <>
      <JsonLd
        data={[
          serviceJsonLd(
            "Commercial Aerial Imaging",
            "Premium commercial drone cinematography for luxury hospitality, real estate and brand campaigns.",
            "/commercial-imaging",
          ),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Commercial Imaging", path: "/commercial-imaging" },
          ]),
        ]}
      />
      <Hero
        compact
        title="Commercial Aerial Imaging"
        subtitle="Cinematic aerial production for premium brands — hotels, resorts, yachts and destination marketing at international standards."
        image="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80"
        imageAlt="Luxury resort architecture"
        primaryCta={{ label: "Discuss a Production", href: "/contact" }}
      />
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Capabilities"
            title="Visual production that elevates perception"
            description="Campaign-ready films and stills with precision framing, colour grading and delivery formats for every channel."
          />
          <div className="mt-12">
            <FeatureGrid items={COMMERCIAL_SERVICES} />
          </div>
        </div>
      </section>
      <CTA
        title="Planning a commercial shoot?"
        description="Share location, creative direction and delivery timeline. We'll propose a production approach."
      />
    </>
  );
}

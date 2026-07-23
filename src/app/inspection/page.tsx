import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import CTA from "@/components/sections/CTA";
import Hero from "@/components/sections/Hero";
import SectionHeader from "@/components/sections/SectionHeader";
import FeatureGrid from "@/components/ui/FeatureGrid";
import { INSPECTION_SERVICES } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd, serviceJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Drone Inspection Services",
  description:
    "Book professional Unit311 drone inspection for infrastructure, pipelines, solar assets, and industrial facilities — high-resolution capture with actionable operational reporting.",
  path: "/inspection",
});

export default function InspectionPage() {
  return (
    <>
      <JsonLd
        data={[
          serviceJsonLd(
            "Drone Inspection Services",
            "Professional drone inspection for infrastructure, pipelines, solar assets and industrial facilities.",
            "/inspection",
          ),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Inspection", path: "/inspection" },
          ]),
        ]}
      />
      <Hero
        compact
        title="Drone Inspection Services"
        subtitle="Systematic aerial assessment of critical assets — thermal, visual and repeatable monitoring programs for operational teams."
        image="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=2000&q=80"
        imageAlt="Industrial infrastructure at dusk"
        primaryCta={{ label: "Request Inspection", href: "/contact" }}
      />
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Capabilities"
            title="Inspection programs that scale"
            description="From one-off assessments to recurring asset monitoring — structured data capture aligned to your compliance and maintenance workflows."
          />
          <div className="mt-12">
            <FeatureGrid items={INSPECTION_SERVICES} />
          </div>
        </div>
      </section>
      <CTA
        title="Schedule an inspection mobilisation"
        description="Share asset details, access requirements and reporting format. We'll scope the flight program and turnaround."
      />
    </>
  );
}

import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import CTA from "@/components/sections/CTA";
import Hero from "@/components/sections/Hero";
import SectionHeader from "@/components/sections/SectionHeader";
import FeatureGrid from "@/components/ui/FeatureGrid";
import { SURVEYING_SERVICES } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd, serviceJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Drone Surveying & Mapping",
  description:
    "Deliver precision Unit311 drone surveying, orthomosaics, topographic surveys, and progress monitoring for engineering and construction teams.",
  path: "/surveying",
});

export default function SurveyingPage() {
  return (
    <>
      <JsonLd
        data={[
          serviceJsonLd(
            "Drone Surveying & Mapping",
            "Precision drone surveying, orthomosaic generation, topographic surveys and progress monitoring.",
            "/surveying",
          ),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Surveying", path: "/surveying" },
          ]),
        ]}
      />
      <Hero
        compact
        title="Drone Surveying & Mapping"
        subtitle="Survey-grade geospatial datasets for planning, design and operational decision-making — delivered with measurable ground truth."
        image="https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=2000&q=80"
        imageAlt="Engineering site survey environment"
        primaryCta={{ label: "Start a Survey", href: "/contact" }}
      />
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Capabilities"
            title="Geospatial intelligence on demand"
            description="Orthomosaics, elevation models and time-series capture — structured for CAD, GIS and stakeholder reporting."
          />
          <div className="mt-12">
            <FeatureGrid items={SURVEYING_SERVICES} />
          </div>
        </div>
      </section>
      <CTA
        title="Need survey-grade deliverables?"
        description="Tell us about your site boundaries, coordinate system and output requirements."
      />
    </>
  );
}

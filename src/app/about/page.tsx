import type { Metadata } from "next";
import Image from "next/image";
import JsonLd from "@/components/JsonLd";
import CTA from "@/components/sections/CTA";
import Hero from "@/components/sections/Hero";
import SectionHeader from "@/components/sections/SectionHeader";
import FeatureGrid from "@/components/ui/FeatureGrid";
import { WHY_US } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { CONTACT, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "About Unit311",
  description:
    "Unit311 is a Spain-based aerial intelligence provider delivering professional drone inspection, surveying and commercial imaging across Europe and internationally.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <Hero
        compact
        title="About Unit311"
        subtitle={SITE_DESCRIPTION}
        image="https://images.unsplash.com/photo-1454165804603-c3d57bc86b40?auto=format&fit=crop&w=2000&q=80"
        imageAlt="Professional team planning operations"
        primaryCta={{ label: "Work With Us", href: "/contact" }}
      />
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeader
                eyebrow="Our approach"
                title="Aerial intelligence with operational rigour"
                description="We combine certified flight operations with industrial-grade sensors and structured deliverables. Whether you need defect detection on a solar farm or cinematic content for a luxury resort, our teams mobilise quickly and report clearly."
              />
              <div className="mt-10 space-y-4 text-sm leading-relaxed text-muted">
                <p>
                  Based in Spain with international capability, Unit311 supports energy operators,
                  engineering firms, contractors and premium hospitality groups who require reliable data
                  capture and production-quality imaging.
                </p>
                <p>
                  Every engagement follows documented workflows — from pre-flight planning and airspace
                  compliance through to formatted reporting and asset delivery.
                </p>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border">
              <Image
                src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80"
                alt="Collaborative professional environment"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface/50 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Standards"
            title="What sets us apart"
            description="Consistent quality across technical and commercial engagements."
            align="center"
          />
          <div className="mt-12">
            <FeatureGrid items={WHY_US} />
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="gradient-border rounded-2xl bg-surface p-8 sm:p-12">
            <SectionHeader
              eyebrow="Location"
              title="Spain · International operations"
              description={CONTACT.location}
            />
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
              We operate across Spain and support cross-border projects for industrial and luxury clients
              throughout Europe and beyond. Contact us to confirm mobilisation for your location.
            </p>
          </div>
        </div>
      </section>

      <CTA />
    </>
  );
}

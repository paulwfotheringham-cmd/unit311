import type { Metadata } from "next";
import Image from "next/image";
import JsonLd from "@/components/JsonLd";
import CTA from "@/components/sections/CTA";
import Hero from "@/components/sections/Hero";
import SectionHeader from "@/components/sections/SectionHeader";
import { INDUSTRY_SECTIONS } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Industries We Serve",
  description:
    "See how Unit311 supports oil and gas, renewable energy, construction, infrastructure, hospitality, and marine teams with tailored operational and aerial intelligence programs.",
  path: "/industries",
});

export default function IndustriesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Industries", path: "/industries" },
        ])}
      />
      <Hero
        compact
        title="Industries We Serve"
        subtitle="Sector-specific aerial programs — from pipeline corridors and solar farms to luxury resorts and marine assets."
        image="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80"
        imageAlt="Modern infrastructure skyline"
        primaryCta={{ label: "Discuss Your Sector", href: "/contact" }}
      />
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Sectors"
            title="Tailored workflows for every environment"
            description="We adapt capture methodology, sensor selection and deliverable formats to your operational and commercial requirements."
            align="center"
          />
          <div className="mt-16 space-y-16">
            {INDUSTRY_SECTIONS.map((section, index) => (
              <article
                key={section.id}
                id={section.id}
                className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${
                  index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border">
                  <Image
                    src={section.image}
                    alt={`${section.title} operations and aerial intelligence`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {section.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-muted">{section.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CTA />
    </>
  );
}

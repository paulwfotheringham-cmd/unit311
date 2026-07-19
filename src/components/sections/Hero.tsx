import Image from "next/image";
import Link from "next/link";

type HeroProps = {
  title: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  compact?: boolean;
};

export default function Hero({
  title,
  subtitle,
  image,
  imageAlt = "",
  primaryCta,
  secondaryCta,
  compact = false,
}: HeroProps) {
  return (
    <section className={`relative overflow-hidden ${compact ? "py-14 sm:py-20 lg:py-24" : "py-16 sm:py-24 lg:py-32"}`}>
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(37,99,235,0.18),transparent)]" />

      {image && (
        <div className="absolute inset-0">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            className="object-cover opacity-20"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />
        </div>
      )}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className={`max-w-3xl ${compact ? "" : "lg:max-w-4xl"}`}>
          <h1
            className={`font-semibold tracking-tight text-foreground ${
              compact
                ? "text-3xl sm:text-5xl"
                : "text-3xl sm:text-5xl lg:text-6xl lg:leading-[1.1]"
            }`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:mt-6 sm:text-lg lg:text-xl">
              {subtitle}
            </p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              {primaryCta && (
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex items-center justify-center rounded-lg border border-border-strong bg-surface/50 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-muted hover:bg-surface-elevated"
                >
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

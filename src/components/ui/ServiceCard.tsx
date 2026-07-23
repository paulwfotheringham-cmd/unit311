import Image from "next/image";
import Link from "next/link";

type ServiceCardProps = {
  title: string;
  description: string;
  href: string;
  image: string;
  imageAlt: string;
};

export default function ServiceCard({
  title,
  description,
  href,
  image,
  imageAlt,
}: ServiceCardProps) {
  return (
    <Link
      href={href}
      className="group gradient-border relative flex flex-col overflow-hidden rounded-2xl bg-surface transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={image}
          alt={imageAlt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{description}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors group-hover:text-accent-hover">
          Explore {title}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

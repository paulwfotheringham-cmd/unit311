export const CENTRAL_SITE_URL = "https://unit311central.com";
export const CENTRAL_SITE_NAME = "Unit311 Central";

/** Canonical public site URL for SEO (metadata, sitemap, robots, JSON-LD). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? CENTRAL_SITE_URL;

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Unit311";
export const SITE_EMAIL_DOMAIN = "unit311central.com";
export const SITE_LOGO_PATH = process.env.NEXT_PUBLIC_SITE_LOGO_PATH ?? "/images/unit311central.svg";
export const SITE_OG_IMAGE_PATH =
  process.env.NEXT_PUBLIC_SITE_OG_IMAGE_PATH ?? "/images/unit311central-hero.png";
export const SITE_LOGO_URL = `${SITE_URL}${SITE_LOGO_PATH}`;
export const SITE_OG_IMAGE_URL = `${SITE_URL}${SITE_OG_IMAGE_PATH}`;
export const SITE_TAGLINE = "The centralised platform to accelerate and run your business.";
export const SITE_DESCRIPTION =
  "Run your day-to-day business on a single intelligent platform. Consolidate business applications, connect the specialist systems you already use, and give every employee instant access to information, reports and business insights.";
export const SITE_HOME_TITLE = "Business Operations Software for Growing Companies | Unit311";
export const SITE_HERO_LINE = "Connect your business into a single operational platform";

export const CONTACT = {
  email: "info@unit311central.com",
  infoEmail: "info@unit311central.com",
  linkedin: "https://www.linkedin.com/company/unit311",
  phone: "+34 938 000 000",
  whatsapp: "34938000000",
  location: "Europe · Remote-first operations platform",
} as const;

export const NAV_LINKS = [
  { href: "/#services", label: "Solutions" },
  { href: "/#platform", label: "Platform" },
  { href: "/contact", label: "Contact" },
] as const;

export const SEO_KEYWORDS = [
  "business operations software",
  "business operations platform",
  "growing companies software",
  "centralised business management",
  "company operations platform",
  "Unit311",
] as const;

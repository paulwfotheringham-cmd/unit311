const DEFAULT_SITE_URL = "https://unit311.vercel.app";

export const CENTRAL_SITE_URL = "https://unit311central.com";
export const CENTRAL_SITE_NAME = "Unit311 Central";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : DEFAULT_SITE_URL);

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Unit311";
export const SITE_EMAIL_DOMAIN = "unit311central.com";
export const SITE_LOGO_PATH = process.env.NEXT_PUBLIC_SITE_LOGO_PATH ?? "/images/unit311central.webp";
export const SITE_LOGO_URL = `${SITE_URL}${SITE_LOGO_PATH}`;
export const SITE_TAGLINE = "The centralised platform to accelerate and run your business.";
export const SITE_DESCRIPTION =
  "Unit311 gives every new business the essentials in one place — client management, CRM, projects, financials, HR, inventory and logistics, data repository, email, messaging, and social media.";
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
  "accelerate your business",
  "business operations platform",
  "company setup",
  "founder workspace",
  "Unit311",
  "centralised business management",
] as const;

import {
  CONTACT,
  SITE_DESCRIPTION,
  SITE_LOGO_URL,
  SITE_NAME,
  SITE_URL,
} from "./site";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO_URL,
    description: SITE_DESCRIPTION,
    email: CONTACT.email,
    telephone: CONTACT.phone,
    areaServed: ["Spain", "Europe", "International"],
    sameAs: [CONTACT.linkedin],
    knowsAbout: [
      "Business Operations",
      "Business Operations Software",
      "CRM and Client Management",
      "Project Management",
      "Finance and Reporting",
      "Human Resources",
      "Inventory and Logistics",
    ],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en-GB",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: SITE_LOGO_URL,
    },
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    image: SITE_LOGO_URL,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/book`,
    },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function serviceJsonLd(name: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: "Spain",
    url: `${SITE_URL}${path}`,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === "/" ? "/" : item.path}`,
    })),
  };
}

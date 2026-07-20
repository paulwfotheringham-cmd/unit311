/**
 * Shipping Provider Registry (client seed for Logistics Setup Wizard).
 * UI must read from this registry — never hard-code provider names in components.
 * Aligns with FDR-MOD-092 / PRM-003: registry is system of record for display lists.
 *
 * Educational fields (shortDescription, bestSuitedFor, typicalUseCases) support
 * the Setup Wizard selection experience only — no live API connections.
 */

export type ShippingRegionCode =
  | "united_kingdom"
  | "united_states"
  | "european_union"
  | "japan"
  | "australia"
  | "canada"
  | "other";

export type ShippingProviderRegistryEntry = {
  readonly code: string;
  readonly name: string;
  readonly regionCodes: readonly ShippingRegionCode[];
  readonly recommendedFor: readonly ShippingRegionCode[];
  /** Display order within a region’s recommended list (lower first). */
  readonly wizardOrder?: Partial<Record<ShippingRegionCode, number>>;
  readonly shortDescription: string;
  readonly bestSuitedFor: readonly string[];
  readonly typicalUseCases: readonly string[];
  /** Optional longer copy for Learn More. Defaults to shortDescription when omitted. */
  readonly learnMore?: string;
  /** Short brand for educational copy (e.g. "FedEx"). Defaults to name. */
  readonly brandName?: string;
  /** Public business signup / account page — UI link only, no API. */
  readonly businessAccountUrl?: string;
};

export const SHIPPING_REGIONS: readonly {
  code: ShippingRegionCode;
  label: string;
  description: string;
}[] = [
  {
    code: "united_states",
    label: "United States",
    description: "Domestic and outbound shipping across North America.",
  },
  {
    code: "united_kingdom",
    label: "United Kingdom",
    description: "UK parcels, letters, and outbound international mail.",
  },
  {
    code: "european_union",
    label: "European Union",
    description: "Cross-border and domestic shipping within Europe.",
  },
  {
    code: "japan",
    label: "Japan",
    description: "Domestic courier networks and international exports.",
  },
  {
    code: "australia",
    label: "Australia",
    description: "Australian domestic and international shipping.",
  },
  {
    code: "canada",
    label: "Canada",
    description: "Canadian domestic and cross-border shipping.",
  },
  {
    code: "other",
    label: "Other",
    description: "Regions outside the primary shipping markets above.",
  },
] as const;

/** Regions shown as large cards in the Logistics Setup Wizard (fixed order). */
export const WIZARD_SHIPPING_REGIONS = [
  SHIPPING_REGIONS.find((entry) => entry.code === "united_states")!,
  SHIPPING_REGIONS.find((entry) => entry.code === "united_kingdom")!,
  SHIPPING_REGIONS.find((entry) => entry.code === "european_union")!,
  SHIPPING_REGIONS.find((entry) => entry.code === "japan")!,
] as const;

/** Platform registry seed — extend via data, not UI hard-coding. */
export const SHIPPING_PROVIDER_REGISTRY: readonly ShippingProviderRegistryEntry[] = [
  {
    code: "ups",
    name: "UPS (United Parcel Service)",
    brandName: "UPS",
    businessAccountUrl: "https://www.ups.com/us/en/business-solutions/business-shipping.page",
    regionCodes: [
      "united_states",
      "united_kingdom",
      "european_union",
      "canada",
      "australia",
      "other",
    ],
    recommendedFor: ["united_states"],
    wizardOrder: { united_states: 1 },
    shortDescription:
      "Premier B2B and North American ground shipping network known for reliability.",
    bestSuitedFor: ["Business shipping", "Ground delivery", "Commercial logistics"],
    typicalUseCases: [
      "Regular B2B ground consignments",
      "Multi-stop commercial delivery",
      "Reliable domestic freight",
    ],
  },
  {
    code: "fedex",
    name: "FedEx",
    brandName: "FedEx",
    businessAccountUrl: "https://www.fedex.com/en-us/account.html",
    regionCodes: [
      "united_states",
      "united_kingdom",
      "european_union",
      "japan",
      "canada",
      "australia",
      "other",
    ],
    recommendedFor: ["united_states"],
    wizardOrder: { united_states: 2 },
    shortDescription:
      "Industry leader for overnight, express and time-definite delivery.",
    bestSuitedFor: ["Express shipments", "Time-critical deliveries", "International priority"],
    typicalUseCases: [
      "Overnight and next-day parcels",
      "Time-definite business delivery",
      "Priority international freight",
    ],
  },
  {
    code: "usps",
    name: "USPS",
    brandName: "USPS",
    businessAccountUrl: "https://www.usps.com/business/",
    regionCodes: ["united_states"],
    recommendedFor: ["united_states"],
    wizardOrder: { united_states: 3 },
    shortDescription:
      "The most cost-effective solution for lightweight parcels, residential delivery and rural locations.",
    bestSuitedFor: ["Small businesses", "Residential customers", "Low-cost shipping"],
    typicalUseCases: [
      "Lightweight e-commerce parcels",
      "Residential last-mile delivery",
      "Rural and remote destinations",
    ],
  },
  {
    code: "dhl_express",
    name: "DHL Express",
    brandName: "DHL Express",
    businessAccountUrl: "https://www.dhl.com/us-en/home/get-started.html",
    regionCodes: ["united_states", "european_union", "other"],
    recommendedFor: ["united_states"],
    wizardOrder: { united_states: 4 },
    shortDescription: "Specialists in international shipping from the United States.",
    bestSuitedFor: ["International documents", "Cross-border parcels", "Global trade"],
    typicalUseCases: [
      "Documents and samples abroad",
      "Cross-border e-commerce",
      "Time-critical export shipments",
    ],
  },
  {
    code: "ontrac",
    name: "OnTrac",
    brandName: "OnTrac",
    businessAccountUrl: "https://www.ontrac.com/",
    regionCodes: ["united_states"],
    recommendedFor: ["united_states"],
    wizardOrder: { united_states: 5 },
    shortDescription:
      "Regional courier offering rapid delivery across the US West and East Coast markets.",
    bestSuitedFor: ["Regional delivery", "E-commerce", "Fast domestic shipping"],
    typicalUseCases: [
      "Coast-focused e-commerce fulfilment",
      "Fast regional parcels",
      "Domestic marketplace shipping",
    ],
  },
  {
    code: "royal_mail",
    name: "Royal Mail",
    brandName: "Royal Mail",
    businessAccountUrl: "https://www.royalmail.com/business",
    regionCodes: ["united_kingdom"],
    recommendedFor: ["united_kingdom"],
    wizardOrder: { united_kingdom: 1 },
    shortDescription: "The UK's national postal service with excellent rural coverage.",
    bestSuitedFor: ["Letters", "Small parcels", "Everyday business shipping"],
    typicalUseCases: [
      "Letters and small packets",
      "Nationwide rural delivery",
      "Day-to-day business post",
    ],
  },
  {
    code: "evri",
    name: "Evri",
    brandName: "Evri",
    businessAccountUrl: "https://www.evri.com/business",
    regionCodes: ["united_kingdom"],
    recommendedFor: ["united_kingdom"],
    wizardOrder: { united_kingdom: 2 },
    shortDescription: "Popular with marketplace sellers and affordable parcel shipping.",
    bestSuitedFor: ["eBay", "Vinted", "Online retail"],
    typicalUseCases: [
      "Marketplace seller parcels",
      "Affordable consumer returns",
      "High-volume small parcels",
    ],
  },
  {
    code: "dpd_uk",
    name: "DPD UK",
    brandName: "DPD",
    businessAccountUrl: "https://www.dpd.co.uk/content/business/",
    regionCodes: ["united_kingdom", "european_union"],
    recommendedFor: ["united_kingdom"],
    wizardOrder: { united_kingdom: 3 },
    shortDescription:
      "Premium courier with accurate delivery windows and excellent customer experience.",
    bestSuitedFor: ["Business deliveries", "Scheduled deliveries", "Customer notifications"],
    typicalUseCases: [
      "Timed business delivery slots",
      "Customer-facing parcel updates",
      "Premium domestic consignments",
    ],
  },
  {
    code: "parcelforce",
    name: "Parcelforce Worldwide",
    brandName: "Parcelforce",
    businessAccountUrl: "https://www.parcelforce.com/business",
    regionCodes: ["united_kingdom"],
    recommendedFor: ["united_kingdom"],
    wizardOrder: { united_kingdom: 4 },
    shortDescription: "Royal Mail's premium express and heavy parcel network.",
    bestSuitedFor: ["Heavy parcels", "Express delivery", "Business logistics"],
    typicalUseCases: [
      "Heavy and bulky parcels",
      "Express UK delivery",
      "Business logistics consignments",
    ],
  },
  {
    code: "dhl",
    name: "DHL",
    brandName: "DHL",
    businessAccountUrl: "https://www.dhl.com/gb-en/home/get-started.html",
    regionCodes: [
      "united_kingdom",
      "united_states",
      "european_union",
      "japan",
      "australia",
      "canada",
      "other",
    ],
    recommendedFor: ["united_kingdom"],
    wizardOrder: { united_kingdom: 5 },
    shortDescription: "International express courier for UK exports and imports.",
    bestSuitedFor: ["International shipping", "Express freight", "Global logistics"],
    typicalUseCases: [
      "UK export parcels",
      "Import express freight",
      "Global trade shipments",
    ],
  },
  {
    code: "deutsche_post_dhl",
    name: "Deutsche Post DHL",
    brandName: "Deutsche Post DHL",
    businessAccountUrl: "https://www.dhl.com/de-en/home/get-started.html",
    regionCodes: ["european_union"],
    recommendedFor: ["european_union"],
    wizardOrder: { european_union: 1 },
    shortDescription: "Europe's largest logistics and courier network.",
    bestSuitedFor: ["International business", "European logistics", "Global shipping"],
    typicalUseCases: [
      "Pan-European business parcels",
      "International logistics programmes",
      "High-volume EU shipping",
    ],
  },
  {
    code: "dpdgroup",
    name: "DPDgroup",
    brandName: "DPD",
    businessAccountUrl: "https://www.dpd.com/",
    regionCodes: ["european_union"],
    recommendedFor: ["european_union"],
    wizardOrder: { european_union: 2 },
    shortDescription: "Extensive European parcel delivery network with Pickup locations.",
    bestSuitedFor: ["EU deliveries", "Retail logistics", "Cross-border shipping"],
    typicalUseCases: [
      "Cross-border EU retail",
      "Pickup-point deliveries",
      "Regional European parcels",
    ],
  },
  {
    code: "gls",
    name: "GLS",
    brandName: "GLS",
    businessAccountUrl: "https://gls-group.com/",
    regionCodes: ["european_union"],
    recommendedFor: ["european_union"],
    wizardOrder: { european_union: 3 },
    shortDescription: "Ground parcel network connecting over forty European countries.",
    bestSuitedFor: ["Ground transport", "Commercial shipping", "Europe-wide delivery"],
    typicalUseCases: [
      "Commercial ground parcels",
      "Multi-country EU routes",
      "Business-to-business delivery",
    ],
  },
  {
    code: "postnl",
    name: "PostNL",
    brandName: "PostNL",
    businessAccountUrl: "https://www.postnl.nl/en/business/",
    regionCodes: ["european_union"],
    recommendedFor: ["european_union"],
    wizardOrder: { european_union: 4 },
    shortDescription: "Leading postal and parcel operator within the Benelux region.",
    bestSuitedFor: ["Benelux shipping", "E-commerce", "International parcels"],
    typicalUseCases: [
      "Netherlands and Benelux parcels",
      "E-commerce fulfilment",
      "International outbound mail",
    ],
  },
  {
    code: "ups_fedex_eu",
    name: "UPS / FedEx",
    brandName: "UPS / FedEx",
    businessAccountUrl: "https://www.ups.com/",
    regionCodes: ["european_union"],
    recommendedFor: ["european_union"],
    wizardOrder: { european_union: 5 },
    shortDescription:
      "International courier networks with extensive European operations.",
    bestSuitedFor: ["Priority freight", "International business", "Express delivery"],
    typicalUseCases: [
      "Priority European freight",
      "International business express",
      "Time-critical cross-border parcels",
    ],
    learnMore:
      "UPS and FedEx operate extensive European networks suited to priority freight, international business shipments, and express delivery when speed and global reach matter most.",
  },
  {
    code: "japan_post",
    name: "Japan Post",
    brandName: "Japan Post",
    businessAccountUrl: "https://www.post.japanpost.jp/index_en.html",
    regionCodes: ["japan"],
    recommendedFor: ["japan"],
    wizardOrder: { japan: 1 },
    shortDescription: "Japan's national postal service with unmatched domestic coverage.",
    bestSuitedFor: ["Domestic parcels", "International mail", "Everyday shipping"],
    typicalUseCases: [
      "Nationwide domestic parcels",
      "International mail and packets",
      "Everyday business post",
    ],
  },
  {
    code: "yamato",
    name: "Yamato Transport",
    brandName: "Yamato",
    businessAccountUrl: "https://www.kuronekoyamato.co.jp/en/",
    regionCodes: ["japan"],
    recommendedFor: ["japan"],
    wizardOrder: { japan: 2 },
    shortDescription: "Japan's most recognised door-to-door courier.",
    bestSuitedFor: ["Consumer deliveries", "Retail", "Takkyubin services"],
    typicalUseCases: [
      "Door-to-door consumer parcels",
      "Retail and marketplace delivery",
      "Takkyubin-style timed services",
    ],
  },
  {
    code: "sagawa",
    name: "Sagawa Express",
    brandName: "Sagawa",
    businessAccountUrl: "https://www.sagawa-exp.co.jp/english/",
    regionCodes: ["japan"],
    recommendedFor: ["japan"],
    wizardOrder: { japan: 3 },
    shortDescription: "Major B2B and consumer logistics provider.",
    bestSuitedFor: ["Commercial deliveries", "Larger parcels", "Freight"],
    typicalUseCases: [
      "B2B commercial deliveries",
      "Larger parcel consignments",
      "Mixed consumer and freight",
    ],
  },
  {
    code: "seino",
    name: "Seino Transportation",
    brandName: "Seino",
    businessAccountUrl: "https://www.seino.co.jp/en/",
    regionCodes: ["japan"],
    recommendedFor: ["japan"],
    wizardOrder: { japan: 4 },
    shortDescription: "Large-scale freight and commercial logistics specialist.",
    bestSuitedFor: ["Heavy freight", "Industrial shipping", "Commercial transport"],
    typicalUseCases: [
      "Heavy and industrial freight",
      "Commercial transport programmes",
      "Large-scale logistics moves",
    ],
  },
  {
    code: "dhl_fedex_japan",
    name: "DHL Japan / FedEx",
    brandName: "DHL / FedEx",
    businessAccountUrl: "https://www.dhl.com/jp-en/home/get-started.html",
    regionCodes: ["japan"],
    recommendedFor: ["japan"],
    wizardOrder: { japan: 5 },
    shortDescription: "Preferred providers for international shipments leaving Japan.",
    bestSuitedFor: ["International documents", "Overseas parcels", "Global trade"],
    typicalUseCases: [
      "Export documents and samples",
      "Overseas consumer parcels",
      "Global trade consignments",
    ],
    learnMore:
      "DHL and FedEx are commonly chosen for international shipments leaving Japan — documents, overseas parcels, and global trade where worldwide reach is essential.",
  },
] as const;

export function listRecommendedProvidersForRegion(
  region: ShippingRegionCode,
): ShippingProviderRegistryEntry[] {
  const recommended = SHIPPING_PROVIDER_REGISTRY.filter((provider) =>
    provider.recommendedFor.includes(region),
  );
  const list =
    recommended.length > 0
      ? [...recommended]
      : SHIPPING_PROVIDER_REGISTRY.filter((provider) => provider.regionCodes.includes(region));

  return list.sort((a, b) => {
    const orderA = a.wizardOrder?.[region] ?? 999;
    const orderB = b.wizardOrder?.[region] ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

export function getShippingProviderByCode(
  code: string,
): ShippingProviderRegistryEntry | undefined {
  return SHIPPING_PROVIDER_REGISTRY.find((provider) => provider.code === code);
}

export function getProviderBrandName(provider: ShippingProviderRegistryEntry): string {
  return provider.brandName ?? provider.name;
}

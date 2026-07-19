/**
 * Shipping Provider Registry (client seed for Logistics Setup Wizard).
 * UI must read from this registry — never hard-code provider names in components.
 * Aligns with FDR-MOD-092 / PRM-003: registry is system of record for display lists.
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
};

export const SHIPPING_REGIONS: readonly {
  code: ShippingRegionCode;
  label: string;
}[] = [
  { code: "united_kingdom", label: "United Kingdom" },
  { code: "united_states", label: "United States" },
  { code: "european_union", label: "European Union" },
  { code: "japan", label: "Japan" },
  { code: "australia", label: "Australia" },
  { code: "canada", label: "Canada" },
  { code: "other", label: "Other" },
] as const;

/** Platform registry seed — extend via data, not UI hard-coding. */
export const SHIPPING_PROVIDER_REGISTRY: readonly ShippingProviderRegistryEntry[] = [
  {
    code: "royal_mail",
    name: "Royal Mail",
    regionCodes: ["united_kingdom"],
    recommendedFor: ["united_kingdom"],
  },
  {
    code: "dpd_uk",
    name: "DPD UK",
    regionCodes: ["united_kingdom", "european_union"],
    recommendedFor: ["united_kingdom"],
  },
  {
    code: "evri",
    name: "Evri",
    regionCodes: ["united_kingdom"],
    recommendedFor: ["united_kingdom"],
  },
  {
    code: "parcelforce",
    name: "Parcelforce Worldwide",
    regionCodes: ["united_kingdom"],
    recommendedFor: ["united_kingdom"],
  },
  {
    code: "dhl",
    name: "DHL",
    regionCodes: [
      "united_kingdom",
      "united_states",
      "european_union",
      "japan",
      "australia",
      "canada",
      "other",
    ],
    recommendedFor: ["united_kingdom", "united_states", "european_union", "japan"],
  },
  {
    code: "dhl_express",
    name: "DHL Express",
    regionCodes: ["united_states", "european_union", "other"],
    recommendedFor: ["united_states"],
  },
  {
    code: "ups",
    name: "UPS",
    regionCodes: [
      "united_states",
      "united_kingdom",
      "european_union",
      "canada",
      "australia",
      "other",
    ],
    recommendedFor: ["united_states", "european_union", "canada"],
  },
  {
    code: "fedex",
    name: "FedEx",
    regionCodes: [
      "united_states",
      "united_kingdom",
      "european_union",
      "japan",
      "canada",
      "australia",
      "other",
    ],
    recommendedFor: ["united_states", "european_union", "japan", "canada"],
  },
  {
    code: "usps",
    name: "USPS",
    regionCodes: ["united_states"],
    recommendedFor: ["united_states"],
  },
  {
    code: "ontrac",
    name: "OnTrac",
    regionCodes: ["united_states"],
    recommendedFor: ["united_states"],
  },
  {
    code: "deutsche_post_dhl",
    name: "Deutsche Post DHL",
    regionCodes: ["european_union"],
    recommendedFor: ["european_union"],
  },
  {
    code: "dpdgroup",
    name: "DPDgroup",
    regionCodes: ["european_union"],
    recommendedFor: ["european_union"],
  },
  {
    code: "gls",
    name: "GLS",
    regionCodes: ["european_union"],
    recommendedFor: ["european_union"],
  },
  {
    code: "postnl",
    name: "PostNL",
    regionCodes: ["european_union"],
    recommendedFor: ["european_union"],
  },
  {
    code: "japan_post",
    name: "Japan Post",
    regionCodes: ["japan"],
    recommendedFor: ["japan"],
  },
  {
    code: "yamato",
    name: "Yamato Transport",
    regionCodes: ["japan"],
    recommendedFor: ["japan"],
  },
  {
    code: "sagawa",
    name: "Sagawa Express",
    regionCodes: ["japan"],
    recommendedFor: ["japan"],
  },
  {
    code: "seino",
    name: "Seino Transportation",
    regionCodes: ["japan"],
    recommendedFor: ["japan"],
  },
] as const;

export function listRecommendedProvidersForRegion(
  region: ShippingRegionCode,
): ShippingProviderRegistryEntry[] {
  const recommended = SHIPPING_PROVIDER_REGISTRY.filter((provider) =>
    provider.recommendedFor.includes(region),
  );
  if (recommended.length > 0) return [...recommended];
  return SHIPPING_PROVIDER_REGISTRY.filter((provider) =>
    provider.regionCodes.includes(region),
  );
}

export function getShippingProviderByCode(
  code: string,
): ShippingProviderRegistryEntry | undefined {
  return SHIPPING_PROVIDER_REGISTRY.find((provider) => provider.code === code);
}

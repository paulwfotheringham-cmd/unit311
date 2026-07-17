import { slugifyOrganisationName } from "@/lib/organisation-slug";
import {
  RESERVED_UNIT311_SUBDOMAINS,
  UNIT311_SITE_HOST,
  normalizeHost,
  parseClientPlatformSubdomainSafe,
} from "@/lib/app-domains";

export function slugifyClientSubdomain(companyName: string) {
  const slug = slugifyOrganisationName(companyName);
  return slug.replace(/-/g, "") || "client";
}

export function buildClientPlatformHost(subdomain: string) {
  return `${subdomain}.${UNIT311_SITE_HOST}`;
}

export function buildClientPlatformUrl(subdomain: string) {
  return `https://${buildClientPlatformHost(subdomain)}`;
}

export function buildClientPlatformLoginUrl(subdomain: string) {
  return `${buildClientPlatformUrl(subdomain)}/login`;
}

/** Future customer workspace entry (root). Not wired into middleware yet. */
export function buildClientPlatformDashboardUrl(subdomain: string) {
  return `${buildClientPlatformUrl(subdomain)}/`;
}

export function isReservedUnit311Subdomain(subdomain: string) {
  return RESERVED_UNIT311_SUBDOMAINS.has(normalizeHost(subdomain));
}

export function parseClientPlatformSubdomain(host: string | null | undefined): string | null {
  return parseClientPlatformSubdomainSafe(host);
}

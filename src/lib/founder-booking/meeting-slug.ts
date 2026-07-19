import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { slugifyOrganisationName } from "@/lib/organisation-slug";

export type ExecutiveMeetingStatus = "scheduled" | "completed" | "postponed" | "cancelled";

export const EXECUTIVE_MEETING_STATUSES: ExecutiveMeetingStatus[] = [
  "scheduled",
  "completed",
  "postponed",
  "cancelled",
];

export function buildExecutiveCallSlug(organization: string, bookingId: string) {
  const base = slugifyOrganisationName(organization) || "executive-call";
  const suffix = bookingId.replace(/-/g, "").slice(0, 8);
  return `${base}-${suffix}`;
}

export function buildExecutiveCallUrl(slug: string) {
  return `${CENTRAL_SITE_URL}/executivecall/${slug}`;
}

export function extractExecutiveCallSlugFromUrl(videoLink: string | null | undefined) {
  if (!videoLink) return null;
  const match = videoLink.trim().match(/\/executivecall\/([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function formatExecutiveMeetingStatus(status: string) {
  switch (status) {
    case "completed":
      return "Completed";
    case "postponed":
      return "Postponed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Scheduled";
  }
}

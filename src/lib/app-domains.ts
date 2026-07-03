export const CENTRAL_SITE_HOST = "unit311central.com";

export const CENTRAL_SITE_URL = `https://${CENTRAL_SITE_HOST}`;

const CENTRAL_HOSTS = new Set([CENTRAL_SITE_HOST, `www.${CENTRAL_SITE_HOST}`]);

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].trim().toLowerCase();
}

export function isCentralDomainHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  if (CENTRAL_HOSTS.has(normalized)) return true;
  return normalized.replace(/^www\./, "") === CENTRAL_SITE_HOST;
}

export function centralLoginPath() {
  return "/login";
}

export function centralDashboardPath(view?: string) {
  if (!view) return "/internaldashboard";
  return `/internaldashboard?view=${encodeURIComponent(view)}`;
}

import { canonicalizeStoredRedirectPath } from "@/lib/app-domains";

/**
 * Navigate after login/auth. Supports absolute cross-subdomain URLs
 * (public apex → internal.unit311central.com) without changing auth logic.
 * Never navigates to a visible `/internaldashboard` browser path in production.
 */
export function navigateRedirectPath(
  redirectPath: string,
  router: { push: (href: string) => void; refresh?: () => void },
) {
  const trimmed = redirectPath.trim();
  const target = /^https?:\/\//i.test(trimmed)
    ? (() => {
        try {
          const url = new URL(trimmed);
          const path = canonicalizeStoredRedirectPath(`${url.pathname}${url.search}`);
          return `${url.origin}${path}`;
        } catch {
          return canonicalizeStoredRedirectPath(trimmed);
        }
      })()
    : canonicalizeStoredRedirectPath(trimmed);

  if (/^https?:\/\//i.test(target)) {
    window.location.assign(target);
    return;
  }

  router.push(target);
  router.refresh?.();
}

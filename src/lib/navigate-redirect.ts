/**
 * Navigate after login/auth. Supports absolute cross-subdomain URLs
 * (public apex → internal.unit311central.com) without changing auth logic.
 */
export function navigateRedirectPath(
  redirectPath: string,
  router: { push: (href: string) => void; refresh?: () => void },
) {
  if (/^https?:\/\//i.test(redirectPath)) {
    window.location.assign(redirectPath);
    return;
  }
  router.push(redirectPath);
  router.refresh?.();
}

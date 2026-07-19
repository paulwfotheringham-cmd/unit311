export function isClientCallRoute(pathname: string | null): boolean {
  if (!pathname) return false;

  return pathname.startsWith("/executivecall/") || pathname.startsWith("/meet/");
}

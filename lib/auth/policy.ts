/** When true, pages and APIs require a signed-in Supabase user. */
export function isAuthRequired(): boolean {
  const raw =
    process.env.AUTH_REQUIRED ??
    process.env.NEXT_PUBLIC_AUTH_REQUIRED ??
    "";
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

import { isAuthGateBypass } from "@/lib/auth/protected-routes";

const PUBLIC_PAGE_PREFIXES = ["/auth/callback"] as const;

const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/auth/",
  "/api/globe/tile",
] as const;

export function isPublicPagePath(pathname: string): boolean {
  if (isAuthGateBypass(pathname)) {
    return true;
  }

  return PUBLIC_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isPublicPath(pathname: string, method = "GET"): boolean {
  if (pathname.startsWith("/api/")) {
    return isPublicApiPath(pathname);
  }

  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  return isPublicPagePath(pathname);
}

export function buildLoginRedirectUrl(requestUrl: URL, nextPath?: string) {
  const login = new URL("/feed", requestUrl.origin);
  const next =
    nextPath ??
    `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`;
  if (next && next.startsWith("/") && next !== "/feed") {
    login.searchParams.set("next", next);
  }
  return login;
}

export { isProtectedRoute, PROTECTED_ROUTES } from "@/lib/auth/protected-routes";

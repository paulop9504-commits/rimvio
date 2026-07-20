import { isAuthGateBypass } from "@/lib/auth/protected-routes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** When true, pages and APIs require a signed-in Supabase user. */
export function isAuthRequired(): boolean {
  // Prefer NEXT_PUBLIC so AuthGate SSR HTML and client hydrate agree (#418).
  // AUTH_REQUIRED remains a server/middleware fallback when public flag is unset.
  const raw =
    process.env.NEXT_PUBLIC_AUTH_REQUIRED ??
    process.env.AUTH_REQUIRED ??
    "";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  // Deployed Rimvio: Google login required (localhost stays open).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  if (
    appUrl.includes("rimvio.vercel.app") ||
    appUrl === "https://rimvio.com" ||
    appUrl === "https://www.rimvio.com" ||
    appUrl === "https://rimvio.app" ||
    (appUrl.endsWith(".vercel.app") && !appUrl.includes("localhost"))
  ) {
    return isSupabaseConfigured();
  }

  return false;
}

const PUBLIC_PAGE_PREFIXES = ["/auth/callback"] as const;

const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/auth/",
  "/api/globe/tile",
  // Anonymous community seed stats (token counts only — no utterance / user id)
  "/api/seed-learning/",
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

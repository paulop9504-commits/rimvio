import { isAuthGateBypass } from "@/lib/auth/protected-routes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Legacy full-app login wall flag (emergency only).
 * Guest-first default: Globe · context chat · Diff work without login.
 * Commit/payment/peers/vault use per-route `login_required` / `requireAuthUser`.
 *
 * Set NEXT_PUBLIC_AUTH_REQUIRED=true only for emergency lockdown tooling —
 * AuthGate no longer full-screens; prefer soft gates.
 */
export function isAuthRequired(): boolean {
  // Prefer NEXT_PUBLIC so SSR and client agree (#418).
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

  // No auto-wall on rimvio.com / Vercel — guest Globe first.
  return false;
}

/** True when identity is needed for Commit / cloud sync (Supabase ready). */
export function isIdentityGateAvailable(): boolean {
  return isSupabaseConfigured();
}

const PUBLIC_PAGE_PREFIXES = ["/auth/callback"] as const;

const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/auth/",
  "/api/globe/tile",
  "/api/analytics/",
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

import {
  DEV_ONLY_ROUTE_PREFIXES,
  isDevOnlyRoute,
} from "@/lib/dev/rimvio-surface-tiers";

const DEV_COOKIE = "rimvio-dev";

export { isDevOnlyRoute as isDevOnlyPath };

export function isDevSurfacesEnabled(request: {
  nextUrl: URL;
  cookies: { get: (name: string) => { value: string } | undefined };
}) {
  if (process.env.NEXT_PUBLIC_DEV_SURFACES === "1") {
    return true;
  }

  if (request.nextUrl.searchParams.get("dev") === "1") {
    return true;
  }

  return request.cookies.get(DEV_COOKIE)?.value === "1";
}

/** @deprecated use isDevOnlyRoute from rimvio-surface-tiers */
export const DEV_ONLY_PREFIXES = DEV_ONLY_ROUTE_PREFIXES;

export function devCookieOptions() {
  return {
    name: DEV_COOKIE,
    value: "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax" as const,
  };
}

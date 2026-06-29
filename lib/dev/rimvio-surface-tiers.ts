/**
 * Rimvio surface triage — keep product, dev observability, and dev metrics separate.
 *
 * | Tier          | Audience   | Entry                         |
 * |---------------|------------|-------------------------------|
 * | Context Ops   | developer  | `/metrics` + context-snapshot |
 * | Field         | product    | bottom-nav 맞춤 · field sheet |
 * | Dev Intel     | developer  | `/dev/intelligence`           |
 *
 * Field is never mounted from `/metrics`. Context Ops never opens trades/discovery UI.
 */

export const CONTEXT_OPS_ROUTE = "/metrics" as const;
export const CONTEXT_OPS_API_ROUTE = "/api/dev/context-snapshot" as const;
export const DEV_INTELLIGENCE_ROUTE = "/dev/intelligence" as const;

/** Product Field dashboard — sheet ingress only (no dedicated page route). */
export const FIELD_DASHBOARD_INGRESS = "openFieldDashboardFromBottomNav" as const;

export const DEV_ONLY_ROUTE_PREFIXES = [
  "/metrics",
  "/dev/",
  "/demo",
  "/stack",
  "/actions/",
] as const;

export const DEV_ONLY_API_PREFIXES = ["/api/dev/"] as const;

export type DevSurfaceNavId = "context-ops" | "intelligence";

export const DEV_SURFACE_NAV: ReadonlyArray<{
  id: DevSurfaceNavId;
  href: string;
  label: string;
  blurb: string;
}> = [
  {
    id: "context-ops",
    href: CONTEXT_OPS_ROUTE,
    label: "Context Ops",
    blurb: "파이프라인 · recall · graph · alerts",
  },
  {
    id: "intelligence",
    href: DEV_INTELLIGENCE_ROUTE,
    label: "Dev Intelligence",
    blurb: "PMF · opportunity · goal · analytics",
  },
];

export function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix);
}

export function isDevOnlyRoute(pathname: string): boolean {
  return DEV_ONLY_ROUTE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isDevOnlyApi(pathname: string): boolean {
  return DEV_ONLY_API_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isContextOpsRoute(pathname: string): boolean {
  return pathname === CONTEXT_OPS_ROUTE || pathname.startsWith(`${CONTEXT_OPS_ROUTE}/`);
}

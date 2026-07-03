/**
 * Rimvio Surface IA — code SSOT for routes, bottom nav, redirects.
 *
 * Docs: `docs/RIMVIO_TAB_ARCHITECTURE.md`
 * ADR: `docs/adr/001-globe-first-home.md`
 *
 * When IA changes: update this file first, then docs/rules and `scripts/test-tab-architecture.ts`.
 */

/** Dot-path into `lib/copy/human-ko.ts` — `nav.*` keys only. */
export type RimvioNavLabelKey =
  | "nav.globe"
  | "nav.field"
  | "nav.people"
  | "nav.capture";

export type RimvioSecondaryNavLabelKey = "nav.search" | "nav.inbox";

export type RimvioPrimarySurface = {
  id: "globe" | "field" | "peers" | "capture";
  /** `null` = sheet/action ingress (no route navigation). */
  route: string | null;
  navLabelKey: RimvioNavLabelKey;
  role: string;
  experienceLayer: "RECALL" | "ACTION" | "H2H" | "SENSE";
  ingress: readonly string[];
  egress: readonly string[];
  bottomNav: true;
};

export type RimvioSecondarySurface = {
  id: "search" | "now" | "inbox";
  route: string;
  navLabelKey: RimvioSecondaryNavLabelKey | null;
  role: string;
  experienceLayer: "SENSE" | "ACTION" | "DECIDE";
  ingress: readonly string[];
  egress: readonly string[];
  bottomNav: false;
};

export type RimvioDeprecatedSurface = {
  id: "stack";
  route: string;
  role: string;
  note: string;
};

/** Bottom-nav primary shell (4 tabs). */
export const RIMVIO_PRIMARY_SURFACES: readonly RimvioPrimarySurface[] = [
  {
    id: "globe",
    route: "/",
    navLabelKey: "nav.globe",
    role: "Globe home — pins, recall, compose dock (Three Floors floor 1)",
    experienceLayer: "RECALL",
    ingress: ["bottom nav", "/feed redirect", "/globe redirect", "Share Done default"],
    egress: ["/search", "/peers", "Field sheet", "capture sheet"],
    bottomNav: true,
  },
  {
    id: "field",
    route: "/field",
    navLabelKey: "nav.field",
    role: "Field sheet ingress — trades, discovery, mine (no full-page nav)",
    experienceLayer: "ACTION",
    ingress: ["bottom nav sheet", "Globe continuity portal"],
    egress: ["Globe home", "external execute"],
    bottomNav: true,
  },
  {
    id: "peers",
    route: "/peers",
    navLabelKey: "nav.people",
    role: "People — DM, ROOM, AI lens",
    experienceLayer: "H2H",
    ingress: ["bottom nav", "Globe people chips", "peer deep links"],
    egress: ["Globe recall", "/search composer"],
    bottomNav: true,
  },
  {
    id: "capture",
    route: null,
    navLabelKey: "nav.capture",
    role: "Capture sheet — photo, link, memo (+ bottom nav)",
    experienceLayer: "SENSE",
    ingress: ["bottom nav + action", "rimvio:open-capture-sheet bridge"],
    egress: ["/now", "Globe home", "/search hub"],
    bottomNav: true,
  },
] as const;

/** Not in bottom nav — still first-class routes. */
export const RIMVIO_SECONDARY_SURFACES: readonly RimvioSecondarySurface[] = [
  {
    id: "search",
    route: "/search",
    navLabelKey: "nav.search",
    role: "Capture hub + composer (rimvio:search scope)",
    experienceLayer: "SENSE",
    ingress: ["/chat redirect", "Globe compose dock", "deep links"],
    egress: ["Globe home", "/peers", "Field sheet"],
    bottomNav: false,
  },
  {
    id: "now",
    route: "/now",
    navLabelKey: null,
    role: "Share landing — Primary CTA + Done",
    experienceLayer: "ACTION",
    ingress: ["/share bridge", "Share Target API"],
    egress: ["/", "Globe home"],
    bottomNav: false,
  },
  {
    id: "inbox",
    route: "/inbox",
    navLabelKey: "nav.inbox",
    role: "Deep list — full scroll, no guilt on home",
    experienceLayer: "DECIDE",
    ingress: ["settings, deep links"],
    egress: ["Globe home", "/now"],
    bottomNav: false,
  },
] as const;

/** Legacy path to canonical (see app redirect handlers). */
export const RIMVIO_REDIRECTS = {
  "/feed": "/",
  "/chat": "/search",
  "/archive": "/?filter=archive",
  "/globe": "/",
} as const;

export type RimvioLegacyRedirectFrom = keyof typeof RIMVIO_REDIRECTS;

/** Dev-only — never linked from production chrome. */
export const RIMVIO_DEV_ONLY_ROUTES = [
  "/metrics",
  "/dev",
  "/demo",
  "/stack",
  "/actions",
] as const;

/** Dev / secondary — not primary nav. */
export const RIMVIO_DEPRECATED_SURFACES: readonly RimvioDeprecatedSurface[] = [
  {
    id: "stack",
    route: "/stack",
    role: "Next-action card stack (dev)",
    note: "One card sharp at a time — not bottom nav",
  },
] as const;

/** Flat route map for layers + orchestrator references. */
export const SURFACE_ROUTES = {
  globe: "/",
  field: "/field",
  peers: "/peers",
  search: "/search",
  now: "/now",
  inbox: "/inbox",
  stack: "/stack",
} as const;

export type RimvioSurfaceId = keyof typeof SURFACE_ROUTES;

/** @deprecated Use RIMVIO_REDIRECTS — kept for lib/layers compat. */
export const LEGACY_SURFACE_REDIRECTS = {
  feed: "/",
  chat: "/search",
  archive: "/?filter=archive",
  globeAlias: "/",
} as const;

/** Bottom-nav hrefs only (excludes capture sheet action). */
export function rimvioBottomNavRoutes(): string[] {
  return RIMVIO_PRIMARY_SURFACES.filter((s) => s.route != null).map((s) => s.route!);
}

/** Globe home renderer paths (incl. legacy /globe alias). */
export function isGlobeHomePath(pathname: string): boolean {
  const path = pathname.trim() || "/";
  return path === "/" || path === "/globe" || path.startsWith("/globe/");
}

/** Bottom-nav globe tab active — includes /feed before legacy redirect. */
export function isPrimaryNavGlobePath(pathname: string): boolean {
  const path = pathname.trim() || "/";
  return isGlobeHomePath(path) || path === "/feed" || path.startsWith("/feed/");
}

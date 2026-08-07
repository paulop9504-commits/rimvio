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
  | "nav.people";

export type RimvioSecondaryNavLabelKey = "nav.search" | "nav.inbox" | "nav.capture";

export type RimvioPrimarySurface = {
  id: "globe" | "field" | "peers";
  route: string | null;
  navLabelKey: RimvioNavLabelKey;
  role: string;
  experienceLayer: "RECALL" | "ACTION" | "H2H" | "SENSE";
  ingress: readonly string[];
  egress: readonly string[];
  bottomNav: true;
};

export type RimvioSecondarySurface = {
  id: "search" | "now" | "inbox" | "capture";
  route: string | null;
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

/** Bottom-nav primary shell (3 tabs) — Globe · Field · People. */
export const RIMVIO_PRIMARY_SURFACES: readonly RimvioPrimarySurface[] = [
  {
    id: "globe",
    route: "/",
    navLabelKey: "nav.globe",
    role: "Globe home — pins, recall, compose dock (search · capture · chat in prompt)",
    experienceLayer: "RECALL",
    ingress: [
      "bottom nav",
      "/feed redirect",
      "/globe redirect",
      "/search redirect",
      "Share Done default",
    ],
    egress: ["/peers", "Field sheet", "Workspace"],
    bottomNav: true,
  },
  {
    id: "field",
    route: "/field",
    navLabelKey: "nav.field",
    role: "Field sheet — Reality Control Center (queue · trades · mine)",
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
    egress: ["Globe recall", "Globe composer"],
    bottomNav: true,
  },
] as const;

/** Not in bottom nav — still first-class routes / soft ingress. */
export const RIMVIO_SECONDARY_SURFACES: readonly RimvioSecondarySurface[] = [
  {
    id: "search",
    route: "/search",
    navLabelKey: "nav.search",
    role: "Legacy hub — redirects to Globe composer (/)",
    experienceLayer: "SENSE",
    ingress: ["/chat redirect", "deep links"],
    egress: ["Globe home composer"],
    bottomNav: false,
  },
  {
    id: "capture",
    route: null,
    navLabelKey: "nav.capture",
    role: "Capture absorbed into Globe prompt (no dedicated sheet in chrome)",
    experienceLayer: "SENSE",
    ingress: ["Globe composer + / photo", "rimvio:focus-globe-composer"],
    egress: ["Globe home", "/now"],
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

export const RIMVIO_REDIRECTS = {
  "/feed": "/",
  "/chat": "/",
  "/search": "/",
  "/archive": "/?filter=archive",
  "/globe": "/",
} as const;

export type RimvioLegacyRedirectFrom = keyof typeof RIMVIO_REDIRECTS;

export const RIMVIO_DEV_ONLY_ROUTES = [
  "/metrics",
  "/dev",
  "/demo",
  "/stack",
  "/actions",
] as const;

export const RIMVIO_DEPRECATED_SURFACES: readonly RimvioDeprecatedSurface[] = [
  {
    id: "stack",
    route: "/stack",
    role: "Next-action card stack (dev)",
    note: "One card sharp at a time — not bottom nav",
  },
] as const;

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

export const LEGACY_SURFACE_REDIRECTS = {
  feed: "/",
  chat: "/",
  archive: "/?filter=archive",
  globeAlias: "/",
} as const;

export function rimvioBottomNavRoutes(): string[] {
  return RIMVIO_PRIMARY_SURFACES.filter((s) => s.route != null).map(
    (s) => s.route!,
  );
}

export function isGlobeHomePath(pathname: string): boolean {
  const path = pathname.trim() || "/";
  return path === "/" || path === "/globe" || path.startsWith("/globe/");
}

export function isPrimaryNavGlobePath(pathname: string): boolean {
  const path = pathname.trim() || "/";
  return isGlobeHomePath(path) || path === "/feed" || path.startsWith("/feed/");
}

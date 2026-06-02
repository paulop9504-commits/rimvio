import { cn } from "@/lib/utils";
import { GLANGO_CANVAS, GLANGO_LOGO_ICON_BG } from "@/lib/brand/glango-logo-src";

/**
 * Apple-grade dark canvas + multi-neon edge accents.
 * Surfaces stay near-base; color lives on edges and key actions.
 */
export const GLANGO_NEON = {
  canvas: GLANGO_LOGO_ICON_BG,
  base: GLANGO_CANVAS,
  surface: "#262626",
  surfaceMuted: "#161616",
  surfaceRaised: "#303030",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
  purple: "#bf5af2",
  purpleDeep: "#9d4edd",
  cyan: "#32d7ff",
  cyanDeep: "#00c7e0",
  magenta: "#ff375f",
  amber: "#ffd60a",
  green: "#30d158",
  text: "#f5f5f7",
  textMuted: "#98989d",
  textDim: "#636366",
  primaryBtn: "#9d4edd",
  primaryBtnPressed: "#7b2cbf",
  focusRing: "rgba(50, 215, 255, 0.5)",
} as const;

export type GlangoEdgeVariant = "default" | "cyan" | "magenta" | "amber" | "green";

const EDGE_VARIANT_CLASS: Record<GlangoEdgeVariant, string> = {
  default: "",
  cyan: "glango-edge-card--cyan",
  magenta: "glango-edge-card--magenta",
  amber: "glango-edge-card--amber",
  green: "glango-edge-card--green",
};

/** Logo tile — prismatic edge only; mark blends with page canvas. */
export const glangoLogoFrameClass = cn(
  "glango-edge-card glango-edge-card--logo rounded-2xl bg-transparent p-1",
  "shadow-[0_0_40px_rgba(191,90,242,0.22)]",
);

export const glangoNeonWordmarkClass = cn(
  "bg-gradient-to-r from-glango-neon-cyan via-glango-neon-purple to-glango-neon-magenta",
  "bg-clip-text text-transparent",
  "drop-shadow-[0_0_20px_rgba(191,90,242,0.45)]",
);

export function glangoEdgeCardClass(
  size: "sm" | "lg" = "lg",
  variant: GlangoEdgeVariant = "default",
) {
  return cn(
    "glango-edge-card",
    size === "lg" ? "glango-edge-card--lg" : "glango-edge-card--sm",
    EDGE_VARIANT_CLASS[variant],
  );
}

export const glangoNeonCardClass = glangoEdgeCardClass("lg");
export const glangoNeonCardSmClass = glangoEdgeCardClass("sm");

/** Sticky chrome — hairline neon gradient on the bottom edge. */
export const glangoHeaderChromeClass =
  "glango-header-chrome border-b border-transparent bg-glango-base/80 backdrop-blur-2xl";

/** Bottom tab bar — neon top edge + frosted canvas. */
export const glangoNavBarClass =
  "glango-nav-bar border-t border-transparent bg-glango-base/90 backdrop-blur-2xl";

export type GlangoIconBtnVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "cyan"
  | "magenta"
  | "green";

const ICON_BTN_VARIANT: Record<GlangoIconBtnVariant, string> = {
  primary: "glango-icon-btn--primary",
  secondary: "glango-icon-btn--secondary",
  ghost: "glango-icon-btn--ghost",
  cyan: "glango-icon-btn--cyan",
  magenta: "glango-icon-btn--magenta",
  green: "glango-icon-btn--green",
};

/** Circular icon control (+ / mic / send / close). */
export function glangoIconBtnClass(
  variant: GlangoIconBtnVariant = "primary",
  size: "md" | "sm" = "md",
) {
  return cn(
    "glango-icon-btn",
    size === "sm" && "glango-icon-btn--sm",
    ICON_BTN_VARIANT[variant],
  );
}

export type GlangoMenuTileAccent = "cyan" | "purple" | "magenta" | "green";

const MENU_TILE_ACCENT: Record<GlangoMenuTileAccent, string> = {
  cyan: "glango-menu-tile--cyan",
  purple: "glango-menu-tile--purple",
  magenta: "glango-menu-tile--magenta",
  green: "glango-menu-tile--green",
};

/** Capture menu grid shell. */
export const glangoMenuGridClass =
  "glango-menu-grid mb-2 grid grid-cols-4 gap-2 rounded-[16px] p-2.5";

/** One tile inside the capture menu. */
export function glangoMenuTileBtnClass(accent: GlangoMenuTileAccent) {
  return cn("glango-menu-tile", MENU_TILE_ACCENT[accent]);
}

/** Composer text field inset on black chrome. */
export const glangoComposerFieldClass = "glango-composer-field";

/** Pill / chip toggle on black canvas. */
export function glangoChipBtnClass(active = false) {
  return cn("glango-chip-btn", active && "glango-chip-btn--active");
}

/** Full-width list pick row (location, options). */
export function glangoListPickBtnClass(recommended = false) {
  return cn("glango-list-pick-btn", recommended && "glango-list-pick-btn--recommended");
}

/** Inline @mention chip shell — dark OS unified. */
export function glangoInlineChipClass(
  size: "sm" | "md" | "lg" | "inline" = "md",
) {
  return cn(
    "glango-inline-chip",
    size === "sm" && "glango-inline-chip--sm",
    size === "md" && "glango-inline-chip--md",
    size === "lg" && "glango-inline-chip--lg",
    size === "inline" && "glango-inline-chip--inline",
  );
}

export const glangoInlineChipHeaderClass = "glango-inline-chip__header";
export const glangoInlineChipBodyClass = "glango-inline-chip__body";
export const glangoInlineChipTitleClass = "glango-inline-chip__title";
export const glangoInlineChipMetaClass = "glango-inline-chip__meta";
export const glangoStripLinkBtnClass = "glango-strip-link-btn";

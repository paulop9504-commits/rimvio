import { cn } from "@/lib/utils";
import { RIMVIO_CANVAS, RIMVIO_LOGO_ICON_BG } from "@/lib/brand/rimvio-logo-src";

/**
 * Apple-grade dark canvas + multi-neon edge accents.
 * Surfaces stay near-base; color lives on edges and key actions.
 */
export const RIMVIO_NEON = {
  canvas: RIMVIO_LOGO_ICON_BG,
  base: RIMVIO_CANVAS,
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

export type RimvioEdgeVariant = "default" | "cyan" | "magenta" | "amber" | "green";

const EDGE_VARIANT_CLASS: Record<RimvioEdgeVariant, string> = {
  default: "",
  cyan: "rimvio-edge-card--cyan",
  magenta: "rimvio-edge-card--magenta",
  amber: "rimvio-edge-card--amber",
  green: "rimvio-edge-card--green",
};

/** Logo tile — prismatic edge only; mark blends with page canvas. */
export const rimvioLogoFrameClass = cn(
  "rimvio-edge-card rimvio-edge-card--logo rounded-2xl bg-transparent p-1",
  "shadow-[0_0_40px_rgba(191,90,242,0.22)]",
);

export const rimvioNeonWordmarkClass = cn(
  "bg-gradient-to-r from-rimvio-neon-cyan via-rimvio-neon-purple to-rimvio-neon-magenta",
  "bg-clip-text text-transparent",
  "drop-shadow-[0_0_20px_rgba(191,90,242,0.45)]",
);

export function rimvioEdgeCardClass(
  size: "sm" | "lg" = "lg",
  variant: RimvioEdgeVariant = "default",
) {
  return cn(
    "rimvio-edge-card",
    size === "lg" ? "rimvio-edge-card--lg" : "rimvio-edge-card--sm",
    EDGE_VARIANT_CLASS[variant],
  );
}

export const rimvioNeonCardClass = rimvioEdgeCardClass("lg");
export const rimvioNeonCardSmClass = rimvioEdgeCardClass("sm");

/** Sticky chrome — hairline neon gradient on the bottom edge. */
export const rimvioHeaderChromeClass =
  "rimvio-header-chrome border-b border-transparent bg-rimvio-base/80 backdrop-blur-2xl";

/** Bottom tab bar — neon top edge + frosted canvas. */
export const rimvioNavBarClass =
  "rimvio-nav-bar border-t border-transparent bg-rimvio-base/90 backdrop-blur-2xl";

export type RimvioIconBtnVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "cyan"
  | "magenta"
  | "green";

const ICON_BTN_VARIANT: Record<RimvioIconBtnVariant, string> = {
  primary: "rimvio-icon-btn--primary",
  secondary: "rimvio-icon-btn--secondary",
  ghost: "rimvio-icon-btn--ghost",
  cyan: "rimvio-icon-btn--cyan",
  magenta: "rimvio-icon-btn--magenta",
  green: "rimvio-icon-btn--green",
};

/** Circular icon control (+ / mic / send / close). */
export function rimvioIconBtnClass(
  variant: RimvioIconBtnVariant = "primary",
  size: "md" | "sm" = "md",
) {
  return cn(
    "rimvio-icon-btn",
    size === "sm" && "rimvio-icon-btn--sm",
    ICON_BTN_VARIANT[variant],
  );
}

export type RimvioMenuTileAccent = "cyan" | "purple" | "magenta" | "green";

const MENU_TILE_ACCENT: Record<RimvioMenuTileAccent, string> = {
  cyan: "rimvio-menu-tile--cyan",
  purple: "rimvio-menu-tile--purple",
  magenta: "rimvio-menu-tile--magenta",
  green: "rimvio-menu-tile--green",
};

/** Capture menu grid shell. */
export const rimvioMenuGridClass =
  "rimvio-menu-grid mb-2 grid grid-cols-4 gap-2 rounded-[16px] p-2.5";

/** One tile inside the capture menu. */
export function rimvioMenuTileBtnClass(accent: RimvioMenuTileAccent) {
  return cn("rimvio-menu-tile", MENU_TILE_ACCENT[accent]);
}

/** Composer text field inset on black chrome. */
export const rimvioComposerFieldClass = "rimvio-composer-field";

/** Pill / chip toggle on black canvas. */
export function rimvioChipBtnClass(active = false) {
  return cn("rimvio-chip-btn", active && "rimvio-chip-btn--active");
}

/** Full-width list pick row (location, options). */
export function rimvioListPickBtnClass(recommended = false) {
  return cn("rimvio-list-pick-btn", recommended && "rimvio-list-pick-btn--recommended");
}

/** Inline @mention chip shell — dark OS unified. */
export function rimvioInlineChipClass(
  size: "sm" | "md" | "lg" | "inline" = "md",
) {
  return cn(
    "rimvio-inline-chip",
    size === "sm" && "rimvio-inline-chip--sm",
    size === "md" && "rimvio-inline-chip--md",
    size === "lg" && "rimvio-inline-chip--lg",
    size === "inline" && "rimvio-inline-chip--inline",
  );
}

export const rimvioInlineChipHeaderClass = "rimvio-inline-chip__header";
export const rimvioInlineChipBodyClass = "rimvio-inline-chip__body";
export const rimvioInlineChipTitleClass = "rimvio-inline-chip__title";
export const rimvioInlineChipMetaClass = "rimvio-inline-chip__meta";
export const rimvioStripLinkBtnClass = "rimvio-strip-link-btn";

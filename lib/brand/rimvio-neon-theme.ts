import { cn } from "@/lib/utils";

/**
 * Rimvio visual tokens — Simple is Best (Apple-grade light canvas).
 */
export const RIMVIO_NEON = {
  canvas: "#f5f5f7",
  base: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f5f5f7",
  surfaceRaised: "#ffffff",
  border: "rgba(0, 0, 0, 0.08)",
  borderSubtle: "rgba(0, 0, 0, 0.04)",
  purple: "#0071e3",
  purpleDeep: "#0066cc",
  cyan: "#0071e3",
  cyanDeep: "#0066cc",
  magenta: "#ff3b30",
  amber: "#ff9500",
  green: "#34c759",
  text: "#1d1d1f",
  textMuted: "#86868b",
  textDim: "#aeaeb2",
  primaryBtn: "#0071e3",
  primaryBtnPressed: "#0066cc",
  focusRing: "rgba(0, 113, 227, 0.35)",
} as const;

export type RimvioEdgeVariant = "default" | "cyan" | "magenta" | "amber" | "green";

const EDGE_VARIANT_CLASS: Record<RimvioEdgeVariant, string> = {
  default: "",
  cyan: "rimvio-edge-card--cyan",
  magenta: "rimvio-edge-card--magenta",
  amber: "rimvio-edge-card--amber",
  green: "rimvio-edge-card--green",
};

/** Logo tile — minimal edge on light canvas. */
export const rimvioLogoFrameClass = cn(
  "rounded-2xl bg-transparent p-1",
  "shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
);

export const rimvioNeonWordmarkClass = cn(
  "font-semibold tracking-tight text-primary",
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

export const rimvioNeonCardClass = cn(
  "rounded-2xl bg-card text-card-foreground",
  "shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]",
);
export const rimvioNeonCardSmClass = cn(
  "rounded-xl bg-card text-card-foreground",
  "shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04]",
);

/** Sticky chrome — soft divider on light canvas. */
export const rimvioHeaderChromeClass =
  "rimvio-header-chrome border-b border-border/70 bg-rimvio-base/92 backdrop-blur-xl";

/** Bottom tab bar — frosted light panel. */
export const rimvioNavBarClass =
  "rimvio-nav-bar border-t border-border/70 bg-rimvio-base/95 backdrop-blur-xl";

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

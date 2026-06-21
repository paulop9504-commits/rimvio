/**
 * Rimvio UI ontology — Simple is Best (SSOT).
 * Canvas → Surface → Action. One primary CTA per viewport. No visual noise.
 */
import { cn } from "@/lib/utils";

/** L0 canvas — app background */
export const RIMVIO_CANVAS = "#f5f5f7" as const;

/** L1 surfaces */
export const RIMVIO_SURFACE = {
  base: "#ffffff",
  muted: "#f5f5f7",
  elevated: "#ffffff",
} as const;

/** L2 ink */
export const RIMVIO_INK = {
  primary: "#1d1d1f",
  secondary: "#86868b",
  tertiary: "#aeaeb2",
} as const;

/** L3 action — Apple system blue */
export const RIMVIO_ACTION = {
  primary: "#0071e3",
  primaryPressed: "#0077ed",
  primaryForeground: "#ffffff",
} as const;

/** Type scale (pt-like on mobile) */
export const RIMVIO_TYPE = {
  /** Screen title */
  title: "text-[28px] font-bold tracking-tight text-foreground leading-tight",
  /** Section / sheet title */
  headline: "text-[17px] font-semibold tracking-tight text-foreground leading-snug",
  /** Body */
  body: "text-[15px] font-normal leading-relaxed text-foreground",
  /** Caption / meta */
  caption: "text-[12px] font-medium text-muted-foreground",
  /** Eyebrow — use sparingly */
  eyebrow:
    "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
} as const;

/** Elevation — shadow only, no heavy borders */
export const RIMVIO_ELEVATION = {
  sm: "shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
  md: "shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
  lg: "shadow-[0_12px_40px_rgba(0,0,0,0.12)]",
  nav: "shadow-[0_-1px_0_rgba(0,0,0,0.06)]",
} as const;

/** Radius — continuous corners */
export const RIMVIO_RADIUS = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-[1.25rem]",
  pill: "rounded-full",
} as const;

/** Standard content card */
export function rimvioSurfaceCardClass(className?: string) {
  return cn(
    "bg-card text-card-foreground",
    RIMVIO_RADIUS.lg,
    RIMVIO_ELEVATION.sm,
    "ring-1 ring-black/[0.04]",
    className,
  );
}

/** Hero primary CTA — full width, one per surface */
export function rimvioHeroCtaClass(className?: string) {
  return cn(
    "inline-flex min-h-11 w-full items-center justify-center gap-2",
    RIMVIO_RADIUS.pill,
    "bg-primary px-5 text-[15px] font-semibold text-primary-foreground",
    "shadow-[0_2px_8px_rgba(0,113,227,0.28)]",
    "transition active:scale-[0.98] active:opacity-90",
    "disabled:pointer-events-none disabled:opacity-50",
    className,
  );
}

/** Secondary row action */
export function rimvioSecondaryCtaClass(className?: string) {
  return cn(
    "inline-flex min-h-11 w-full items-center justify-center gap-2",
    RIMVIO_RADIUS.pill,
    "bg-muted px-5 text-[15px] font-semibold text-foreground",
    "transition active:scale-[0.98] active:bg-muted/80",
    className,
  );
}

/** Bottom / side sheet shell */
export function rimvioSheetShellClass(className?: string) {
  return cn(
    "bg-background",
    "rounded-t-[1.25rem] md:rounded-l-[1.25rem] md:rounded-tr-none",
    RIMVIO_ELEVATION.lg,
    className,
  );
}

/** Frosted chrome (header, tab bar) */
export function rimvioChromeClass(className?: string) {
  return cn(
    "border-border/60 bg-background/80 backdrop-blur-xl backdrop-saturate-150",
    className,
  );
}

/** Modal backdrop */
export function rimvioSheetBackdropClass(className?: string) {
  return cn("fixed inset-0 bg-black/35", className);
}

/** Standard bottom sheet (inbox, bridge invite) */
export function rimvioBottomSheetClass(className?: string) {
  return cn(
    rimvioSheetShellClass(),
    "fixed mx-auto flex w-full max-w-lg flex-col overflow-hidden",
    "inset-x-0 bottom-0 max-h-[min(88dvh,640px)]",
    "border-x-0 border-b-0 border-t border-border bg-card",
    className,
  );
}

/** Pin-open — tall bottom / side sheet */
export function rimvioPinOpenSheetClass(className?: string) {
  return cn(
    rimvioSheetShellClass(),
    "fixed flex w-full flex-col overflow-hidden border border-border bg-background",
    "inset-x-0 bottom-0 h-[min(96dvh,820px)] max-h-[96dvh] rounded-t-[1.25rem]",
    "md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:max-w-[min(92vw,420px)] md:rounded-none md:rounded-l-[1.25rem]",
    className,
  );
}

export function rimvioSheetGrabberClass(className?: string) {
  return cn(
    "mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-foreground/15 md:hidden",
    className,
  );
}

export function rimvioSheetHeaderClass(className?: string) {
  return cn(
    rimvioChromeClass(
      "flex shrink-0 items-center gap-2 border-b px-4 pb-2.5 pt-2",
    ),
    className,
  );
}

export function rimvioSheetCloseBtnClass(className?: string) {
  return cn(
    "flex size-9 shrink-0 items-center justify-center rounded-full active:bg-muted",
    className,
  );
}

export function rimvioSheetFooterClass(className?: string) {
  return cn(
    "shrink-0 space-y-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
    className,
  );
}

/** Empty / placeholder block inside sheets */
export function rimvioEmptyStateClass(className?: string) {
  return cn(
    rimvioSurfaceCardClass("border-0 bg-muted px-4 py-10 text-center"),
    className,
  );
}

/** Inbox list row card */
export function rimvioInboxItemCardClass(className?: string) {
  return cn(rimvioSurfaceCardClass("p-3.5"), className);
}

/** Compact primary in a row (accept, confirm) */
export function rimvioCompactPrimaryCtaClass(className?: string) {
  return cn(
    "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5",
    RIMVIO_RADIUS.md,
    "bg-primary px-3 text-[13px] font-semibold text-primary-foreground",
    "shadow-[0_1px_4px_rgba(0,113,227,0.2)]",
    "transition active:scale-[0.98] disabled:opacity-50",
    className,
  );
}

/** Text-only secondary (decline, dismiss) */
export function rimvioGhostCtaClass(className?: string) {
  return cn(
    "inline-flex min-h-10 items-center justify-center px-3",
    RIMVIO_RADIUS.md,
    "text-[13px] font-medium text-muted-foreground",
    "transition active:bg-muted disabled:opacity-50",
    className,
  );
}

/** Talk / conversation entry row */
export function rimvioTalkRowClass(className?: string) {
  return cn(
    "flex w-full items-center gap-3",
    RIMVIO_RADIUS.lg,
    "bg-muted px-3.5 py-3 text-left",
    "transition active:bg-muted/80",
    className,
  );
}

/** Now page — large hero CTA */
export function rimvioNowHeroCtaClass(isYouTube = false, className?: string) {
  return cn(
    "relative flex w-full items-center justify-center gap-3",
    RIMVIO_RADIUS.pill,
    "px-6 py-7 text-[1.35rem] font-semibold tracking-tight",
    "transition active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    isYouTube
      ? "border border-red-500/15 bg-red-500/[0.08] text-foreground shadow-[0_8px_24px_rgba(220,38,38,0.12)]"
      : "bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(0,113,227,0.28)]",
    className,
  );
}

/** Now page — secondary action chip */
export function rimvioNowSecondaryChipClass(className?: string) {
  return cn(
    "inline-flex items-center gap-1.5",
    RIMVIO_RADIUS.pill,
    "bg-muted px-4 py-2.5 text-sm font-medium text-foreground",
    "transition active:bg-muted/80 disabled:opacity-50",
    className,
  );
}

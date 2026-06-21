import { cn } from "@/lib/utils";
import {
  rimvioEdgeCardClass,
  rimvioNeonCardClass,
  rimvioNeonCardSmClass,
  RIMVIO_NEON,
} from "@/lib/brand/rimvio-neon-theme";

/** Shared grouped-list surfaces — Simple is Best light canvas. */
export const IOS = {
  bg: "bg-rimvio-base",
  card: rimvioNeonCardClass,
  cardSm: rimvioNeonCardSmClass,
  cardCyan: rimvioEdgeCardClass("sm", "cyan"),
  cardMagenta: rimvioEdgeCardClass("sm", "magenta"),
  cardGreen: rimvioEdgeCardClass("sm", "green"),
  sectionLabel:
    "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
  primaryBtn: cn(
    "flex h-11 w-full items-center justify-center rounded-full",
    "bg-primary text-[15px] font-semibold text-primary-foreground",
    "shadow-[0_2px_8px_rgba(0,113,227,0.22)]",
    "transition-transform active:scale-[0.98] hover:bg-primary/90",
  ),
  secondaryBtn: cn(
    "inline-flex min-h-11 items-center justify-center rounded-full",
    "bg-muted px-5 text-[15px] font-semibold text-foreground",
    "transition-transform active:scale-[0.98] hover:bg-muted/80",
  ),
  pillActive: "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(0,113,227,0.22)]",
  pillIdle: "bg-muted text-foreground",
  input: cn(
    "rounded-xl bg-muted px-4 py-3 text-foreground",
    "ring-1 ring-border/60",
    "focus-within:ring-2 focus-within:ring-primary/35",
  ),
} as const;

export const IOS_HEX = {
  bg: RIMVIO_NEON.base,
  card: RIMVIO_NEON.surface,
} as const;

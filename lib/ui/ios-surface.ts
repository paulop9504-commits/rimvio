import { cn } from "@/lib/utils";
import {
  rimvioEdgeCardClass,
  rimvioNeonCardClass,
  rimvioNeonCardSmClass,
  RIMVIO_NEON,
} from "@/lib/brand/rimvio-neon-theme";

/** Shared grouped-list surfaces — black fill + prismatic neon edges. */
export const IOS = {
  bg: "bg-rimvio-base",
  card: rimvioNeonCardClass,
  cardSm: rimvioNeonCardSmClass,
  cardCyan: rimvioEdgeCardClass("sm", "cyan"),
  cardMagenta: rimvioEdgeCardClass("sm", "magenta"),
  cardGreen: rimvioEdgeCardClass("sm", "green"),
  sectionLabel:
    "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80",
  primaryBtn: cn(
    "flex h-[50px] w-full items-center justify-center rounded-[14px]",
    "bg-rimvio-neon-purple text-[17px] font-semibold text-white",
    "shadow-[0_0_0_1px_rgba(191,90,242,0.5),0_8px_32px_-4px_rgba(157,78,221,0.55)]",
    "transition-transform active:scale-[0.98] hover:brightness-110",
  ),
  secondaryBtn: cn(
    "inline-flex items-center justify-center rounded-[14px]",
    "bg-rimvio-surface-muted text-[15px] font-medium text-foreground",
    "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
    "transition-transform active:scale-[0.98]",
  ),
  pillActive:
    "bg-rimvio-neon-purple text-white shadow-[0_0_20px_rgba(191,90,242,0.45),inset_0_0_0_1px_rgba(255,255,255,0.12)]",
  pillIdle:
    "bg-rimvio-surface-muted text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
  input: cn(
    "rounded-2xl bg-rimvio-surface-raised px-4 py-3 text-foreground",
    "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
    "focus-within:shadow-[inset_0_0_0_1px_rgba(50,215,255,0.45),0_0_24px_rgba(50,215,255,0.12)]",
  ),
} as const;

export const IOS_HEX = {
  bg: RIMVIO_NEON.base,
  card: RIMVIO_NEON.surface,
} as const;

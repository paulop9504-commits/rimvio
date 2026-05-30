import { cn } from "@/lib/utils";

/** Shared iOS grouped-list surface tokens (matches feed cards). */
export const IOS = {
  bg: "bg-[#f2f2f7]",
  card: cn(
    "rounded-[28px] bg-white",
    "shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]"
  ),
  cardSm: cn(
    "rounded-2xl bg-white",
    "shadow-[0_1px_12px_-4px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]"
  ),
  sectionLabel:
    "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80",
  primaryBtn: cn(
    "flex h-[50px] w-full items-center justify-center rounded-[14px]",
    "bg-[#007AFF] text-[17px] font-semibold text-white",
    "transition-transform active:scale-[0.98] hover:bg-[#0077ED]"
  ),
  secondaryBtn: cn(
    "inline-flex items-center justify-center rounded-[14px]",
    "bg-[#f2f2f7] text-[15px] font-medium text-foreground",
    "ring-1 ring-black/[0.04] transition-transform active:scale-[0.98]"
  ),
  pillActive: "bg-[#007AFF] text-white",
  pillIdle: "bg-[#f2f2f7] text-foreground ring-1 ring-black/[0.04]",
  input: cn(
    "rounded-2xl bg-white px-4 py-3",
    "ring-1 ring-black/[0.06] shadow-[0_1px_8px_-4px_rgba(0,0,0,0.06)]",
    "focus-within:ring-[#007AFF]/35"
  ),
} as const;

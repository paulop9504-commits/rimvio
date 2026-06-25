"use client";

import { Globe, Lock, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type MarketIntentOwnershipKind = "mine-external" | "mine-internal" | "neighbor";

const STYLES: Record<
  MarketIntentOwnershipKind,
  { className: string; icon: typeof Globe }
> = {
  "mine-external": {
    className:
      "border-[#3182f6]/25 bg-[#3182f6]/10 text-[#1b64da] ring-1 ring-[#3182f6]/15",
    icon: Globe,
  },
  "mine-internal": {
    className:
      "border-[#d1d6db] bg-[#f2f4f6] text-[#6b7684] ring-1 ring-black/[0.04]",
    icon: Lock,
  },
  neighbor: {
    className:
      "border-[#8b95a1]/30 bg-[#f8f9fb] text-[#4e5968] ring-1 ring-black/[0.05]",
    icon: UserRound,
  },
};

export type MarketIntentOwnershipChipProps = {
  kind: MarketIntentOwnershipKind;
  label: string;
  size?: "xs" | "sm";
  className?: string;
};

/** Mine vs neighbor · external vs internal — shared across field + manage. */
export function MarketIntentOwnershipChip({
  kind,
  label,
  size = "sm",
  className,
}: MarketIntentOwnershipChipProps) {
  const style = STYLES[kind];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]",
        style.className,
        className,
      )}
      data-market-ownership={kind}
    >
      <Icon className={cn(size === "xs" ? "size-2.5" : "size-3")} aria-hidden />
      {label}
    </span>
  );
}

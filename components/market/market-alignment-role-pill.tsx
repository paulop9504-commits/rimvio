"use client";

import {
  marketIntentRoleLabelKo,
} from "@/lib/globe/market/market-intent-role";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { cn } from "@/lib/utils";

export type MarketAlignmentRolePillProps = {
  role: MarketIntentRole;
  size?: "xs" | "sm";
  className?: string;
};

const ROLE_CLASS: Record<MarketIntentRole, string> = {
  seeking: "bg-[#e8f3ff] text-[#1b64da] ring-[#3182f6]/18",
  listing: "bg-[#fff4e6] text-[#c27803] ring-[#f59e0b]/18",
};

export function MarketAlignmentRolePill({
  role,
  size = "sm",
  className,
}: MarketAlignmentRolePillProps) {
  const label = marketIntentRoleLabelKo(role);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-bold ring-1",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        ROLE_CLASS[role],
        className,
      )}
      data-market-alignment-role={role}
    >
      {label}
    </span>
  );
}

"use client";

import { memo } from "react";
import type { GlobePinSlotMeta } from "@/lib/feed/experience-globe-ping-types";
import { marketGlobePinRoleLabelKo } from "@/lib/globe/market/market-globe-pin-label";
import { cn } from "@/lib/utils";

export type GlobeMarketSlotPinProps = {
  slot: GlobePinSlotMeta;
  active?: boolean;
  className?: string;
};

/** @중고 alignment pin — muted grey card + role pill. */
export const GlobeMarketSlotPin = memo(function GlobeMarketSlotPin({
  slot,
  active = false,
  className,
}: GlobeMarketSlotPinProps) {
  const role = slot.marketRole ?? "listing";
  const roleLabel = marketGlobePinRoleLabelKo(role);

  return (
    <div
      className={cn(
        "relative transition-all duration-500",
        active ? "scale-110" : "scale-100 hover:scale-105",
        className,
      )}
      data-globe-market-pin
      data-globe-market-role={role}
    >
      <div
        className={cn(
          "relative min-w-[56px] max-w-[80px] rounded-lg border px-1.5 py-1 shadow-[0_6px_16px_rgba(60,70,80,0.14)] backdrop-blur-sm",
          active
            ? "border-[#8b95a1]/40 bg-[#f2f4f6]/95 ring-2 ring-[#8b95a1]/25"
            : "border-[#d1d6db]/80 bg-[#f2f4f6]/90",
        )}
      >
        <p className="line-clamp-2 text-[8px] font-semibold leading-tight text-[#4e5968]">
          {slot.experienceTitle}
        </p>
        <span
          className={cn(
            "mt-1 inline-flex rounded-full px-1.5 py-px text-[7px] font-bold",
            role === "seeking"
              ? "bg-[#fef2f2] text-[#dc2626] ring-1 ring-[#fecaca]/90"
              : "bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]/90",
          )}
        >
          {roleLabel}
        </span>
      </div>
    </div>
  );
});

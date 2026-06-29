"use client";

import type { GlobeMapProductFocusAction } from "@/components/globe/globe-map-product-focus-card";
import { copy } from "@/lib/copy/human-ko";
import { rimvioHeroCtaClass } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type GlobeAccommodationReasonActionCardProps = {
  title: string;
  reasonKo: string;
  matchReasons?: readonly string[];
  priceLine?: string | null;
  primaryAction: GlobeMapProductFocusAction;
  className?: string;
};

/** Floor 3 — why we recommended + booking action. */
export function GlobeAccommodationReasonActionCard({
  title,
  reasonKo,
  matchReasons = [],
  priceLine = null,
  primaryAction,
  className,
}: GlobeAccommodationReasonActionCardProps) {
  const reasons = matchReasons.length > 0 ? matchReasons : [reasonKo];

  return (
    <div className={cn("space-y-2", className)} data-globe-accommodation-reason-action-card>
      <div className="rounded-[1rem] bg-[#f5f5f7] px-3 py-2.5 ring-1 ring-black/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0071e3]">
          {copy.globe.lodgingReasonCardTitle}
        </p>
        <p className="mt-1 text-[14px] font-semibold text-[#1d1d1f]">{title}</p>
        {priceLine ? (
          <p className="mt-0.5 text-[12px] font-medium text-[#86868b]">{priceLine}</p>
        ) : null}
        <ul className="mt-2 space-y-1">
          {reasons.slice(0, 3).map((line) => (
            <li key={line} className="text-[12px] leading-snug text-[#3a3a3c]">
              {line}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        disabled={primaryAction.disabled}
        onClick={primaryAction.onClick}
        className={cn(rimvioHeroCtaClass, "w-full")}
      >
        {primaryAction.label}
      </button>
    </div>
  );
}

"use client";

import { copy } from "@/lib/copy/human-ko";
import {
  MARKET_TRADE_LIST_PILL,
  MARKET_TRADE_SEEK_PILL,
} from "@/lib/design/market-trade-pills";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { cn } from "@/lib/utils";

export type GlobeMarketTradeDockProps = {
  className?: string;
  disabled?: boolean;
  onSelectRole: (role: MarketIntentRole) => void;
};

/** Globe bottom — 구하기 / 내놓기 entry before the market wizard. */
export function GlobeMarketTradeDock({
  className,
  disabled = false,
  onSelectRole,
}: GlobeMarketTradeDockProps) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] bg-white/90 p-2 shadow-[0_6px_24px_rgba(2,32,71,0.08)] ring-1 ring-black/[0.05] backdrop-blur-xl",
        disabled && "opacity-70",
        className,
      )}
      data-globe-market-trade-dock
    >
      <p className={cn(RIMVIO_TYPE.eyebrow, "mb-2 text-center text-muted-foreground")}>
        {copy.globe.marketTradeDockEyebrow}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          className={MARKET_TRADE_LIST_PILL}
          onClick={() => onSelectRole("listing")}
          data-market-trade-role="listing"
          aria-label={copy.globe.marketTradeDockListingAria}
        >
          <span className="block leading-tight">{copy.globe.marketWizardRoleListingTitle}</span>
          <span className="mt-0.5 block text-[11px] font-medium opacity-90">
            {copy.globe.marketWizardRoleListingBody}
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          className={MARKET_TRADE_SEEK_PILL}
          onClick={() => onSelectRole("seeking")}
          data-market-trade-role="seeking"
          aria-label={copy.globe.marketTradeDockSeekingAria}
        >
          <span className="block leading-tight">{copy.globe.marketWizardRoleSeekingTitle}</span>
          <span className="mt-0.5 block text-[11px] font-medium opacity-90">
            {copy.globe.marketWizardRoleSeekingBody}
          </span>
        </button>
      </div>
    </div>
  );
}

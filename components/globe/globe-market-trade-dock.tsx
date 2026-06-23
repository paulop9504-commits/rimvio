"use client";

import { copy } from "@/lib/copy/human-ko";
import {
  MARKET_TRADE_LIST_PILL,
  MARKET_TRADE_SEEK_PILL,
} from "@/lib/design/market-trade-pills";
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
      className={cn("grid grid-cols-2 gap-2.5", className)}
      data-globe-market-trade-dock
    >
      <button
        type="button"
        disabled={disabled}
        className={MARKET_TRADE_LIST_PILL}
        onClick={() => onSelectRole("listing")}
        data-market-trade-role="listing"
        aria-label={copy.globe.marketTradeDockListingAria}
      >
        {copy.globe.marketWizardRoleListingTitle}
      </button>
      <button
        type="button"
        disabled={disabled}
        className={MARKET_TRADE_SEEK_PILL}
        onClick={() => onSelectRole("seeking")}
        data-market-trade-role="seeking"
        aria-label={copy.globe.marketTradeDockSeekingAria}
      >
        {copy.globe.marketWizardRoleSeekingTitle}
      </button>
    </div>
  );
}

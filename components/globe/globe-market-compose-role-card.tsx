"use client";

import { copy } from "@/lib/copy/human-ko";
import {
  MARKET_TRADE_LIST_PILL,
  MARKET_TRADE_SEEK_PILL,
} from "@/lib/design/market-trade-pills";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { cn } from "@/lib/utils";

export type GlobeMarketComposeRoleCardProps = {
  className?: string;
  disabled?: boolean;
  onSelectRole: (role: MarketIntentRole) => void;
};

/** Shown when composer detects @중고 — pick 내놓기 or 구하기. */
export function GlobeMarketComposeRoleCard({
  className,
  disabled = false,
  onSelectRole,
}: GlobeMarketComposeRoleCardProps) {
  return (
    <div
      className={cn(
        "border-b border-black/[0.05] bg-primary/[0.03] px-3 py-3",
        disabled && "opacity-70",
        className,
      )}
      data-globe-market-compose-role-card
    >
      <p className={cn(RIMVIO_TYPE.body, "font-semibold text-foreground")}>
        {copy.globe.marketComposeRoleTitle}
      </p>
      <p className={cn("mt-1", RIMVIO_TYPE.caption)}>{copy.globe.marketComposeRoleBody}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
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

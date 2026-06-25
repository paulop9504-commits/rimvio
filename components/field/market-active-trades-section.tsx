"use client";

import { MarketTradeProgressCard } from "@/components/market/market-trade-progress-card";
import { useCopy } from "@/hooks/use-copy";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import { cn } from "@/lib/utils";

export type MarketActiveTradesSectionProps = {
  sessions: readonly MarketTradeSessionView[];
  onSessionUpdated?: (session: MarketTradeSessionView) => void;
  className?: string;
};

export function MarketActiveTradesSection({
  sessions,
  onSessionUpdated,
  className,
}: MarketActiveTradesSectionProps) {
  const copy = useCopy();

  if (sessions.length === 0) {
    return null;
  }

  return (
    <section className={cn("bg-white px-4 pb-3 pt-2", className)} data-market-active-trades>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-[#191f28]">
          {copy.globe.marketTradeSectionTitle}
        </h2>
        <span className="text-[13px] font-medium text-[#8b95a1]">
          {copy.globe.marketTradeSectionViewAll}
        </span>
      </div>
      <div className="space-y-3">
        {sessions.map((session) => (
          <MarketTradeProgressCard
            key={session.handshakeId}
            session={session}
            onUpdated={onSessionUpdated}
          />
        ))}
      </div>
    </section>
  );
}

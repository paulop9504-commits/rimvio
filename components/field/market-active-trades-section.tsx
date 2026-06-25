"use client";

import { Clock3 } from "lucide-react";
import { MarketTradeProgressCard } from "@/components/market/market-trade-progress-card";
import { useCopy } from "@/hooks/use-copy";
import { RIMVIO_TYPE, rimvioEmptyStateClass } from "@/lib/design/rimvio-ontology";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import { cn } from "@/lib/utils";

export type MarketActiveTradesSectionProps = {
  sessions: readonly MarketTradeSessionView[];
  onSessionUpdated?: (session: MarketTradeSessionView) => void;
  /** Tab panel — no section chrome; shows empty state when none. */
  embedded?: boolean;
  className?: string;
};

export function MarketActiveTradesSection({
  sessions,
  onSessionUpdated,
  embedded = false,
  className,
}: MarketActiveTradesSectionProps) {
  const copy = useCopy();

  if (sessions.length === 0) {
    if (!embedded) {
      return null;
    }
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-16 text-center",
          className,
        )}
        data-market-active-trades-empty
      >
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
          <Clock3 className="size-7 text-[#b0b8c1]" aria-hidden />
        </div>
        <p className={RIMVIO_TYPE.headline}>{copy.globe.field.tradesEmptyTitle}</p>
        <p className={cn("mt-2 max-w-[240px]", RIMVIO_TYPE.caption)}>
          {copy.globe.field.tradesEmptyBody}
        </p>
      </div>
    );
  }

  if (embedded) {
    return (
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          className,
        )}
        data-market-active-trades
      >
        <div className="space-y-3">
          {sessions.map((session) => (
            <MarketTradeProgressCard
              key={session.handshakeId}
              session={session}
              onUpdated={onSessionUpdated}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "border-b-4 border-[#eef1f4] bg-[#fafbfc] px-4 pb-3 pt-2",
        className,
      )}
      data-market-active-trades
    >
      <div className="mb-2.5">
        <h2 className="text-[16px] font-bold text-[#191f28]">
          {copy.globe.marketTradeSectionTitle}
        </h2>
        <p className="mt-0.5 text-[12px] text-[#8b95a1]">
          {copy.globe.marketTradeSectionHint}
        </p>
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

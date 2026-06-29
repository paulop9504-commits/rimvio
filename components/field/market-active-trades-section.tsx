"use client";

import { useEffect, useRef } from "react";
import { Clock3 } from "lucide-react";
import {
  FIELD_DASHBOARD_CANVAS,
  FIELD_DASHBOARD_INSET,
} from "@/components/field/field-dashboard-layout";
import { MarketTradeProgressCard } from "@/components/market/market-trade-progress-card";
import { useCopy } from "@/hooks/use-copy";
import { RIMVIO_TYPE, rimvioEmptyStateClass } from "@/lib/design/rimvio-ontology";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import { cn } from "@/lib/utils";

export type MarketActiveTradesSectionProps = {
  sessions: readonly MarketTradeSessionView[];
  onSessionUpdated?: (session: MarketTradeSessionView) => void;
  /** Scroll + ring highlight — `handshakeId` SSOT. */
  highlightTradeId?: string | null;
  /** Bumps when ingress re-opens — re-triggers scroll highlight. */
  highlightScrollKey?: number;
  /** Tab panel — no section chrome; shows empty state when none. */
  embedded?: boolean;
  className?: string;
};

export function MarketActiveTradesSection({
  sessions,
  onSessionUpdated,
  highlightTradeId = null,
  highlightScrollKey = 0,
  embedded = false,
  className,
}: MarketActiveTradesSectionProps) {
  const copy = useCopy();
  const scrolledTradeRef = useRef<string | null>(null);

  useEffect(() => {
    scrolledTradeRef.current = null;
  }, [highlightScrollKey]);

  useEffect(() => {
    const id = highlightTradeId?.trim();
    if (!id || sessions.length === 0 || scrolledTradeRef.current === id) {
      return;
    }
    const node = document.querySelector(`[data-market-trade-id="${id}"]`);
    if (!node) {
      return;
    }
    scrolledTradeRef.current = id;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightTradeId, sessions]);

  if (sessions.length === 0) {
    if (!embedded) {
      return null;
    }
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-12 text-center",
          FIELD_DASHBOARD_CANVAS,
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
          "min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] pt-2",
          FIELD_DASHBOARD_CANVAS,
          className,
        )}
        data-market-active-trades
      >
        <div className={cn("space-y-2.5", FIELD_DASHBOARD_INSET)}>
          {sessions.map((session) => {
            const highlighted =
              Boolean(highlightTradeId?.trim()) &&
              session.handshakeId === highlightTradeId?.trim();
            return (
              <div
                key={session.handshakeId}
                data-market-trade-id={session.handshakeId}
                className={cn(
                  highlighted &&
                    "rounded-2xl ring-2 ring-[#3182f6]/40 ring-offset-2 ring-offset-[#fafbfc]",
                )}
              >
                <MarketTradeProgressCard
                  session={session}
                  onUpdated={onSessionUpdated}
                />
              </div>
            );
          })}
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

"use client";

import { Handshake, X } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { openFieldDashboardIngress } from "@/lib/nav/field-dashboard-ingress";
import { useMarketAlignmentMain } from "@/hooks/use-market-alignment-main";
import { rimvioHeroCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type MarketAlignmentSummaryProps = {
  enabled: boolean;
  focusEventId?: string | null;
  className?: string;
};

/**
 * Globe / Feed — trade match teaser only. Full handshake pipeline lives in Field trades tab.
 */
export function MarketAlignmentSummary({
  enabled,
  focusEventId,
  className,
}: MarketAlignmentSummaryProps) {
  const { offer, dismiss } = useMarketAlignmentMain({ enabled, focusEventId });
  const field = copy.globe.field;

  if (!offer) {
    return null;
  }

  const openInField = () => {
    openFieldDashboardIngress({
      tab: "trades",
      highlightTradeId: offer.handshakeId ?? null,
    });
  };

  return (
    <div
      className={cn(
        "rounded-2xl bg-white/95 px-3.5 py-3 shadow-lg ring-1 ring-black/[0.06] backdrop-blur-md",
        className,
      )}
      data-market-align-summary
      data-market-align-event={offer.matchEventId}
    >
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn(RIMVIO_TYPE.body, "font-semibold text-foreground")}>
            {offer.headline}
          </p>
          <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>{offer.body}</p>
          {offer.priorityHintKo ? (
            <p className={cn("mt-1", RIMVIO_TYPE.caption, "text-primary/90")}>
              {offer.priorityHintKo}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/[0.04]"
          aria-label={field.closeAria}
          onClick={dismiss}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        className={cn(rimvioHeroCtaClass(), "w-full")}
        onClick={openInField}
      >
        <Handshake className="size-4" aria-hidden />
        {field.ingressTradesCta}
      </button>
    </div>
  );
}

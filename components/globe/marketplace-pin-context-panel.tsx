"use client";

import { Handshake, MapPin, Tag } from "lucide-react";
import {
  projectMarketplaceBridgeFromIntent,
  projectMarketplaceDiscoveryCard,
  projectMarketplaceDiscoveryCardFromCluster,
} from "@/lib/bridge/marketplace-bridge-schema";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { copy } from "@/lib/copy/human-ko";
import { rimvioHeroCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type MarketplacePinContextPanelProps = {
  cluster: PinCluster;
  intent: MarketIntentRecord | null;
  onTrade?: () => void;
  className?: string;
};

/** Trade card — product · price · region (not travel replay). */
export function MarketplacePinContextPanel({
  cluster,
  intent,
  onTrade,
  className,
}: MarketplacePinContextPanelProps) {
  const card = intent
    ? projectMarketplaceDiscoveryCard(projectMarketplaceBridgeFromIntent(intent))
    : projectMarketplaceDiscoveryCardFromCluster({
        title: cluster.title,
        placeLabel: cluster.placeLabel,
        marketRole: cluster.marketRole ?? "listing",
        recallLine: cluster.recallLine,
      });

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.25rem] border border-border/80 bg-card shadow-sm",
        className,
      )}
      data-marketplace-pin-context
    >
      <div className="border-b border-border/60 px-4 py-4">
        <p className={cn(RIMVIO_TYPE.caption, "text-primary")}>{card.roleLabel}</p>
        <p className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-foreground">
          {card.productName}
        </p>
        <p className="mt-2 text-[20px] font-semibold text-foreground">{card.priceLine}</p>
      </div>

      <div className="space-y-2 px-4 py-3">
        <p className="flex items-center gap-2 text-[14px] text-foreground">
          <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
          {card.regionLine}
        </p>
        {card.conditionLine ? (
          <p className="flex items-center gap-2 text-[14px] text-foreground">
            <Tag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {card.conditionLine}
          </p>
        ) : null}
        {card.factLines.map((line) => (
          <p key={line} className="text-[13px] text-muted-foreground">
            {line}
          </p>
        ))}
      </div>

      {onTrade ? (
        <div className="border-t border-border/60 px-4 py-3">
          <button type="button" className={rimvioHeroCtaClass()} onClick={onTrade}>
            <Handshake className="size-5" aria-hidden />
            {copy.globe.marketAlignCtaBridge}
          </button>
        </div>
      ) : cluster.readOnly ? (
        <p className="border-t border-border/60 px-4 py-3 text-[12px] text-muted-foreground">
          {copy.globe.marketplaceDiscoveryReadOnlyHint}
        </p>
      ) : null}
    </section>
  );
}

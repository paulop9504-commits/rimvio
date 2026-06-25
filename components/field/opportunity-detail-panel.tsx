"use client";

import { useState } from "react";
import { Check, MapPin, Package } from "lucide-react";
import { OpportunityFieldActionBar } from "@/components/field/opportunity-field-action-bar";
import {
  MarketListingMediaHero,
  MarketListingMediaThumb,
} from "@/components/market/market-listing-media-thumb";
import { MarketIntentOwnershipChip } from "@/components/market/market-intent-ownership-chip";
import {
  projectMarketplaceBridgeFromIntent,
  projectMarketplaceDiscoveryCard,
} from "@/lib/bridge/marketplace-bridge-schema";
import { buildMarketListingMediaItems } from "@/lib/globe/market/market-listing-media";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type OpportunityDetailPanelProps = {
  row: OpportunityRow;
  whyTitle: string;
  focusEventId: string;
  seeking: MarketIntentRecord;
  neighborBadge: string;
  hasActiveTrade?: boolean;
  onBeforeNavigate?: () => void;
  onChatOpened?: () => void;
  onScheduleStarted?: () => void;
  navigate: (href: string) => void;
  className?: string;
};

export function OpportunityDetailPanel({
  row,
  whyTitle,
  focusEventId,
  seeking,
  neighborBadge,
  hasActiveTrade = false,
  onBeforeNavigate,
  onChatOpened,
  onScheduleStarted,
  navigate,
  className,
}: OpportunityDetailPanelProps) {
  const card = projectMarketplaceDiscoveryCard(
    projectMarketplaceBridgeFromIntent(row.listing),
  );
  const media = buildMarketListingMediaItems(row.listing.detail);
  const [activeMedia, setActiveMedia] = useState(0);
  const hero = media[activeMedia] ?? media[0] ?? null;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-white", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <div className="relative aspect-[4/3] w-full bg-[#f2f4f6]">
          {hero ? (
            <MarketListingMediaHero
              item={hero}
              playbackKey={`${activeMedia}-${hero.url}`}
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-[#b0b8c1]">
              <Package className="size-10" aria-hidden />
              <span className={RIMVIO_TYPE.caption}>사진·동영상 없음</span>
            </div>
          )}
        </div>

        {media.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto border-b border-[#f2f4f6] px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {media.map((item, index) => (
              <MarketListingMediaThumb
                key={`${item.kind}-${item.url}-${index}`}
                item={item}
                active={index === activeMedia}
                onPress={() => setActiveMedia(index)}
              />
            ))}
          </div>
        ) : null}

        <div className="px-4 pb-6 pt-5">
          <h1 className="text-[22px] font-bold leading-snug tracking-tight text-[#191f28]">
            {card.productName}
          </h1>
          <p className="mt-2 text-[24px] font-bold tabular-nums text-[#191f28]">{card.priceLine}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <MarketIntentOwnershipChip kind="neighbor" label={neighborBadge} />
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[15px] text-[#4e5968]">
            <MapPin className="size-4 shrink-0 text-[#3182f6]" aria-hidden />
            {card.regionLine}
          </p>

          {card.conditionLine ? (
            <p className="mt-2 text-[15px] text-[#6b7684]">상태 · {card.conditionLine}</p>
          ) : null}

          {row.listing.detail.detailNote.trim() ? (
            <p className="mt-5 text-[16px] leading-relaxed text-[#191f28]">
              {row.listing.detail.detailNote.trim()}
            </p>
          ) : null}

          <div className="mt-6 rounded-2xl bg-[#f8f9fb] px-4 py-4">
            <p className="text-[13px] font-semibold text-[#8b95a1]">{whyTitle}</p>
            <ul className="mt-3 space-y-2.5">
              {row.matchReasons.map((reason) => (
                <li key={reason} className="flex items-center gap-2 text-[15px] text-[#191f28]">
                  <Check className="size-4 shrink-0 text-[#3182f6]" aria-hidden />
                  {reason}
                </li>
              ))}
              <li className="flex items-center gap-2 text-[15px] font-semibold text-[#3182f6]">
                <span className="tabular-nums">{row.scorePct}%</span>
                <span className="font-normal text-[#4e5968]">맞춤</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <OpportunityFieldActionBar
        focusEventId={focusEventId}
        seeking={seeking}
        matchIntentId={row.listing.id}
        peerDisplayName={card.productName}
        hasActiveTrade={hasActiveTrade}
        navigate={navigate}
        onBeforeNavigate={onBeforeNavigate}
        onChatOpened={onChatOpened}
        onScheduleStarted={onScheduleStarted}
      />
    </div>
  );
}

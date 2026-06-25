"use client";

import { useState } from "react";
import { Check, MapPin, Package } from "lucide-react";
import { OpportunityFieldChatBar } from "@/components/field/opportunity-field-chat-bar";
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
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type OpportunityDetailPanelProps = {
  row: OpportunityRow;
  whyTitle: string;
  focusEventId: string;
  quickReplies: string[];
  chatPlaceholder: string;
  bridgeFail: string;
  neighborBadge: string;
  onBeforeNavigate?: () => void;
  navigate: (href: string) => void;
  stayOnDashboard?: boolean;
  tradeStartedToast?: string;
  onTradeStarted?: () => void;
  className?: string;
};

export function OpportunityDetailPanel({
  row,
  whyTitle,
  focusEventId,
  quickReplies,
  chatPlaceholder,
  bridgeFail,
  neighborBadge,
  onBeforeNavigate,
  navigate,
  stayOnDashboard = false,
  tradeStartedToast,
  onTradeStarted,
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
      <div className="relative aspect-[16/10] w-full shrink-0 bg-[#f2f4f6]">
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-4 pt-10">
          <p className="text-[22px] font-bold leading-tight text-white">{card.productName}</p>
          <p className="mt-1 text-[18px] font-semibold text-white/95">{card.priceLine}</p>
        </div>
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <MarketIntentOwnershipChip
          kind="neighbor"
          label={neighborBadge}
          className="mb-3"
        />
        <p className="flex items-center gap-1.5 text-[14px] text-[#4e5968]">
          <MapPin className="size-4 shrink-0 text-[#3182f6]" aria-hidden />
          {card.regionLine}
        </p>
        {card.conditionLine ? (
          <p className="mt-2 text-[14px] text-[#4e5968]">상태 · {card.conditionLine}</p>
        ) : null}
        {row.listing.detail.detailNote.trim() ? (
          <p className="mt-3 text-[15px] leading-relaxed text-[#191f28]">
            {row.listing.detail.detailNote.trim()}
          </p>
        ) : null}

        <div className="mt-5 rounded-2xl bg-[#f8f9fb] px-4 py-3.5 ring-1 ring-black/[0.04]">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8b95a1]">
            {whyTitle}
          </p>
          <ul className="mt-2.5 space-y-2">
            {row.matchReasons.map((reason) => (
              <li key={reason} className="flex items-center gap-2 text-[14px] text-[#191f28]">
                <Check className="size-4 shrink-0 text-[#3182f6]" aria-hidden />
                {reason}
              </li>
            ))}
            <li className="flex items-center gap-2 text-[14px] font-semibold text-[#3182f6]">
              <span className="tabular-nums">{row.scorePct}%</span>
              <span className="font-normal text-[#4e5968]">맞춤</span>
            </li>
          </ul>
        </div>
      </div>

      <OpportunityFieldChatBar
        focusEventId={focusEventId}
        matchIntentId={row.listing.id}
        quickReplies={quickReplies}
        placeholder={chatPlaceholder}
        bridgeFail={bridgeFail}
        onBeforeNavigate={onBeforeNavigate}
        navigate={navigate}
        stayOnDashboard={stayOnDashboard}
        tradeStartedToast={tradeStartedToast}
        onTradeStarted={onTradeStarted}
      />
    </div>
  );
}

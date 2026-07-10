"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { GlobeContextQuickPinButton } from "@/components/globe/globe-context-quick-pin-button";
import { copy } from "@/lib/copy/human-ko";
import {
  dispatchIntelligentDiscoveryActiveCard,
} from "@/lib/globe/intelligent-pin/intelligent-pin-bridge";
import type { InfiniteDiscoveryFeedCard } from "@/lib/globe/intelligent-pin/types";
import { cn } from "@/lib/utils";

export type GlobeInfiniteDiscoveryFeedPanelProps = {
  contextEventId: string;
  areaLabel: string;
  cards: readonly InfiniteDiscoveryFeedCard[];
  pinnedPlaceIds: ReadonlySet<string>;
  activeResourceId?: string | null;
  onDismiss: () => void;
  onFixPin: (card: InfiniteDiscoveryFeedCard) => void;
  onCheckout: (card: InfiniteDiscoveryFeedCard) => void;
  pinBusyPlaceId?: string | null;
  className?: string;
};

function FeedImageSlider({ urls }: { urls: readonly string[] }) {
  if (urls.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#f5f5f7] text-[12px] text-[#86868b]">
        {copy.globe.intelligentPinSwipePhotos}
      </div>
    );
  }
  return (
    <div
      className="flex aspect-[4/5] w-full snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-globe-infinite-feed-slider
    >
      {urls.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${url}:${index}`}
          src={url}
          alt=""
          className="h-full min-w-full snap-start object-cover"
          loading={index === 0 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}

export function GlobeInfiniteDiscoveryFeedPanel({
  contextEventId,
  areaLabel,
  cards,
  pinnedPlaceIds,
  activeResourceId = null,
  onDismiss,
  onFixPin,
  onCheckout,
  pinBusyPlaceId = null,
  className,
}: GlobeInfiniteDiscoveryFeedPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const notifyActive = useCallback(
    (card: InfiniteDiscoveryFeedCard) => {
      dispatchIntelligentDiscoveryActiveCard({
        contextEventId,
        resourceId: card.resourceId,
        placeId: card.placeId,
        kind: card.kind,
        lat: card.lat,
        lng: card.lng,
      });
    },
    [contextEventId],
  );

  useEffect(() => {
    if (cards.length === 0) {
      return;
    }
    const root = scrollRef.current;
    if (!root) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target) {
          return;
        }
        const resourceId = top.target.getAttribute("data-resource-id");
        const card = cards.find((row) => row.resourceId === resourceId);
        if (card) {
          notifyActive(card);
        }
      },
      { root, threshold: [0.45, 0.6, 0.75] },
    );
    for (const node of cardRefs.current.values()) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, [cards, notifyActive]);

  useEffect(() => {
    if (cards.length > 0) {
      notifyActive(cards[0]!);
    }
  }, [cards, notifyActive]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 right-0 z-[44] flex w-[min(100%,24rem)] flex-col",
        className,
      )}
      data-globe-infinite-discovery-feed
    >
      <div className="pointer-events-auto flex min-h-0 flex-1 flex-col border-l border-black/[0.06] bg-white/96 shadow-[-12px_0_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] px-3.5 py-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-[#1d1d1f]">{areaLabel}</p>
            <p className="truncate text-[11px] text-[#86868b]">
              {copy.globe.intelligentPinFeedSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#515154] ring-1 ring-black/[0.05] active:scale-95"
            aria-label={copy.globe.intelligentPinFeedCloseAria}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-globe-infinite-feed-scroll
        >
          <div className="space-y-0 pb-6">
            {cards.map((card) => {
              const pinned = pinnedPlaceIds.has(card.placeId);
              const active = card.resourceId === activeResourceId;
              const pinBusy = pinBusyPlaceId === card.placeId;
              return (
                <article
                  key={card.resourceId}
                  ref={(node) => {
                    if (node) {
                      cardRefs.current.set(card.resourceId, node);
                    } else {
                      cardRefs.current.delete(card.resourceId);
                    }
                  }}
                  data-resource-id={card.resourceId}
                  data-globe-infinite-feed-card={card.kind}
                  className={cn(
                    "border-b border-black/[0.05] bg-white",
                    active && "ring-1 ring-inset ring-[#0071e3]/35",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] font-semibold text-[#515154] ring-1 ring-black/[0.04]">
                        {card.media.categoryLabelKo}
                      </span>
                      <p className="truncate text-[13px] font-semibold text-[#1d1d1f]">
                        {card.media.title}
                      </p>
                    </div>
                    {card.media.scoreLabel ? (
                      <span className="shrink-0 text-[11px] font-medium text-[#86868b]">
                        {card.media.scoreLabel}
                      </span>
                    ) : null}
                  </div>

                  <FeedImageSlider urls={card.media.imageUrls} />

                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <GlobeContextQuickPinButton
                      label={
                        pinned
                          ? copy.globe.intelligentPinFixPinDone
                          : copy.globe.intelligentPinFixPinCta
                      }
                      pinned={pinned}
                      busy={pinBusy}
                      onClick={() => {
                        onFixPin(card);
                        if (!pinned) {
                          toast.message(
                            copy.globe.intelligentPinFixPinToast(card.media.title),
                          );
                        }
                      }}
                    />
                    {card.transaction.canCheckout && card.transaction.payLabelKo ? (
                      <button
                        type="button"
                        onClick={() => onCheckout(card)}
                        className="shrink-0 rounded-full bg-[#0071e3] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm active:scale-[0.98]"
                        data-globe-infinite-feed-checkout={card.placeId}
                      >
                        {card.transaction.payLabelKo}
                      </button>
                    ) : card.transaction.payLabelKo ? (
                      <span className="text-[10px] text-[#86868b]">{card.media.secondaryLine}</span>
                    ) : null}
                  </div>

                  <div className="space-y-1 px-3 pb-4">
                    {card.media.secondaryLine ? (
                      <p className="text-[11px] font-medium text-[#0071e3]">
                        {card.media.secondaryLine}
                      </p>
                    ) : null}
                    <p className="text-[12px] leading-relaxed text-[#515154]">
                      <span className="font-semibold text-[#1d1d1f]">
                        {copy.globe.intelligentPinAiInsightPrefix}
                      </span>{" "}
                      {card.media.detailReasonLine}
                    </p>

                    {card.profile ? (
                      <div
                        className="mt-2.5 space-y-2 rounded-xl bg-[#f5f5f7] px-2.5 py-2 ring-1 ring-black/[0.04]"
                        data-globe-feed-entity-profile={card.profile.entityKind}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                            {copy.globe.feedEntityProfileLabel}
                          </p>
                          <span className="text-[10px] font-medium text-[#0071e3]">
                            {copy.globe.feedEntityCompleteness(
                              card.profile.dataCompletenessPercent,
                            )}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {card.profile.prioritySlots.slice(0, 4).map((slot) => (
                            <span
                              key={slot.slotId}
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                                slot.filled
                                  ? "bg-white text-[#1d1d1f] ring-black/[0.06]"
                                  : "bg-white/60 text-[#86868b] ring-black/[0.04]",
                              )}
                            >
                              {slot.labelKo}
                              {slot.valueKo ? ` · ${slot.valueKo}` : ""}
                            </span>
                          ))}
                        </div>
                        {card.profile.reviewFocus.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-[#86868b]">
                              {copy.globe.feedEntityReviewFocusLabel}
                            </span>
                            {card.profile.reviewFocus.slice(0, 4).map((row) => (
                              <span
                                key={row.categoryId}
                                className="rounded-full bg-[#0071e3]/8 px-1.5 py-0.5 text-[9px] font-medium text-[#0071e3]"
                              >
                                {row.labelKo}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {card.profile.practicalTipsKo[0] ? (
                          <p className="text-[10px] leading-relaxed text-[#636366]">
                            {copy.globe.feedEntityPracticalTipsLabel}:{" "}
                            {card.profile.practicalTipsKo[0]}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

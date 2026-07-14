"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { GlobeContextQuickPinButton } from "@/components/globe/globe-context-quick-pin-button";
import { GlobeEateryRankModeChips } from "@/components/globe/globe-eatery-rank-mode-chips";
import { GlobeLodgingRankModeChips } from "@/components/globe/globe-lodging-rank-mode-chips";
import { GlobeScoutFeedGateVideoStrip } from "@/components/globe/globe-scout-feed-gate-video-strip";
import { copy } from "@/lib/copy/human-ko";
import {
  getInitialGlobeDiscoveryRevealCount,
  getNextGlobeDiscoveryRevealCount,
  hasMoreGlobeDiscoveryItems,
  resolveGlobeDiscoveryFeedStatus,
} from "@/lib/globe/discovery/globe-discovery-feed";
import { getInfiniteDiscoveryFeedStatusCopy } from "@/lib/globe/intelligent-pin/get-infinite-feed-status-copy";
import {
  dispatchIntelligentDiscoveryActiveCard,
} from "@/lib/globe/intelligent-pin/intelligent-pin-bridge";
import {
  inferDiscoveryFeedScrollIntent,
  recordDiscoveryFeedScrollSignal,
} from "@/lib/globe/intelligent-pin/record-discovery-feed-scroll-signal";
import { maybeOfferRejectRescout } from "@/lib/globe/operator-turn/offer-scout-fail-recovery-client";
import type { InfiniteDiscoveryFeedCard } from "@/lib/globe/intelligent-pin/types";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import type { EateryRankMode } from "@/lib/globe/eatery/eatery-rank-profile";
import {
  resolveEateryRankMode,
  subscribeEateryRankModeOverride,
  writeEateryRankModeOverride,
} from "@/lib/globe/eatery/eatery-rank-mode-session-store";
import type { LodgingRankMode } from "@/lib/globe/lodging/lodging-rank-profile";
import {
  resolveLodgingRankMode,
  subscribeLodgingRankModeOverride,
  writeLodgingRankModeOverride,
} from "@/lib/globe/lodging/lodging-rank-mode-session-store";
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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreTimerRef = useRef<number | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [rankModeRevision, setRankModeRevision] = useState(0);

  const hasLodgingCards = useMemo(
    () => cards.some((card) => card.kind === "lodging"),
    [cards],
  );
  const hasEateryCards = useMemo(
    () => cards.some((card) => card.kind === "eatery"),
    [cards],
  );

  const lodgingRankMode = useMemo((): LodgingRankMode => {
    void rankModeRevision;
    return resolveLodgingRankMode(contextEventId);
  }, [contextEventId, rankModeRevision]);

  const eateryRankMode = useMemo((): EateryRankMode => {
    void rankModeRevision;
    return resolveEateryRankMode(contextEventId);
  }, [contextEventId, rankModeRevision]);

  useEffect(() => {
    const unsubLodging = subscribeLodgingRankModeOverride((eventId) => {
      if (eventId === contextEventId.trim()) {
        setRankModeRevision((value) => value + 1);
      }
    });
    const unsubEatery = subscribeEateryRankModeOverride((eventId) => {
      if (eventId === contextEventId.trim()) {
        setRankModeRevision((value) => value + 1);
      }
    });
    return () => {
      unsubLodging();
      unsubEatery();
    };
  }, [contextEventId]);

  const handleLodgingRankMode = useCallback(
    (mode: LodgingRankMode) => {
      writeLodgingRankModeOverride(contextEventId, mode);
    },
    [contextEventId],
  );

  const handleEateryRankMode = useCallback(
    (mode: EateryRankMode) => {
      writeEateryRankModeOverride(contextEventId, mode);
    },
    [contextEventId],
  );
  const cardSeenAtRef = useRef<Map<string, number>>(new Map());
  const [visibleCount, setVisibleCount] = useState(() =>
    getInitialGlobeDiscoveryRevealCount(cards.length),
  );
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setVisibleCount(getInitialGlobeDiscoveryRevealCount(cards.length));
  }, [cards]);

  useEffect(() => {
    return () => {
      if (loadMoreTimerRef.current != null) {
        window.clearTimeout(loadMoreTimerRef.current);
      }
    };
  }, []);

  const visibleCards = useMemo(
    () => cards.slice(0, visibleCount),
    [cards, visibleCount],
  );
  const hasMore = hasMoreGlobeDiscoveryItems(visibleCount, cards.length);
  const feedStatus = resolveGlobeDiscoveryFeedStatus({
    visibleCount,
    totalCount: cards.length,
    loadingMore,
  });

  const requestMore = useCallback(() => {
    if (!hasMore || loadingMore) {
      return;
    }
    setLoadingMore(true);
    loadMoreTimerRef.current = window.setTimeout(() => {
      setVisibleCount((current) => getNextGlobeDiscoveryRevealCount(current, cards.length));
      setLoadingMore(false);
      loadMoreTimerRef.current = null;
    }, 140);
  }, [cards.length, hasMore, loadingMore]);

  const recordCardScrollSignal = useCallback(
    (card: InfiniteDiscoveryFeedCard, dwellMs: number) => {
      const intent = inferDiscoveryFeedScrollIntent({
        dwellMs,
        pinned: pinnedPlaceIds.has(card.placeId),
      });
      recordDiscoveryFeedScrollSignal({
        contextEventId,
        resourceId: card.resourceId,
        placeId: card.placeId,
        kind: card.kind,
        intent,
        dwellMs,
        atIso: new Date().toISOString(),
      });
      if (intent === "reject_candidates") {
        const engineId: RimvioEngineId =
          card.kind === "eatery"
            ? "eatery_search"
            : card.kind === "activity"
              ? "activity_search"
              : card.kind === "amenity"
                ? "local_amenity_search"
                : "lodging_search";
        maybeOfferRejectRescout({
          contextEventId,
          engineId,
        });
      }
    },
    [contextEventId, pinnedPlaceIds],
  );

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
    if (visibleCards.length === 0) {
      return;
    }
    const root = scrollRef.current;
    if (!root) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const resourceId = entry.target.getAttribute("data-resource-id");
          if (!resourceId) {
            continue;
          }
          const card = cards.find((row) => row.resourceId === resourceId);
          if (!card) {
            continue;
          }
          if (entry.isIntersecting) {
            cardSeenAtRef.current.set(resourceId, Date.now());
            continue;
          }
          const seenAt = cardSeenAtRef.current.get(resourceId);
          if (seenAt != null) {
            recordCardScrollSignal(card, Date.now() - seenAt);
            cardSeenAtRef.current.delete(resourceId);
          }
        }

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target) {
          return;
        }
        const activeId = top.target.getAttribute("data-resource-id");
        const activeCard = cards.find((row) => row.resourceId === activeId);
        if (activeCard) {
          notifyActive(activeCard);
        }
      },
      { root, threshold: [0.45, 0.6, 0.75] },
    );
    for (const node of cardRefs.current.values()) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, [cards, notifyActive, recordCardScrollSignal, visibleCards.length]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          requestMore();
        }
      },
      {
        root,
        rootMargin: "0px 0px 240px 0px",
        threshold: 0.08,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, requestMore, visibleCards.length]);

  useEffect(() => {
    const first = visibleCards[0];
    if (first) {
      notifyActive(first);
    }
  }, [notifyActive, visibleCards[0]?.resourceId]);

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

        {hasLodgingCards ? (
          <div className="shrink-0 border-b border-black/[0.06] px-3.5 py-2">
            <GlobeLodgingRankModeChips
              mode={lodgingRankMode}
              onSelect={handleLodgingRankMode}
            />
          </div>
        ) : null}

        {hasEateryCards && !hasLodgingCards ? (
          <div className="shrink-0 border-b border-black/[0.06] px-3.5 py-2">
            <GlobeEateryRankModeChips
              mode={eateryRankMode}
              onSelect={handleEateryRankMode}
            />
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-globe-infinite-feed-scroll
        >
          <div className="space-y-0 pb-6">
            {visibleCards.map((card) => {
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

                    {card.media.videoContext ? (
                      <div className="pt-1" data-globe-infinite-feed-video>
                        <GlobeScoutFeedGateVideoStrip
                          videoContext={card.media.videoContext}
                        />
                      </div>
                    ) : null}

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
                          {card.profile.prioritySlots
                            .filter((slot) => slot.filled)
                            .slice(0, 4)
                            .map((slot) => (
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
                        {card.profile.practicalTipsKo.length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                              {copy.globe.feedEntityPracticalTipsLabel}
                            </p>
                            <ul className="space-y-0.5">
                              {card.profile.practicalTipsKo
                                .slice(0, card.kind === "activity" ? 4 : 1)
                                .map((tip) => (
                                  <li
                                    key={tip}
                                    className="text-[10px] leading-relaxed text-[#636366] before:mr-1 before:text-[#0071e3] before:content-['·']"
                                  >
                                    {tip}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
            <div
              ref={sentinelRef}
              className="flex min-h-12 items-center justify-center px-3 py-4 text-center text-[11px] font-medium text-[#86868b]"
              data-globe-infinite-feed-sentinel
            >
              <span
                className={cn(
                  "rounded-full px-2.5 py-1",
                  loadingMore ? "bg-[#f5f5f7]" : "bg-transparent",
                )}
              >
                {getInfiniteDiscoveryFeedStatusCopy(
                  feedStatus,
                  visibleCards.length,
                  cards.length,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

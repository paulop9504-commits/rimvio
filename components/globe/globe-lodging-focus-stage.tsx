"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { toast } from "sonner";
import { GlobeContextConditionPinBar } from "@/components/globe/globe-context-condition-pin-bar";
import { GlobeLodgingAgentAskBar } from "@/components/globe/globe-lodging-agent-ask-bar";
import { GlobeLodgingRoomCardList } from "@/components/globe/globe-lodging-room-card-list";
import { GlobeContextQuickPinButton } from "@/components/globe/globe-context-quick-pin-button";
import { GlobeLodgingHubFocusCard } from "@/components/globe/globe-lodging-hub-focus-card";
import { GlobeLodgingYouTubePreviewEmbed } from "@/components/globe/lodging/globe-lodging-youtube-preview-embed";
import { GlobeResourceVideoBranch } from "@/components/globe/globe-resource-video-branch";
import { GlobePredictedExperienceCard } from "@/components/globe/globe-predicted-experience-card";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import {
  readScoutContract,
  writeScoutSelectedAnchor,
} from "@/lib/globe/contracts";
import { publishBridgePinnedContextItem } from "@/lib/experience-bridge/publish-bridge-pinned-context-item";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { useActiveContextWeather } from "@/hooks/use-active-context-weather";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { pinLodgingSelectionToContext, readPinnedLodgingResourceId } from "@/lib/globe/context-hub/pin-lodging-selection-to-context";
import { listLodgingResourcesForEvent } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { openLodgingHubCheckout } from "@/lib/globe/hub-checkout/open-lodging-hub-checkout-bridge";
import { resolveLodgingSituationalLabel } from "@/lib/globe/context-hub/resolve-lodging-situational-label";
import { formatLodgingStayWindowLabel } from "@/lib/globe/context-hub/lodging-stay-window";
import { buildLodgingDynamicTags } from "@/lib/globe/lodging/build-lodging-dynamic-tags";
import { buildLodgingPredictedExperienceCard } from "@/lib/globe/predicted-experience/build-predicted-experience-card";
import {
  dispatchGlobeLodgingFocus,
  dispatchGlobeLodgingFocusStage,
  subscribeGlobeLodgingFocus,
  type GlobeLodgingFocusDetail,
} from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import { dispatchGlobeContextHubOpen } from "@/lib/globe/context-hub/globe-context-hub-open-bridge";
import { formatLodgingStayBadgeLabel } from "@/lib/globe/context-hub/lodging-stay-window";
import { readLodgingPayloadFromResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readLodgingRecommendReason } from "@/lib/globe/lodging/lodging-recommendation-reason-store";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import {
  filterLodgingRankedResources,
  rankContextResources,
} from "@/lib/globe/resource/rank-context-resources";
import { rankLodgingResources } from "@/lib/globe/resource/rank-lodging-resources";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import {
  hydrateMediaContextStore,
  MEDIA_SPACETIME_UPDATED,
} from "@/lib/location-ping/media-context-store";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import { copy } from "@/lib/copy/human-ko";
import {
  GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS,
  GLOBE_MAP_FOCUS_HERO_MEDIA_CLASS,
  GLOBE_MAP_FOCUS_HERO_SHELL_CLASS,
} from "@/lib/globe/globe-map-focus-hero-layout";
import { cn } from "@/lib/utils";
import { useAppLocale } from "@/hooks/use-copy";
import type { LodgingYouTubePreview } from "@/lib/globe/lodging/lodging-youtube-preview-types";

const SWIPE_MIN_PX = 44;

export type GlobeLodgingFocusStageProps = {
  contextEventId: string | null | undefined;
  lat?: number | null;
  lng?: number | null;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  viewerUserId?: string | null;
  className?: string;
};

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

/** Map lodging marker tap — large media + context reel at pin anchor. */
export function GlobeLodgingFocusStage({
  contextEventId,
  lat = null,
  lng = null,
  globeRef,
  viewerUserId: _viewerUserId = null,
  className,
}: GlobeLodgingFocusStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<GlobeLodgingFocusDetail | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [revision, setRevision] = useState(0);
  const [pinBusy, setPinBusy] = useState(false);
  const [youtubePreview, setYoutubePreview] = useState<LodgingYouTubePreview | null>(
    null,
  );
  const locale = useAppLocale();

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    void hydrateMediaContextStore().then(() => bump());
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(MEDIA_SPACETIME_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(MEDIA_SPACETIME_UPDATED, bump);
    };
  }, []);

  useEffect(() => {
    return subscribeGlobeLodgingFocus((detail) => {
      if (detail.source !== "map_marker") {
        return;
      }
      setFocus(detail);
      setMediaIndex(0);
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    dispatchGlobeLodgingFocusStage(open);
    if (!open) {
      return;
    }
    return () => {
      dispatchGlobeLodgingFocusStage(false);
    };
  }, [open]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setOpen(false);
      setFocus(null);
    }, 0);
    dispatchGlobeLodgingFocusStage(false);
    globeRef?.current?.clearPinViewportBias();
    return () => window.clearTimeout(resetTimer);
  }, [contextEventId, globeRef]);

  const eventId = contextEventId?.trim() ?? "";
  const activeEvent = useMemo(() => {
    void revision;
    if (!eventId) {
      return null;
    }
    return (
      findLifeEventCandidate(eventId) ?? recoverGlobeContextEventFromPin(eventId)
    );
  }, [eventId, revision]);

  const { tempC, prepLine } = useActiveContextWeather({
    event: activeEvent,
    enabled: open && Boolean(activeEvent),
  });

  const fullRanked = useMemo(() => {
    void revision;
    if (!activeEvent) {
      return [] as RankedContextResource[];
    }
    const panel = listContextHubServicesForEvent(activeEvent);
    if (panel) {
      const ranked = rankContextResources({
        event: activeEvent,
        services: panel.services,
        lat,
        lng,
      });
      if (ranked.length > 0) {
        return ranked;
      }
    }
    return rankLodgingResources({
      event: activeEvent,
      resources: listLodgingResourcesForEvent(activeEvent),
      lat,
      lng,
    });
  }, [activeEvent, lat, lng, revision]);

  const lodgingRanked = useMemo(
    () => filterLodgingRankedResources(fullRanked),
    [fullRanked],
  );

  const lodgingIndex = useMemo(() => {
    if (!focus) {
      return -1;
    }
    const fromFocus = lodgingRanked.findIndex(
      (row) => row.resource.resourceId === focus.resourceId,
    );
    if (fromFocus >= 0) {
      return fromFocus;
    }
    return Math.min(Math.max(0, focus.carouselIndex), lodgingRanked.length - 1);
  }, [focus, lodgingRanked]);

  const entry = lodgingIndex >= 0 ? lodgingRanked[lodgingIndex] : null;
  const payload = entry ? readLodgingPayloadFromResource(entry.resource) : null;
  const recommendReason =
    eventId && payload?.placeId
      ? readLodgingRecommendReason(eventId, payload.placeId)
      : null;
  const anchorLat = entry?.resource.spacetime.lat ?? null;
  const anchorLng = entry?.resource.spacetime.lng ?? null;

  const contextPlace = useMemo(() => {
    if (!activeEvent) {
      return null;
    }
    return activeEvent.place?.trim() || null;
  }, [activeEvent]);

  const situationalLabel = useMemo(() => {
    if (!activeEvent) {
      return null;
    }
    return resolveLodgingSituationalLabel(activeEvent);
  }, [activeEvent]);

  const dynamicTags = useMemo(() => {
    if (!activeEvent || anchorLat == null || anchorLng == null) {
      return null;
    }
    return buildLodgingDynamicTags({
      event: activeEvent,
      lodgingLat: anchorLat,
      lodgingLng: anchorLng,
      userLat: lat,
      userLng: lng,
      tempC,
    });
  }, [activeEvent, anchorLat, anchorLng, lat, lng, tempC]);
  const stayWindowLabel = useMemo(
    () => formatLodgingStayWindowLabel(payload?.stayWindow),
    [payload?.stayWindow],
  );
  const pinnedResourceId = useMemo(
    () => readPinnedLodgingResourceId(activeEvent),
    [activeEvent],
  );
  const isPinned = Boolean(entry && pinnedResourceId === entry.resource.resourceId);
  const bridgeShared = Boolean(eventId && isBridgeLinkedEventId(eventId));

  useEffect(() => {
    if (!open || anchorLat == null || anchorLng == null) {
      return;
    }
    globeRef?.current?.flyToPin(anchorLat, anchorLng, "neighborhood", {
      pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
    });
  }, [anchorLat, anchorLng, globeRef, open, focus?.resourceId]);

  useEffect(() => {
    if (
      !open ||
      !payload?.placeId ||
      anchorLat == null ||
      anchorLng == null ||
      !eventId
    ) {
      return;
    }
    const scoutId =
      readScoutContract(eventId)?.contractId?.trim() ||
      `lodging:${payload.placeId}`;
    writeScoutSelectedAnchor(eventId, {
      scoutId,
      placeId: payload.placeId,
      lat: anchorLat,
      lng: anchorLng,
      title: payload.name,
    });
  }, [anchorLat, anchorLng, eventId, open, payload]);

  const dismiss = useCallback(() => {
    globeRef?.current?.clearPinViewportBias();
    setOpen(false);
    setFocus(null);
  }, [globeRef]);

  const mediaSlides = useMemo((): readonly string[] => {
    if (!payload) {
      return [];
    }
    const slides: string[] = [];
    if (payload.videoUrl) {
      slides.push(payload.videoUrl);
    }
    slides.push(...payload.images);
    return slides;
  }, [payload]);

  const totalMediaSlides =
    (youtubePreview ? 1 : 0) + mediaSlides.length;

  useEffect(() => {
    if (!open || !payload?.name?.trim()) {
      setYoutubePreview(null);
      return;
    }
    let active = true;
    const params = new URLSearchParams({ name: payload.name.trim() });
    if (payload.address?.trim()) {
      params.set("address", payload.address.trim());
    }
    if (anchorLat != null && Number.isFinite(anchorLat)) {
      params.set("lat", String(anchorLat));
    }
    if (anchorLng != null && Number.isFinite(anchorLng)) {
      params.set("lng", String(anchorLng));
    }
    if (locale.trim()) {
      params.set("locale", locale.trim());
    }
    void fetch(`/api/globe/lodging-preview-video?${params.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { preview?: LodgingYouTubePreview | null } | null) => {
        if (!active) {
          return;
        }
        setYoutubePreview(body?.preview ?? null);
        setMediaIndex(0);
      })
      .catch(() => {
        if (active) {
          setYoutubePreview(null);
        }
      });
    return () => {
      active = false;
    };
  }, [anchorLat, anchorLng, locale, open, payload?.address, payload?.name]);

  const showYoutubeHero = Boolean(youtubePreview && mediaIndex === 0);
  const lodgingMediaIndex = mediaIndex - (youtubePreview ? 1 : 0);
  const currentMedia = showYoutubeHero ? null : mediaSlides[lodgingMediaIndex] ?? null;
  const isVideo =
    currentMedia != null &&
    (currentMedia === payload?.videoUrl ||
      /\.(mp4|webm|mov)(\?|$)/i.test(currentMedia));

  const goToLodgingIndex = useCallback(
    (nextLodgingIndex: number) => {
      const next = lodgingRanked[nextLodgingIndex];
      if (!next) {
        return;
      }
      const carouselIndex = fullRanked.findIndex(
        (row) => row.resource.resourceId === next.resource.resourceId,
      );
      setFocus({
        resourceId: next.resource.resourceId,
        carouselIndex: carouselIndex >= 0 ? carouselIndex : nextLodgingIndex,
        source: "map_marker",
      });
      setMediaIndex(0);
      dispatchGlobeLodgingFocus({
        resourceId: next.resource.resourceId,
        carouselIndex: carouselIndex >= 0 ? carouselIndex : nextLodgingIndex,
        source: "carousel",
      });
    },
    [fullRanked, lodgingRanked],
  );

  const handleSwipeEnd = useCallback(
    (dx: number) => {
      if (Math.abs(dx) < SWIPE_MIN_PX || lodgingRanked.length <= 1) {
        return;
      }
      if (dx > 0) {
        goToLodgingIndex(Math.max(0, lodgingIndex - 1));
      } else {
        goToLodgingIndex(Math.min(lodgingRanked.length - 1, lodgingIndex + 1));
      }
    },
    [goToLodgingIndex, lodgingIndex, lodgingRanked.length],
  );

  const handleBook = useCallback(() => {
    const placeId = payload?.placeId?.trim() ?? "";
    if (eventId && placeId) {
      const opened = openLodgingHubCheckout({
        contextEventId: eventId,
        placeId,
      });
      if (opened) {
        return;
      }
    }
    // Fallback: hotel search for this property (not Google Maps place view).
    const href = entry?.resource.action?.href?.trim();
    if (href && !/google\.com\/maps/iu.test(href) && !href.startsWith("rimvio://")) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    const name = payload?.name?.trim() || entry?.resource.label?.trim();
    if (name) {
      window.open(
        `https://www.google.com/travel/hotels?q=${encodeURIComponent(name)}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    toast.message("예매 정보를 아직 준비하지 못했어요");
  }, [
    entry?.resource.action?.href,
    entry?.resource.label,
    eventId,
    payload?.name,
    payload?.placeId,
  ]);

  const handleDetails = useCallback(() => {
    if (!eventId || !entry) {
      return;
    }
    const carouselIndex = fullRanked.findIndex(
      (row) => row.resource.resourceId === entry.resource.resourceId,
    );
    dispatchGlobeContextHubOpen({
      contextEventId: eventId,
      source: "lodging_focus",
    });
    dispatchGlobeLodgingFocus({
      resourceId: entry.resource.resourceId,
      carouselIndex: carouselIndex >= 0 ? carouselIndex : lodgingIndex,
      source: "carousel",
    });
    dismiss();
  }, [dismiss, entry, eventId, fullRanked, lodgingIndex]);

  const handlePinToContext = useCallback(() => {
    if (
      !eventId ||
      !entry ||
      !payload ||
      anchorLat == null ||
      anchorLng == null
    ) {
      return;
    }
    setPinBusy(true);
    void (async () => {
      try {
        const pinnedEvent = pinLodgingSelectionToContext({
          eventId,
          row: {
            placeId: payload.placeId,
            name: payload.name,
            lat: anchorLat,
            lng: anchorLng,
            images: payload.images,
            videoUrl: payload.videoUrl ?? null,
            priceKrw: payload.priceKrw ?? null,
            partnerLabel: payload.partnerLabel ?? null,
            address: payload.address ?? null,
            mapsUrl: payload.mapsUrl ?? null,
            provider: payload.provider ?? null,
            photoSource: payload.photoSource ?? null,
            photoConfidence: payload.photoConfidence ?? null,
            stayWindow: payload.stayWindow ?? null,
            checkInIso: payload.stayWindow?.checkInIso ?? null,
            checkOutIso: payload.stayWindow?.checkOutIso ?? null,
          },
          previewUrl: currentMedia,
        });
        if (bridgeShared) {
          await publishBridgePinnedContextItem(pinnedEvent);
        }
        setRevision((value) => value + 1);
        toast.success(
          bridgeShared
            ? copy.globe.contextQuickPinSharedToast(payload.name)
            : copy.globe.contextQuickPinToast(payload.name),
        );
      } catch (caught) {
        toast.error(
          caught instanceof Error && caught.message.trim()
            ? caught.message.trim()
            : copy.globe.ingestAttachFail,
        );
      } finally {
        setPinBusy(false);
      }
    })();
  }, [anchorLat, anchorLng, bridgeShared, currentMedia, entry, eventId, payload]);

  if (!open || !entry || !payload) {
    return (
      <div
        ref={containerRef}
        className={cn("pointer-events-none absolute inset-0 z-[21] overflow-hidden", className)}
        aria-hidden
      />
    );
  }

  const priceLabel = formatPriceKrw(payload.priceKrw);
  const stayBadgeLabel = formatLodgingStayBadgeLabel(payload.stayWindow ?? null);
  const priceLine = [priceLabel, payload.partnerLabel?.trim() || null]
    .filter(Boolean)
    .join(" · ");
  const predictedExperience = buildLodgingPredictedExperienceCard({
    title: entry.resource.label,
    situationalLabel,
    stayWindowLabel,
    stayWindow: payload.stayWindow ?? null,
    dynamicTags,
    recommendReason: recommendReason?.reasonKo ?? null,
    recommendReasons: recommendReason?.matchReasons ?? [],
    weatherPrepLine: prepLine,
    tempC,
    priceKrw: payload.priceKrw ?? null,
    partnerLabel: payload.partnerLabel ?? null,
    priceIsStayTotal: payload.provider === "liteapi",
  });
  const reviewVideoPlace =
    payload.address?.trim() || contextPlace || entry.resource.label;
  const showReviewVideoBranch =
    anchorLat != null && anchorLng != null && Boolean(payload.name.trim());

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 z-[30] overflow-hidden", className)}
      data-globe-lodging-focus-stage
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-[0] bg-black/45 backdrop-blur-md"
        aria-label={copy.globe.lodgingFocusCloseAria}
        onClick={dismiss}
      />

      <div
        className="pointer-events-none absolute inset-x-0 z-[1] flex min-h-0 flex-col items-center justify-center overflow-y-auto overscroll-contain px-3 py-1"
        style={{
          top: "max(2.5rem, env(safe-area-inset-top))",
          bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.5rem)",
        }}
        data-globe-lodging-focus-anchor
      >
        <div className={cn("pointer-events-auto", GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS)}>
          <GlobeLodgingHubFocusCard
            className="w-full"
            title={entry.resource.label}
            stayBadgeLabel={stayBadgeLabel}
            priceLine={priceLine || null}
            placeLabel={contextPlace}
            situationalLabel={situationalLabel}
            stayWindowLabel={stayWindowLabel}
            dynamicTags={dynamicTags}
            recommendReason={recommendReason?.reasonKo ?? null}
            recommendReasons={recommendReason?.matchReasons ?? []}
            primaryAction={{
              label: copy.globe.lodgingFocusBook,
              onClick: handleBook,
              disabled: !payload?.placeId && !entry.resource.action?.href,
            }}
            secondaryAction={{
              label: copy.globe.lodgingFocusDetails,
              onClick: handleDetails,
            }}
            onClose={dismiss}
            closeAriaLabel={copy.globe.lodgingFocusCloseAria}
            topAction={
              <GlobeContextQuickPinButton
                label={
                  isPinned
                    ? bridgeShared
                      ? copy.globe.contextQuickPinSharedDone
                      : copy.globe.contextQuickPinDone
                    : bridgeShared
                      ? copy.globe.contextQuickPinSharedCta
                      : copy.globe.contextQuickPinCta
                }
                pinned={isPinned}
                busy={pinBusy}
                onClick={handlePinToContext}
              />
            }
            predictedExperience={
              <GlobePredictedExperienceCard model={predictedExperience} tone="light" />
            }
            footer={
              anchorLat != null &&
              anchorLng != null &&
              payload?.placeId &&
              activeEvent ? (
                <div className="space-y-3">
                  {isPinned ? (
                    <GlobeLodgingRoomCardList
                      contextEventId={eventId}
                      resourceId={entry.resource.resourceId}
                      payload={payload}
                    />
                  ) : null}
                  <GlobeLodgingAgentAskBar
                    event={activeEvent}
                    row={{
                      placeId: payload.placeId,
                      name: payload.name,
                      lat: anchorLat,
                      lng: anchorLng,
                      images: payload.images,
                      videoUrl: payload.videoUrl ?? null,
                      priceKrw: payload.priceKrw ?? null,
                      partnerLabel: payload.partnerLabel ?? null,
                      address: payload.address ?? null,
                      mapsUrl: payload.mapsUrl ?? null,
                      provider: payload.provider ?? null,
                      photoSource: payload.photoSource ?? null,
                      photoConfidence: payload.photoConfidence ?? null,
                      stayWindow: payload.stayWindow ?? null,
                      checkInIso: payload.stayWindow?.checkInIso ?? null,
                      checkOutIso: payload.stayWindow?.checkOutIso ?? null,
                    }}
                    resourceId={entry.resource.resourceId}
                    userDisplayName={
                      readPeerContacts()[0]?.displayName?.trim() || "여행자"
                    }
                    onTurnComplete={(result) => {
                      if (result.mapPins.length === 0) {
                        return;
                      }
                      const bounds = computeLodgingDiscoveryBounds({
                        user:
                          lat != null && lng != null
                            ? { lat, lng }
                            : null,
                        lodging: result.mapPins.map((pin) => ({
                          lat: pin.lat,
                          lng: pin.lng,
                        })),
                      });
                      if (!bounds) {
                        return;
                      }
                      globeRef?.current?.flyToDiscoveryBounds({
                        centerLat: bounds.centerLat,
                        centerLng: bounds.centerLng,
                        altitude: bounds.altitude,
                        pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
                      });
                    }}
                  />
                  <GlobeContextConditionPinBar
                    contextEventId={eventId}
                    anchorPlaceId={payload.placeId}
                    anchorPlaceName={entry.resource.label}
                    anchorLat={anchorLat}
                    anchorLng={anchorLng}
                    anchorPriceKrw={payload.priceKrw ?? null}
                    onPinned={(outcome) => {
                      if (outcome.pinPoints.length === 0) {
                        return;
                      }
                      const bounds = computeLodgingDiscoveryBounds({
                        user:
                          lat != null && lng != null
                            ? { lat, lng }
                            : null,
                        lodging: outcome.pinPoints,
                      });
                      if (!bounds) {
                        return;
                      }
                      globeRef?.current?.flyToDiscoveryBounds({
                        centerLat: bounds.centerLat,
                        centerLng: bounds.centerLng,
                        altitude: bounds.altitude,
                        pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
                      });
                    }}
                  />
                  {lodgingRanked.length > 1 ? (
                    <p className="text-[11px] font-normal text-[#86868b]">
                      {copy.globe.lodgingFocusSwipeHint}
                    </p>
                  ) : null}
                </div>
              ) : lodgingRanked.length > 1 ? (
                <p className="text-[11px] font-normal text-[#86868b]">
                  {copy.globe.lodgingFocusSwipeHint}
                </p>
              ) : undefined
            }
            onTouchStart={(event) => {
              event.stopPropagation();
              const touch = event.changedTouches[0] ?? event.touches[0];
              if (!touch) {
                return;
              }
              touchStartRef.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              event.stopPropagation();
              const start = touchStartRef.current;
              const touch = event.changedTouches[0];
              touchStartRef.current = null;
              if (!start || !touch) {
                return;
              }
              const dx = touch.clientX - start.x;
              const dy = touch.clientY - start.y;
              if (Math.abs(dx) > Math.abs(dy)) {
                handleSwipeEnd(dx);
              }
            }}
            hero={
              <>
                <div className={GLOBE_MAP_FOCUS_HERO_SHELL_CLASS}>
                  {showYoutubeHero && youtubePreview ? (
                    <GlobeLodgingYouTubePreviewEmbed
                      key={youtubePreview.videoId}
                      embedUrl={youtubePreview.embedUrl}
                      title={youtubePreview.title}
                      isShort={youtubePreview.isShort}
                      className={GLOBE_MAP_FOCUS_HERO_MEDIA_CLASS}
                    />
                  ) : isVideo && currentMedia ? (
                    <video
                      key={currentMedia}
                      src={currentMedia}
                      className={GLOBE_MAP_FOCUS_HERO_MEDIA_CLASS}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : currentMedia ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={currentMedia}
                      src={currentMedia}
                      alt=""
                      className={GLOBE_MAP_FOCUS_HERO_MEDIA_CLASS}
                      draggable={false}
                    />
                  ) : (
                    <div className="flex min-h-[9rem] w-full items-center justify-center text-[12px] text-[#86868b]">
                      {copy.globe.lodgingMediaFallback}
                    </div>
                  )}
                </div>

                {totalMediaSlides > 1 ? (
                  <div className="absolute inset-x-0 bottom-2 z-[3] flex justify-center gap-1.5">
                    {Array.from({ length: totalMediaSlides }, (_, index) => (
                      <button
                        key={`lodging-media:${index}`}
                        type="button"
                        aria-label={`${index + 1}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setMediaIndex(index);
                        }}
                        className={cn(
                          "size-1.5 rounded-full shadow-sm",
                          index === mediaIndex ? "bg-white" : "bg-white/45",
                        )}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            }
          />
        </div>
      </div>
      {showReviewVideoBranch ? (
        <div
          className="pointer-events-none absolute z-[2] flex items-center"
          style={{
            top: "max(2.5rem, env(safe-area-inset-top))",
            bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.5rem)",
            left: "min(calc(100% - 10rem), 20.5rem)",
          }}
        >
          <GlobeResourceVideoBranch
            key={`${entry.resource.resourceId}:${reviewVideoPlace}`}
            name={payload.name}
            place={reviewVideoPlace}
            kind="lodging"
            lat={anchorLat}
            lng={anchorLng}
          />
        </div>
      ) : null}
    </div>
  );
}

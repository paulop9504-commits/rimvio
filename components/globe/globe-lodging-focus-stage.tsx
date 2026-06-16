"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { GlobeMapProductFocusCard } from "@/components/globe/globe-map-product-focus-card";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import {
  dispatchGlobeLodgingFocus,
  dispatchGlobeLodgingFocusStage,
  subscribeGlobeLodgingFocus,
  type GlobeLodgingFocusDetail,
} from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import { dispatchGlobeContextHubOpen } from "@/lib/globe/context-hub/globe-context-hub-open-bridge";
import { readLodgingPayloadFromResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import {
  filterLodgingRankedResources,
  rankContextResources,
} from "@/lib/globe/resource/rank-context-resources";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import {
  hydrateMediaContextStore,
  MEDIA_SPACETIME_UPDATED,
} from "@/lib/location-ping/media-context-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

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
  viewerUserId = null,
  className,
}: GlobeLodgingFocusStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<GlobeLodgingFocusDetail | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [revision, setRevision] = useState(0);

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
    setOpen(false);
    setFocus(null);
    dispatchGlobeLodgingFocusStage(false);
    globeRef?.current?.clearPinViewportBias();
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

  const fullRanked = useMemo(() => {
    void revision;
    if (!activeEvent) {
      return [] as RankedContextResource[];
    }
    const panel = listContextHubServicesForEvent(activeEvent);
    if (!panel) {
      return [] as RankedContextResource[];
    }
    return rankContextResources({
      event: activeEvent,
      services: panel.services,
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
  const anchorLat = entry?.resource.spacetime.lat ?? null;
  const anchorLng = entry?.resource.spacetime.lng ?? null;

  const contextPlace = useMemo(() => {
    if (!activeEvent) {
      return null;
    }
    return activeEvent.place?.trim() || activeEvent.title.trim() || null;
  }, [activeEvent]);

  useEffect(() => {
    if (!open || anchorLat == null || anchorLng == null) {
      return;
    }
    globeRef?.current?.flyToPin(anchorLat, anchorLng, "neighborhood", {
      pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
    });
  }, [anchorLat, anchorLng, globeRef, open, focus?.resourceId]);

  const dismiss = useCallback(() => {
    globeRef?.current?.clearPinViewportBias();
    setOpen(false);
    setFocus(null);
  }, [globeRef]);

  const mediaSlides = useMemo((): readonly string[] => {
    if (!payload) {
      return [];
    }
    if (payload.videoUrl) {
      return [payload.videoUrl, ...payload.images];
    }
    return payload.images;
  }, [payload]);

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
    const href = entry?.resource.action?.href?.trim();
    if (!href) {
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  }, [entry?.resource.action?.href]);

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
  const subtitleParts = [priceLabel, payload.partnerLabel?.trim() || null].filter(Boolean);
  const subtitle = subtitleParts.join(" · ");
  const currentMedia = mediaSlides[mediaIndex] ?? null;
  const isVideo =
    currentMedia != null &&
    (currentMedia === payload.videoUrl ||
      /\.(mp4|webm|mov)(\?|$)/i.test(currentMedia));

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 z-[30] overflow-hidden", className)}
      data-globe-lodging-focus-stage
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-[0] bg-black/50 backdrop-blur-md"
        aria-label={copy.globe.lodgingFocusCloseAria}
        onClick={dismiss}
      />

      <div
        className="pointer-events-none absolute inset-x-0 z-[1] flex flex-col items-center justify-center px-4"
        style={{
          top: "max(3rem, env(safe-area-inset-top))",
          bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.75rem)",
        }}
        data-globe-lodging-focus-anchor
      >
        <div className="pointer-events-auto w-full max-w-[380px]">
        <GlobeMapProductFocusCard
          className="w-full"
          title={entry.resource.label}
          subtitle={subtitle || null}
          eyebrow={contextPlace}
          primaryAction={{
            label: copy.globe.lodgingFocusBook,
            onClick: handleBook,
            disabled: !entry.resource.action?.href,
          }}
          secondaryAction={{
            label: copy.globe.lodgingFocusDetails,
            onClick: handleDetails,
            variant: "secondary",
          }}
          onClose={dismiss}
          closeAriaLabel={copy.globe.lodgingFocusCloseAria}
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
            <div className="relative overflow-hidden rounded-[1.1rem] bg-[#e8e8ed]">
              {isVideo && currentMedia ? (
                <video
                  key={currentMedia}
                  src={currentMedia}
                  className="aspect-[4/5] w-full object-cover"
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
                  className="aspect-[4/5] w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center text-[12px] text-[#6e6e73]">
                  {copy.globe.lodgingMediaFallback}
                </div>
              )}

              {mediaSlides.length > 1 ? (
                <div className="absolute inset-x-0 bottom-2.5 z-[2] flex justify-center gap-1.5">
                  {mediaSlides.map((slide, index) => (
                    <button
                      key={`${slide}:${index}`}
                      type="button"
                      aria-label={`${index + 1}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMediaIndex(index);
                      }}
                      className={cn(
                        "size-2 rounded-full",
                        index === mediaIndex ? "bg-white" : "bg-white/40",
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          }
        />
        </div>

        {lodgingRanked.length > 1 ? (
          <p className="pointer-events-none mt-3 text-center text-[11px] font-medium text-white/85">
            {copy.globe.lodgingFocusSwipeHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

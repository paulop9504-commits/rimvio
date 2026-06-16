"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { X } from "lucide-react";
import { GlobeLodgingDynamicTags } from "@/components/globe/globe-lodging-dynamic-tags";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { useGlobePinScreenAnchor } from "@/hooks/use-globe-pin-screen-anchor";
import { useActiveContextWeather } from "@/hooks/use-active-context-weather";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import {
  dispatchGlobeLodgingFocus,
  subscribeGlobeLodgingFocus,
  type GlobeLodgingFocusDetail,
} from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import { readLodgingPayloadFromResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { buildLodgingDynamicTags } from "@/lib/globe/lodging/build-lodging-dynamic-tags";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";
import { resolveExperienceVolumeForEvent } from "@/lib/globe/resolve-globe-context-primary-video";
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
    setOpen(false);
    setFocus(null);
  }, [contextEventId]);

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

  const { tempC } = useActiveContextWeather({
    event: activeEvent,
    enabled: open && Boolean(activeEvent),
  });

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

  const contextReel = useMemo(() => {
    void revision;
    if (!activeEvent) {
      return [];
    }
    const volume = resolveExperienceVolumeForEvent(eventId);
    return projectContextMediaReel({ event: activeEvent, volume, viewerUserId }).slice(0, 6);
  }, [activeEvent, eventId, revision, viewerUserId]);

  const contextPlace = useMemo(() => {
    if (!activeEvent) {
      return null;
    }
    return activeEvent.place?.trim() || activeEvent.title.trim() || null;
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

  useEffect(() => {
    if (!open || anchorLat == null || anchorLng == null) {
      return;
    }
    globeRef?.current?.flyToPin(anchorLat, anchorLng, "neighborhood");
  }, [anchorLat, anchorLng, globeRef, open, focus?.resourceId]);

  const anchorLayout = useGlobePinScreenAnchor({
    globeRef: globeRef ?? { current: null },
    lat: anchorLat,
    lng: anchorLng,
    enabled: open && Boolean(entry) && Boolean(globeRef),
    containerRef,
  });

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

  const dismiss = useCallback(() => {
    setOpen(false);
    setFocus(null);
  }, []);

  if (!open || !entry || !payload || !anchorLayout) {
    return (
      <div
        ref={containerRef}
        className={cn("pointer-events-none absolute inset-0 z-[21] overflow-hidden", className)}
        aria-hidden
      />
    );
  }

  const priceLabel = formatPriceKrw(payload.priceKrw);
  const currentMedia = mediaSlides[mediaIndex] ?? null;
  const isVideo =
    currentMedia != null &&
    (currentMedia === payload.videoUrl ||
      /\.(mp4|webm|mov)(\?|$)/i.test(currentMedia));

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 z-[23] overflow-hidden", className)}
      data-globe-lodging-focus-stage
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-[0] bg-black/25 backdrop-blur-[2px]"
        aria-label={copy.globe.lodgingFocusCloseAria}
        onClick={dismiss}
      />

      <div
        className="absolute z-[1]"
        style={{
          left: anchorLayout.x,
          top: anchorLayout.y,
          width: Math.min(anchorLayout.widthPx, 340),
          transform: "translate(-50%, calc(-100% - 12px))",
        }}
        data-globe-lodging-focus-anchor
      >
        <div
          className="pointer-events-auto overflow-hidden rounded-[1.35rem] border-2 border-white/95 bg-black shadow-[0_16px_48px_rgba(0,0,0,0.35)] ring-1 ring-black/10"
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
        >
          <div className="relative aspect-[4/5] w-full bg-black">
            {isVideo && currentMedia ? (
              <video
                key={currentMedia}
                src={currentMedia}
                className="size-full object-cover"
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
                className="size-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-[12px] text-white/70">
                {copy.globe.lodgingMediaFallback}
              </div>
            )}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                dismiss();
              }}
              className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
              aria-label={copy.globe.lodgingFocusCloseAria}
            >
              <X className="size-4" aria-hidden />
            </button>

            {mediaSlides.length > 1 ? (
              <div className="absolute inset-x-0 bottom-[4.5rem] z-[2] flex justify-center gap-1">
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
                      "size-1.5 rounded-full",
                      index === mediaIndex ? "bg-white" : "bg-white/40",
                    )}
                  />
                ))}
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3.5 pb-3 pt-16">
              <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-white">
                {entry.resource.label}
              </p>
              {priceLabel ? (
                <p className="mt-0.5 text-[12px] font-semibold text-primary-foreground/90">
                  {priceLabel}
                  {payload.partnerLabel ? ` · ${payload.partnerLabel}` : null}
                </p>
              ) : null}
              {contextPlace ? (
                <p className="mt-1 text-[11px] font-medium text-white/75">
                  {contextPlace}
                </p>
              ) : null}
              {dynamicTags ? <GlobeLodgingDynamicTags tags={dynamicTags} /> : null}
            </div>
          </div>

          {contextReel.length > 0 ? (
            <div className="border-t border-white/10 bg-[#0b0f14]/95 px-3 py-2.5">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">
                {copy.globe.lodgingFocusContextMedia}
              </p>
              <div className="flex gap-1.5 overflow-x-auto">
                {contextReel.map((item) => {
                  const thumb = item.imageUrl ?? null;
                  return (
                    <div
                      key={item.id}
                      className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md border border-white/15 bg-white/10"
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="size-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-[8px] text-white/50">
                          {item.kind === "video" ? "▶" : "·"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {lodgingRanked.length > 1 ? (
          <p className="pointer-events-none mt-2 text-center text-[10px] font-medium text-white/90 drop-shadow-sm">
            {copy.globe.lodgingFocusSwipeHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

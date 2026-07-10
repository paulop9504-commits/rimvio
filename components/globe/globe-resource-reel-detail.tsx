"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { toast } from "sonner";
import { GlobeResourceReelAirbnbCard } from "@/components/globe/globe-resource-reel-airbnb-card";
import { GlobeLodgingRoomCardList } from "@/components/globe/globe-lodging-room-card-list";
import { GlobeContextQuickPinButton } from "@/components/globe/globe-context-quick-pin-button";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { publishBridgePinnedContextItem } from "@/lib/experience-bridge/publish-bridge-pinned-context-item";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { useActiveContextWeather } from "@/hooks/use-active-context-weather";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import {
  pinLodgingSelectionToContext,
  readPinnedLodgingResourceId,
} from "@/lib/globe/context-hub/pin-lodging-selection-to-context";
import { formatLodgingStayWindowLabel } from "@/lib/globe/context-hub/lodging-stay-window";
import { dispatchGlobeContextHubOpen } from "@/lib/globe/context-hub/globe-context-hub-open-bridge";
import { readLodgingPayloadFromResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readLodgingRecommendReason } from "@/lib/globe/lodging/lodging-recommendation-reason-store";
import { buildEateryInfraActions } from "@/lib/globe/eatery/eatery-infra-actions";
import { pinEaterySelectionToContext, readPinnedEateryResourceId } from "@/lib/globe/eatery/pin-eatery-selection-to-context";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { readEateryRecommendReason } from "@/lib/globe/eatery/eatery-recommendation-reason-store";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import {
  filterLodgingRankedResources,
  rankContextResources,
} from "@/lib/globe/resource/rank-context-resources";
import { rankLodgingResources } from "@/lib/globe/resource/rank-lodging-resources";
import { listLodgingResourcesForEvent } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";
import { activitySubtypeActionLabel } from "@/lib/globe/place/activity-subtype-presentation";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import {
  hydrateMediaContextStore,
  MEDIA_SPACETIME_UPDATED,
} from "@/lib/location-ping/media-context-store";
import { copy } from "@/lib/copy/human-ko";
import {
  beginLodgingResourceBooking,
  markLodgingResourceComparing,
} from "@/lib/resource-operation";

const SWIPE_MIN_PX = 44;

export type GlobeResourceReelDetailProps = {
  item: GlobeResourceReelItem;
  items: readonly GlobeResourceReelItem[];
  contextEventId: string;
  lat?: number | null;
  lng?: number | null;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  onDismiss: () => void;
  onSelectItem: (item: GlobeResourceReelItem) => void;
  resumeIntent?: "book" | "pay" | null;
};

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatMatchRating(score100: number): string {
  const stars = Math.min(5, Math.max(3.8, score100 / 20));
  return `★ ${stars.toFixed(2)}`;
}

export function GlobeResourceReelDetail({
  item,
  items,
  contextEventId,
  lat = null,
  lng = null,
  globeRef,
  onDismiss,
  onSelectItem,
  resumeIntent = null,
}: GlobeResourceReelDetailProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const resumeBookOnceRef = useRef(false);
  const [revision, setRevision] = useState(0);
  const [pinBusy, setPinBusy] = useState(false);

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

  const activeEvent = useMemo(() => {
    void revision;
    return (
      findLifeEventCandidate(contextEventId) ??
      recoverGlobeContextEventFromPin(contextEventId)
    );
  }, [contextEventId, revision]);

  const itemIndex = items.findIndex((row) => row.resourceId === item.resourceId);

  const lodgingRanked = useMemo(() => {
    void revision;
    if (!activeEvent || item.kind !== "lodging") {
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
      const lodging = filterLodgingRankedResources(ranked);
      if (lodging.length > 0) {
        return lodging;
      }
    }
    return rankLodgingResources({
      event: activeEvent,
      resources: listLodgingResourcesForEvent(activeEvent),
      lat,
      lng,
    });
  }, [activeEvent, item.kind, lat, lng, revision]);

  const lodgingEntry = useMemo(() => {
    if (item.kind !== "lodging") {
      return null;
    }
    return (
      lodgingRanked.find((row) => row.resource.resourceId === item.resourceId) ??
      lodgingRanked[0] ??
      null
    );
  }, [item.kind, item.resourceId, lodgingRanked]);

  const lodgingPayload = lodgingEntry
    ? readLodgingPayloadFromResource(lodgingEntry.resource)
    : null;

  const eateryRow = useMemo(() => {
    if (
      (item.kind !== "eatery" &&
        item.kind !== "activity" &&
        item.kind !== "amenity") ||
      !activeEvent
    ) {
      return null;
    }
    return (
      readEateryInventoryRows(activeEvent).find((row) => row.placeId === item.placeId) ??
      null
    );
  }, [activeEvent, item.kind, item.placeId, revision]);

  useActiveContextWeather({
    event: activeEvent,
    enabled: Boolean(activeEvent),
  });

  const anchorLat =
    item.kind === "lodging"
      ? (lodgingEntry?.resource.spacetime.lat ?? item.lat)
      : (eateryRow?.lat ?? item.lat);
  const anchorLng =
    item.kind === "lodging"
      ? (lodgingEntry?.resource.spacetime.lng ?? item.lng)
      : (eateryRow?.lng ?? item.lng);

  useEffect(() => {
    if (anchorLat == null || anchorLng == null) {
      return;
    }
    globeRef?.current?.flyToPin(anchorLat, anchorLng, "neighborhood", {
      pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
    });
  }, [anchorLat, anchorLng, globeRef, item.resourceId]);

  const handleSwipeEnd = useCallback(
    (dx: number) => {
      if (Math.abs(dx) < SWIPE_MIN_PX || items.length <= 1 || itemIndex < 0) {
        return;
      }
      const nextIndex =
        dx > 0 ? Math.max(0, itemIndex - 1) : Math.min(items.length - 1, itemIndex + 1);
      const next = items[nextIndex];
      if (next) {
        onSelectItem(next);
      }
    },
    [itemIndex, items, onSelectItem],
  );

  const touchHandlers = {
    onTouchStart: (event: React.TouchEvent) => {
      event.stopPropagation();
      const touch = event.changedTouches[0] ?? event.touches[0];
      if (!touch) {
        return;
      }
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    onTouchEnd: (event: React.TouchEvent) => {
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
    },
  };

  const swipeHint = items.length > 1 ? copy.globe.resourceReelSwipeHint : null;
  const bridgeShared = isBridgeLinkedEventId(contextEventId);

  const runLodgingBook = useCallback(() => {
    if (item.kind !== "lodging" || !lodgingEntry) {
      return;
    }
    beginLodgingResourceBooking(item.resourceId);
    markLodgingResourceComparing({
      contextEventId,
      resourceId: item.resourceId,
      label: lodgingEntry.resource.label,
      lat: anchorLat,
      lng: anchorLng,
    });
    const href = lodgingEntry.resource.action?.href?.trim();
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    dispatchGlobeContextHubOpen({
      contextEventId,
      source: "lodging_focus",
    });
    onDismiss();
  }, [
    anchorLat,
    anchorLng,
    contextEventId,
    item.kind,
    item.resourceId,
    lodgingEntry,
    onDismiss,
  ]);

  useEffect(() => {
    if (resumeIntent !== "book" && resumeIntent !== "pay") {
      resumeBookOnceRef.current = false;
      return;
    }
    if (item.kind !== "lodging" || !lodgingEntry || !lodgingPayload) {
      return;
    }
    if (resumeBookOnceRef.current) {
      return;
    }
    resumeBookOnceRef.current = true;
    runLodgingBook();
  }, [
    item.kind,
    lodgingEntry,
    lodgingPayload,
    resumeIntent,
    runLodgingBook,
  ]);

  if (item.kind === "lodging" && lodgingEntry && lodgingPayload) {
    const recommendReason = readLodgingRecommendReason(contextEventId, lodgingPayload.placeId);
    const pinnedResourceId = readPinnedLodgingResourceId(activeEvent);
    const isPinned = pinnedResourceId === lodgingEntry.resource.resourceId;
    const stayWindowLabel = formatLodgingStayWindowLabel(lodgingPayload.stayWindow);
    const placeLabel = activeEvent?.place?.trim() || null;

    return (
      <div className="flex flex-col gap-3">
        <GlobeResourceReelAirbnbCard
          title={lodgingEntry.resource.label}
          images={lodgingPayload.images}
          videoUrl={lodgingPayload.videoUrl}
          ratingLabel={formatMatchRating(item.score100)}
          subtitle={
            [placeLabel, recommendReason?.reasonKo ?? item.detailReasonLine]
              .filter(Boolean)
              .join(" · ") || null
          }
          specsLine={stayWindowLabel}
          priceLabel={formatPriceKrw(lodgingPayload.priceKrw)}
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
              onClick={() => {
          if (!activeEvent || anchorLat == null || anchorLng == null || isPinned) {
            return;
          }
          setPinBusy(true);
          void (async () => {
            try {
              const pinnedEvent = pinLodgingSelectionToContext({
                eventId: contextEventId,
                row: {
                  placeId: lodgingPayload.placeId,
                  name: lodgingPayload.name,
                  lat: anchorLat,
                  lng: anchorLng,
                  images: lodgingPayload.images,
                  videoUrl: lodgingPayload.videoUrl ?? null,
                  priceKrw: lodgingPayload.priceKrw ?? null,
                  partnerLabel: lodgingPayload.partnerLabel ?? null,
                  address: lodgingPayload.address ?? null,
                  mapsUrl: lodgingPayload.mapsUrl ?? null,
                  provider: lodgingPayload.provider ?? null,
                  photoSource: lodgingPayload.photoSource ?? null,
                  photoConfidence: lodgingPayload.photoConfidence ?? null,
                  stayWindow: lodgingPayload.stayWindow ?? null,
                  checkInIso: lodgingPayload.stayWindow?.checkInIso ?? null,
                  checkOutIso: lodgingPayload.stayWindow?.checkOutIso ?? null,
                },
                previewUrl: lodgingPayload.images[0] ?? null,
              });
              if (bridgeShared) {
                await publishBridgePinnedContextItem(pinnedEvent);
              }
              setRevision((value) => value + 1);
              toast.success(
                bridgeShared
                  ? copy.globe.contextQuickPinSharedToast(lodgingPayload.name)
                  : copy.globe.contextQuickPinToast(lodgingPayload.name),
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
              }}
            />
          }
          onClose={onDismiss}
          closeAriaLabel={copy.globe.resourceReelCloseAria}
          onPrimaryAction={runLodgingBook}
          primaryActionLabel={copy.globe.lodgingFocusBook}
          swipeHint={swipeHint}
          {...touchHandlers}
        />
        {isPinned ? (
          <GlobeLodgingRoomCardList
            contextEventId={contextEventId}
            resourceId={lodgingEntry.resource.resourceId}
            payload={lodgingPayload}
          />
        ) : null}
      </div>
    );
  }

  if (
    (item.kind === "eatery" ||
      item.kind === "activity" ||
      item.kind === "amenity") &&
    eateryRow &&
    activeEvent
  ) {
    const reason = readEateryRecommendReason(contextEventId, eateryRow.placeId);
    const pinnedResourceId = readPinnedEateryResourceId(activeEvent);
    const isPinned = pinnedResourceId === item.resourceId;
    const infraActions = buildEateryInfraActions({
      name: eateryRow.name,
      address: eateryRow.address,
      lat: eateryRow.lat,
      lng: eateryRow.lng,
      mapsUrl: eateryRow.mapsUrl,
      contextPlace: activeEvent.place ?? null,
      contextTitle: activeEvent.title ?? null,
    });
    const primaryAction = infraActions.find((row) => row.tone === "primary") ?? infraActions[0];
    const subtypeActionLabel =
      item.kind === "activity"
        ? activitySubtypeActionLabel(item.activitySubtype ?? "general")
        : item.kind === "amenity"
          ? copy.globe.eateryFocusNavigate
          : null;
    const primaryActionLabel =
      item.kind === "activity" || item.kind === "amenity"
        ? (subtypeActionLabel ?? item.actionLabel ?? copy.globe.eateryFocusNavigate)
        : (primaryAction?.label ?? copy.globe.eateryFocusNavigate);

    return (
      <GlobeResourceReelAirbnbCard
        title={eateryRow.name}
        images={eateryRow.images}
        ratingLabel={
          typeof eateryRow.rating === "number"
            ? `★ ${eateryRow.rating.toFixed(1)}`
            : formatMatchRating(item.score100)
        }
        subtitle={
          [activeEvent.place?.trim(), reason?.reasonKo ?? item.detailReasonLine]
            .filter(Boolean)
            .join(" · ") || null
        }
        specsLine={item.secondaryLine}
        priceLabel={eateryRow.priceLevel != null ? `Lv ${eateryRow.priceLevel}` : null}
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
            onClick={() => {
          if (isPinned) {
            return;
          }
          setPinBusy(true);
          void (async () => {
            try {
              const pinnedEvent = pinEaterySelectionToContext({
                eventId: contextEventId,
                row: eateryRow,
                previewUrl: eateryRow.images[0] ?? null,
              });
              if (bridgeShared) {
                await publishBridgePinnedContextItem(pinnedEvent);
              }
              setRevision((value) => value + 1);
              toast.success(
                bridgeShared
                  ? copy.globe.contextQuickPinSharedToast(eateryRow.name)
                  : copy.globe.contextQuickPinToast(eateryRow.name),
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
            }}
          />
        }
        onClose={onDismiss}
        closeAriaLabel={copy.globe.resourceReelCloseAria}
        onPrimaryAction={() => {
          const href = primaryAction?.href ?? item.actionHref;
          if (!href) {
            return;
          }
          window.open(href, "_blank", "noopener,noreferrer");
        }}
        primaryActionLabel={primaryActionLabel}
        swipeHint={swipeHint}
        {...touchHandlers}
      />
    );
  }

  return (
    <GlobeResourceReelAirbnbCard
      title={item.title}
      images={item.thumbnailUrl ? [item.thumbnailUrl] : []}
      ratingLabel={formatMatchRating(item.score100)}
      subtitle={item.detailReasonLine}
      specsLine={item.secondaryLine ?? null}
      onClose={onDismiss}
      closeAriaLabel={copy.globe.resourceReelCloseAria}
      swipeHint={swipeHint}
      {...touchHandlers}
    />
  );
}

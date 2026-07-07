import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import { resolveBrainSurfaceMarkerThumbnail } from "@/lib/globe/brain-surface-marker-media";
import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { selectPreferredLodgingImage } from "@/lib/globe/lodging/lodging-photo-fidelity";
import {
  findContextConditionPinBatch,
  readContextConditionPinBatches,
} from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { resolveContextLodgingMarkerPresentation } from "@/lib/globe/context-condition-ai/resolve-context-lodging-marker-presentation";
import { readLodgingRecommendReason } from "@/lib/globe/lodging/lodging-recommendation-reason-store";
import { resolveStableContextPlaceAnchor } from "@/lib/context-instance/build-context-instance";
import { haversineKm } from "@/lib/feed/spacetime-fit";

function extractMapPillLabel(label: string): string {
  const trimmed = label.trim().replace(/\s+/gu, " ");
  if (trimmed.length <= 22) {
    return trimmed;
  }
  return `${trimmed.slice(0, 21).trimEnd()}…`;
}

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function resolveLatestBatch(event: EventCandidate, batchId?: string | null) {
  const key = batchId?.trim();
  if (key) {
    return findContextConditionPinBatch(event, key);
  }
  const batches = readContextConditionPinBatches(event);
  return batches.length > 0 ? batches[batches.length - 1]! : null;
}

/** Context Condition batch → discovery pills (SSOT when hub rank skips rows). */
export function projectContextConditionLodgingGlobeMarkers(input: {
  event: EventCandidate;
  batchId?: string | null;
}): GlobeLodgingMapMarker[] {
  const batch = resolveLatestBatch(input.event, input.batchId);
  if (!batch || batch.lodgingPlaceIds.length === 0) {
    return [];
  }
  const placeIds = new Set(batch.lodgingPlaceIds);
  const rows = readLodgingInventoryRows(input.event).filter((row) =>
    placeIds.has(row.placeId),
  );
  const anchor = resolveStableContextPlaceAnchor(input.event);
  const anchorLat = anchor.lat;
  const anchorLng = anchor.lng;
  return rows.map((row, index) => {
    const thumbnailUrl =
      selectPreferredLodgingImage(row) ??
      resolveBrainSurfaceMarkerThumbnail({
        family: "lodging",
        thumbnailUrl: row.images[0] ?? null,
      });
    const batchReason = readContextConditionLastBatch(input.event.id)?.recommendations?.find(
      (rec) => rec.kind === "lodging" && rec.placeId === row.placeId,
    );
    const scoredReason = readLodgingRecommendReason(input.event.id, row.placeId);
    const distanceKm =
      anchorLat != null && anchorLng != null
        ? haversineKm(anchorLat, anchorLng, row.lat, row.lng)
        : null;
    const presentation = resolveContextLodgingMarkerPresentation({
      reasonKo: batchReason?.reasonKo ?? scoredReason?.reasonKo ?? null,
      matchReasons: scoredReason?.matchReasons,
      priceKrw: row.priceKrw,
      thumbnailUrl,
      distanceKm,
      rankIndex: index,
    });
    return {
      markerKind: "lodging" as const,
      id: `ctxcond:lodging:${batch.batchId}:${row.placeId}`,
      resourceId: `${input.event.id}:lodging:${row.placeId}`,
      label: row.name,
      lat: row.lat,
      lng: row.lng,
      carouselIndex: index,
      isMain: index === 0,
      thumbnailUrl,
      displayVariant: presentation.displayVariant,
      mapHintLine: presentation.mapHintLine,
      discoveryPriceLabel: presentation.discoveryPriceLabel,
      discoveryAccent: "green" as const,
      contextConditionPin: true,
      popInDelayMs: index * 140,
    };
  });
}

export function projectContextConditionEateryGlobeMarkers(input: {
  event: EventCandidate;
  batchId?: string | null;
}): GlobeEateryMapMarker[] {
  const batch = resolveLatestBatch(input.event, input.batchId);
  if (!batch || batch.eateryPlaceIds.length === 0) {
    return [];
  }
  const placeIds = new Set(batch.eateryPlaceIds);
  const rows = readEateryInventoryRows(input.event).filter((row) =>
    placeIds.has(row.placeId),
  );
  return rows.map((row, index) => {
    const thumbnailUrl = resolveBrainSurfaceMarkerThumbnail({
      family: "eatery",
      thumbnailUrl: row.images[0] ?? null,
    });
    return {
      markerKind: "eatery" as const,
      id: `ctxcond:eatery:${batch.batchId}:${row.placeId}`,
      resourceId: `${input.event.id}:eatery:${row.placeId}`,
      label: row.name,
      lat: row.lat,
      lng: row.lng,
      carouselIndex: index,
      isMain: index === 0,
      thumbnailUrl,
      discoveryShortLabel: extractMapPillLabel(row.name),
      discoveryPriceLabel: row.priceLevel != null ? `Lv ${row.priceLevel}` : null,
      discoveryAccent: "green" as const,
      contextConditionPin: true,
      ontologyBadgeLabel: copy.globe.contextConditionPinBadge,
      popInDelayMs: index * 140,
    };
  });
}

export function mergeContextConditionLodgingMarkers(
  base: readonly GlobeLodgingMapMarker[],
  contextCondition: readonly GlobeLodgingMapMarker[],
): GlobeLodgingMapMarker[] {
  if (contextCondition.length === 0) {
    return [...base];
  }
  const overlayIds = new Set(contextCondition.map((marker) => marker.resourceId));
  const rest = base.filter((marker) => !overlayIds.has(marker.resourceId));
  return [...contextCondition, ...rest];
}

export function mergeContextConditionEateryMarkers(
  base: readonly GlobeEateryMapMarker[],
  contextCondition: readonly GlobeEateryMapMarker[],
): GlobeEateryMapMarker[] {
  if (contextCondition.length === 0) {
    return [...base];
  }
  const overlayIds = new Set(contextCondition.map((marker) => marker.resourceId));
  const rest = base.filter((marker) => !overlayIds.has(marker.resourceId));
  return [...contextCondition, ...rest];
}

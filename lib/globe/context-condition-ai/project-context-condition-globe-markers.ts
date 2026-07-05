import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { selectPreferredLodgingImage } from "@/lib/globe/lodging/lodging-photo-fidelity";
import {
  findContextConditionPinBatch,
  readContextConditionPinBatches,
} from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { resolveBrainSurfaceMarkerThumbnail } from "@/lib/globe/brain-surface-marker-media";

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
  return rows.map((row, index) => {
    const thumbnailUrl =
      selectPreferredLodgingImage(row) ??
      resolveBrainSurfaceMarkerThumbnail({
        family: "lodging",
        thumbnailUrl: row.images[0] ?? null,
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
      discoveryShortLabel: extractMapPillLabel(row.name),
      discoveryPriceLabel: formatPriceKrw(row.priceKrw),
      discoveryAccent: "green" as const,
      contextConditionPin: true,
      ontologyBadgeLabel: copy.globe.contextConditionPinBadge,
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

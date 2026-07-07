import type { EventCandidate } from "@/lib/events/event-candidate";
import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { selectPreferredLodgingImage } from "@/lib/globe/lodging/lodging-photo-fidelity";
import { readLodgingRecommendReason } from "@/lib/globe/lodging/lodging-recommendation-reason-store";
import { readEateryRecommendReason } from "@/lib/globe/eatery/eatery-recommendation-reason-store";
import { buildResourceReelResourceId } from "@/lib/globe/resource-reel/globe-resource-reel-bridge";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";
import { copy } from "@/lib/copy/human-ko";
import { buildGoogleMapsPlaceHref } from "@/lib/resolvers/deep-links";

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function scoreFromRank(index: number, total: number): number {
  if (total <= 1) {
    return 92;
  }
  return Math.max(68, Math.round(92 - (index / Math.max(total - 1, 1)) * 24));
}

function accentForItem(
  kind: GlobeResourceReelItem["kind"],
  index: number,
): GlobeResourceReelItem["accent"] {
  if (index === 0) {
    return kind === "lodging" ? "green" : "orange";
  }
  if (index === 1) {
    return "blue";
  }
  if (index === 2) {
    return "purple";
  }
  return kind === "lodging" ? "green" : "orange";
}

function pushLodgingItem(input: {
  event: EventCandidate;
  placeId: string;
  title: string;
  index: number;
  total: number;
  reasonKo?: string | null;
}): GlobeResourceReelItem | null {
  const row = readLodgingInventoryRows(input.event).find(
    (entry) => entry.placeId === input.placeId,
  );
  if (!row) {
    return null;
  }
  const reason =
    input.reasonKo?.trim() ||
    readLodgingRecommendReason(input.event.id, row.placeId)?.reasonKo ||
    copy.globe.lodgingReasonFallback;
  return {
    resourceId: buildResourceReelResourceId({
      contextEventId: input.event.id,
      kind: "lodging",
      placeId: row.placeId,
    }),
    kind: "lodging",
    placeId: row.placeId,
    title: row.name,
    score100: scoreFromRank(input.index, input.total),
    detailReasonLine: reason,
    accent: accentForItem("lodging", input.index),
    thumbnailUrl: selectPreferredLodgingImage(row) ?? row.images[0] ?? null,
    lat: row.lat,
    lng: row.lng,
    carouselIndex: input.index,
    secondaryLine: formatPriceKrw(row.priceKrw),
    actionHref: buildGoogleMapsPlaceHref({
      lat: row.lat,
      lng: row.lng,
      placeId: row.placeId,
      placeLabel: row.name,
    }),
    actionLabel: copy.globe.lodgingFocusBook,
  };
}

function pushEateryItem(input: {
  event: EventCandidate;
  placeId: string;
  title: string;
  index: number;
  total: number;
  reasonKo?: string | null;
}): GlobeResourceReelItem | null {
  const row = readEateryInventoryRows(input.event).find(
    (entry) => entry.placeId === input.placeId,
  );
  if (!row) {
    return null;
  }
  const reason =
    input.reasonKo?.trim() ||
    readEateryRecommendReason(input.event.id, row.placeId)?.reasonKo ||
    copy.globe.eateryReasonFallback;
  const meta = [
    typeof row.rating === "number" ? `평점 ${row.rating.toFixed(1)}` : null,
    row.openNow == null ? null : row.openNow ? "영업 중" : "영업 종료",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    resourceId: buildResourceReelResourceId({
      contextEventId: input.event.id,
      kind: "eatery",
      placeId: row.placeId,
    }),
    kind: "eatery",
    placeId: row.placeId,
    title: row.name,
    score100: scoreFromRank(input.index, input.total),
    detailReasonLine: reason,
    accent: accentForItem("eatery", input.index),
    thumbnailUrl: row.images[0] ?? null,
    lat: row.lat,
    lng: row.lng,
    carouselIndex: input.index,
    secondaryLine: meta || null,
    actionHref:
      row.mapsUrl?.trim() ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name)}&query_place_id=${encodeURIComponent(row.placeId)}`,
    actionLabel: copy.globe.eateryFocusNavigate,
  };
}

/** Scout batch order first, then remaining inventory rows. */
export function buildGlobeResourceReelItems(
  event: EventCandidate | null | undefined,
): GlobeResourceReelItem[] {
  if (!event) {
    return [];
  }

  const batch = readContextConditionLastBatch(event.id);
  const recommendations = batch?.recommendations ?? [];
  const items: GlobeResourceReelItem[] = [];
  const seen = new Set<string>();

  if (recommendations.length > 0) {
    const total = recommendations.length;
    recommendations.forEach((rec, index) => {
      const placeId = rec.placeId?.trim();
      if (!placeId) {
        return;
      }
      const key = `${rec.kind}:${placeId}`;
      if (seen.has(key)) {
        return;
      }
      const built =
        rec.kind === "lodging"
          ? pushLodgingItem({
              event,
              placeId,
              title: rec.title,
              index,
              total,
              reasonKo: rec.reasonKo,
            })
          : pushEateryItem({
              event,
              placeId,
              title: rec.title,
              index,
              total,
              reasonKo: rec.reasonKo,
            });
      if (built) {
        seen.add(key);
        items.push(built);
      }
    });
    if (items.length > 0) {
      return items;
    }
  }

  const lodgingRows = readLodgingInventoryRows(event);
  const eateryRows = readEateryInventoryRows(event);
  const total = lodgingRows.length + eateryRows.length;
  let index = 0;

  for (const row of lodgingRows) {
    const built = pushLodgingItem({
      event,
      placeId: row.placeId,
      title: row.name,
      index,
      total,
    });
    if (built) {
      items.push(built);
      index += 1;
    }
  }
  for (const row of eateryRows) {
    const built = pushEateryItem({
      event,
      placeId: row.placeId,
      title: row.name,
      index,
      total,
    });
    if (built) {
      items.push(built);
      index += 1;
    }
  }

  return items;
}

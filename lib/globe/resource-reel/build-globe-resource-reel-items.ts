import type { EventCandidate } from "@/lib/events/event-candidate";
import { readActiveDiscoveryExecution } from "@/lib/globe/discovery-execution/read-active-discovery-execution";
import { discoverySurfaceIncludesLodgingForEvent } from "@/lib/globe/context-condition-ai/discovery-surface-includes-lodging";
import { findContextConditionPinBatch } from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import {
  CONTEXT_LODGING_RECOMMEND_SCORES_META_KEY,
  type LodgingRecommendScoreWire,
} from "@/lib/globe/context-hub/lodging-resource-types";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { computeEateryResourceRankWeight } from "@/lib/globe/eatery/compute-eatery-resource-rank-weight";
import { readEateryRankModeOverride } from "@/lib/globe/eatery/eatery-rank-mode-session-store";
import { computeLodgingResourceRankWeight } from "@/lib/globe/lodging/compute-lodging-resource-rank-weight";
import { readLodgingRankModeOverride } from "@/lib/globe/lodging/lodging-rank-mode-session-store";
import { selectPreferredLodgingImage } from "@/lib/globe/lodging/lodging-photo-fidelity";
import { readLodgingRecommendReason } from "@/lib/globe/lodging/lodging-recommendation-reason-store";
import { readEateryRecommendReason } from "@/lib/globe/eatery/eatery-recommendation-reason-store";
import {
  refreshLivePlaceMetaLine,
  refreshLivePlaceReasonKo,
} from "@/lib/globe/feed-entity/refresh-live-place-feed-copy";
import { buildResourceReelResourceId } from "@/lib/globe/resource-reel/globe-resource-reel-bridge";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";
import { copy } from "@/lib/copy/human-ko";
import { buildGoogleMapsPlaceHref } from "@/lib/resolvers/deep-links";
import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  activitySubtypeActionLabel,
  activitySubtypeNoun,
} from "@/lib/globe/place/activity-subtype-presentation";
import {
  buildGlobeResourceReelItemsFromLensPrefetch,
  readActiveDiscoveryLens,
  readDiscoveryLensSession,
} from "@/lib/globe/discovery-lens";
import {
  decorateReasonWithMeaningWhy,
  resolveContextMeaningWhyLine,
} from "@/lib/meaning/resolve-context-meaning-why-line";
import { listLifeEventCandidates } from "@/lib/life-read-model";

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
    return kind === "lodging" ? "green" : kind === "amenity" ? "blue" : "orange";
  }
  if (index === 1) {
    return "blue";
  }
  if (index === 2) {
    return "purple";
  }
  return kind === "lodging" ? "green" : kind === "amenity" ? "blue" : "orange";
}

function pushLodgingItem(input: {
  event: EventCandidate;
  placeId: string;
  title: string;
  index: number;
  total: number;
  reasonKo?: string | null;
  batchId: string;
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
    contractSource: {
      sourceKind: "batch",
      sourceId: input.batchId,
    },
  };
}

function pushEateryItem(input: {
  event: EventCandidate;
  kind?: GlobeResourceReelItem["kind"];
  activitySubtype?: LocalDiscoveryActivitySubtype | null;
  placeId: string;
  title: string;
  index: number;
  total: number;
  reasonKo?: string | null;
  batchId: string;
}): GlobeResourceReelItem | null {
  const row = readEateryInventoryRows(input.event).find(
    (entry) => entry.placeId === input.placeId,
  );
  if (!row) {
    return null;
  }
  const reason = refreshLivePlaceReasonKo({
    reasonKo:
      input.reasonKo?.trim() ||
      readEateryRecommendReason(input.event.id, row.placeId)?.reasonKo ||
      copy.globe.eateryReasonFallback,
    openNow: row.openNow,
    placeLat: row.lat,
    placeLng: row.lng,
  });
  const meta = refreshLivePlaceMetaLine({
    metaLine: [
      input.kind === "activity"
        ? activitySubtypeNoun(input.activitySubtype ?? "general")
        : input.kind === "amenity"
          ? "편의"
          : null,
      typeof row.rating === "number" ? `평점 ${row.rating.toFixed(1)}` : null,
      row.openNow == null ? null : row.openNow ? "영업 중" : "영업 종료",
    ]
      .filter(Boolean)
      .join(" · "),
    openNow: row.openNow,
  });
  const kind = input.kind ?? "eatery";
  return {
    resourceId: buildResourceReelResourceId({
      contextEventId: input.event.id,
      kind,
      placeId: row.placeId,
    }),
    kind,
    activitySubtype: kind === "activity" ? (input.activitySubtype ?? null) : null,
    placeId: row.placeId,
    title: row.name,
    score100: scoreFromRank(input.index, input.total),
    detailReasonLine: reason,
    accent: accentForItem(kind, input.index),
    thumbnailUrl: row.images[0] ?? null,
    lat: row.lat,
    lng: row.lng,
    carouselIndex: input.index,
    secondaryLine: meta || null,
    actionHref:
      row.mapsUrl?.trim() ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name)}&query_place_id=${encodeURIComponent(row.placeId)}`,
    actionLabel:
      kind === "activity"
        ? activitySubtypeActionLabel(input.activitySubtype ?? "general")
        : kind === "amenity"
          ? "길찾기"
          : copy.globe.eateryFocusNavigate,
    contractSource: {
      sourceKind: "batch",
      sourceId: input.batchId,
    },
  };
}

function readLodgingRecommendScores(
  event: EventCandidate,
): Record<string, LodgingRecommendScoreWire> {
  const raw = event.metadata?.[CONTEXT_LODGING_RECOMMEND_SCORES_META_KEY];
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as Record<string, LodgingRecommendScoreWire>;
}

/** Append scored lodging rows scoped to the active scout batch (never global inventory bleed). */
function appendScoredLodgingReelItems(input: {
  event: EventCandidate;
  batchId: string;
  allowedPlaceIds: ReadonlySet<string>;
  items: GlobeResourceReelItem[];
  seen: Set<string>;
}): void {
  if (input.allowedPlaceIds.size === 0) {
    return;
  }
  const lodgingRankMode = readLodgingRankModeOverride(input.event.id);
  const rows = readLodgingInventoryRows(input.event)
    .filter((row) => input.allowedPlaceIds.has(row.placeId.trim()))
    .map((row) => ({
      row,
      score: computeLodgingResourceRankWeight({
        event: input.event,
        row,
        mode: lodgingRankMode,
      }),
      reasonKo: readLodgingRecommendScores(input.event)[row.placeId]?.reasonKo ?? null,
    }))
    .sort((left, right) => right.score - left.score || left.row.name.localeCompare(right.row.name, "ko"));

  const lodgingTotal = rows.length;
  for (const [index, entry] of rows.entries()) {
    const placeId = entry.row.placeId.trim();
    if (!placeId) {
      continue;
    }
    const key = `lodging:${placeId}`;
    if (input.seen.has(key)) {
      continue;
    }
    const built = pushLodgingItem({
      event: input.event,
      placeId,
      title: entry.row.name,
      index,
      total: lodgingTotal,
      reasonKo: entry.reasonKo,
      batchId: input.batchId,
    });
    if (built) {
      input.seen.add(key);
      input.items.push(built);
    }
  }
}

/**
 * Discovery reel SSOT: active lens prefetch → last scout batch → empty.
 * Trip lodging/eatery inventory must never fill this surface (@see RIMVIO_CONTRACT_SCHEMA.md).
 */
export function buildGlobeResourceReelItems(
  event: EventCandidate | null | undefined,
): GlobeResourceReelItem[] {
  if (!event) {
    return [];
  }

  const lensSession = readDiscoveryLensSession(event.id);
  const activeLens = readActiveDiscoveryLens(lensSession);
  if (
    activeLens?.prefetch?.status === "ready" &&
    activeLens.prefetch.items.length > 0
  ) {
    return buildGlobeResourceReelItemsFromLensPrefetch({
      contextEventId: event.id,
      lensLabel: activeLens.labelKo,
      lensId: activeLens.id,
      bundle: activeLens.prefetch,
    });
  }

  const batch = readActiveDiscoveryExecution(event.id);
  const recommendations = batch?.recommendations ?? [];
  if (recommendations.length === 0 || !batch?.batchId) {
    return [];
  }

  const items: GlobeResourceReelItem[] = [];
  const seen = new Set<string>();
  const total = recommendations.length;
  const batchId = batch.batchId;

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
            batchId,
          })
        : pushEateryItem({
            event,
            kind: rec.kind,
            activitySubtype: rec.activitySubtype ?? null,
            placeId,
            title: rec.title,
            index,
            total,
            reasonKo: rec.reasonKo,
            batchId,
          }) ??
          // Fallback: synthesize from batch wire when inventory mirror missing.
          (Number.isFinite(rec.lat) && Number.isFinite(rec.lng)
            ? {
                resourceId: buildResourceReelResourceId({
                  contextEventId: event.id,
                  kind: rec.kind,
                  placeId,
                }),
                kind: rec.kind,
                activitySubtype:
                  rec.kind === "activity" ? (rec.activitySubtype ?? null) : null,
                placeId,
                title: rec.title,
                score100: scoreFromRank(index, total),
                detailReasonLine: rec.reasonKo,
                accent: accentForItem(rec.kind, index),
                thumbnailUrl: null,
                lat: rec.lat as number,
                lng: rec.lng as number,
                carouselIndex: index,
                secondaryLine: null,
                actionHref: buildGoogleMapsPlaceHref({
                  lat: rec.lat as number,
                  lng: rec.lng as number,
                  placeId,
                  placeLabel: rec.title,
                }),
                actionLabel:
                  rec.kind === "activity"
                    ? activitySubtypeActionLabel(rec.activitySubtype ?? "general")
                    : rec.kind === "amenity"
                      ? "길찾기"
                      : copy.globe.eateryFocusNavigate,
                contractSource: {
                  sourceKind: "batch" as const,
                  sourceId: batchId,
                },
              }
            : null);
    if (built) {
      seen.add(key);
      items.push(built);
    }
  });

  const includeLodging = discoverySurfaceIncludesLodgingForEvent(event);
  if (includeLodging) {
    const pinBatch = findContextConditionPinBatch(event, batchId);
    const allowedLodgingIds = new Set(
      [
        ...recommendations
          .filter((row) => row.kind === "lodging")
          .map((row) => row.placeId?.trim())
          .filter((placeId): placeId is string => Boolean(placeId)),
        ...(pinBatch?.lodgingPlaceIds ?? []),
      ].filter(Boolean),
    );
    appendScoredLodgingReelItems({
      event,
      batchId,
      allowedPlaceIds: allowedLodgingIds,
      items,
      seen,
    });
  }

  const scopedItems = includeLodging
    ? items
    : items.filter((item) => item.kind !== "lodging");

  const reordered = includeLodging
    ? resortLodgingReelItemsByRankMode({ event, items: scopedItems })
    : scopedItems;
  const reorderedEatery = resortEateryReelItemsByRankMode({
    event,
    items: reordered,
  });

  const meaningWhy = resolveContextMeaningWhyLine({
    event,
    events: listLifeEventCandidates(),
  });

  return reorderedEatery.map((item, index) => ({
    ...item,
    carouselIndex: index,
    detailReasonLine: decorateReasonWithMeaningWhy(
      meaningWhy,
      item.detailReasonLine,
    ),
  }));
}

function resortLodgingReelItemsByRankMode(input: {
  event: EventCandidate;
  items: GlobeResourceReelItem[];
}): GlobeResourceReelItem[] {
  const lodgingIndices: number[] = [];
  const lodgingItems: GlobeResourceReelItem[] = [];
  input.items.forEach((item, index) => {
    if (item.kind !== "lodging") {
      return;
    }
    lodgingIndices.push(index);
    lodgingItems.push(item);
  });
  if (lodgingItems.length <= 1) {
    return input.items;
  }

  const rowByPlaceId = new Map(
    readLodgingInventoryRows(input.event).map((row) => [row.placeId, row]),
  );
  const lodgingRankMode = readLodgingRankModeOverride(input.event.id);
  const sorted = [...lodgingItems].sort((left, right) => {
    const leftRow = rowByPlaceId.get(left.placeId);
    const rightRow = rowByPlaceId.get(right.placeId);
    const leftScore = leftRow
      ? computeLodgingResourceRankWeight({
          event: input.event,
          row: leftRow,
          mode: lodgingRankMode,
        })
      : left.score100;
    const rightScore = rightRow
      ? computeLodgingResourceRankWeight({
          event: input.event,
          row: rightRow,
          mode: lodgingRankMode,
        })
      : right.score100;
    return rightScore - leftScore || left.title.localeCompare(right.title, "ko");
  });

  const result = [...input.items];
  lodgingIndices.forEach((index, offset) => {
    result[index] = sorted[offset]!;
  });
  return result;
}

function resortEateryReelItemsByRankMode(input: {
  event: EventCandidate;
  items: GlobeResourceReelItem[];
}): GlobeResourceReelItem[] {
  const eateryIndices: number[] = [];
  const eateryItems: GlobeResourceReelItem[] = [];
  input.items.forEach((item, index) => {
    if (item.kind !== "eatery") {
      return;
    }
    eateryIndices.push(index);
    eateryItems.push(item);
  });
  if (eateryItems.length <= 1) {
    return input.items;
  }

  const rowByPlaceId = new Map(
    readEateryInventoryRows(input.event).map((row) => [row.placeId, row]),
  );
  const eateryRankMode = readEateryRankModeOverride(input.event.id);
  const sorted = [...eateryItems].sort((left, right) => {
    const leftRow = rowByPlaceId.get(left.placeId);
    const rightRow = rowByPlaceId.get(right.placeId);
    const leftScore = leftRow
      ? computeEateryResourceRankWeight({
          event: input.event,
          row: leftRow,
          mode: eateryRankMode,
        })
      : left.score100;
    const rightScore = rightRow
      ? computeEateryResourceRankWeight({
          event: input.event,
          row: rightRow,
          mode: eateryRankMode,
        })
      : right.score100;
    return rightScore - leftScore || left.title.localeCompare(right.title, "ko");
  });

  const result = [...input.items];
  eateryIndices.forEach((index, offset) => {
    result[index] = sorted[offset]!;
  });
  return result;
}

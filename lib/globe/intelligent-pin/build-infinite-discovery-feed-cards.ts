import type { EventCandidate } from "@/lib/events/event-candidate";
import { detectConcurrentDiscoveryDomains } from "@/lib/globe/context-condition-ai/concurrent-lodging-eatery-cues";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { selectPreferredLodgingImage } from "@/lib/globe/lodging/lodging-photo-fidelity";
import { buildFeedEntityProfile } from "@/lib/globe/feed-entity/build-feed-entity-profile";
import {
  refreshLivePlaceMetaLine,
  refreshLivePlaceReasonKo,
} from "@/lib/globe/feed-entity/refresh-live-place-feed-copy";
import { classifyDiscoveryEntityQuery } from "@/lib/globe/feed-entity/classify-discovery-entity-query";
import type { InfiniteDiscoveryFeedCard } from "@/lib/globe/intelligent-pin/types";
import { activitySubtypeNoun } from "@/lib/globe/place/activity-subtype-presentation";
import { resolveResourceReviewVideoContext } from "@/lib/globe/resource-reel/resolve-resource-review-video-context";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";
import {
  decorateReasonWithMeaningWhy,
  resolveContextMeaningWhyLine,
} from "@/lib/meaning/resolve-context-meaning-why-line";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { copy } from "@/lib/copy/human-ko";

function formatScoreLabel(score100: number): string | null {
  if (!Number.isFinite(score100)) {
    return null;
  }
  const stars = Math.min(5, Math.max(3.5, score100 / 20));
  return stars.toFixed(1);
}

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function categoryLabelKo(
  kind: GlobeResourceReelItem["kind"],
  activitySubtype: GlobeResourceReelItem["activitySubtype"],
): string {
  switch (kind) {
    case "lodging":
      return copy.globe.intelligentPinCategoryLodging;
    case "eatery":
      return copy.globe.intelligentPinCategoryEatery;
    case "amenity":
      return copy.globe.intelligentPinCategoryAmenity;
    case "activity":
      return activitySubtypeNoun(activitySubtype ?? "general");
  }
}

function imageUrlsForItem(
  event: EventCandidate,
  item: GlobeResourceReelItem,
): readonly string[] {
  if (item.kind === "lodging") {
    const row = readLodgingInventoryRows(event).find(
      (entry) => entry.placeId === item.placeId,
    );
    const preferred = row ? selectPreferredLodgingImage(row) : null;
    const urls = [
      preferred,
      ...(row?.images ?? []),
      item.thumbnailUrl,
    ].filter((url): url is string => Boolean(url?.trim()));
    return [...new Set(urls)].slice(0, 6);
  }
  const row = readEateryInventoryRows(event).find(
    (entry) => entry.placeId === item.placeId,
  );
  const urls = [...(row?.images ?? []), item.thumbnailUrl].filter(
    (url): url is string => Boolean(url?.trim()),
  );
  return [...new Set(urls)].slice(0, 6);
}

function resolveDiscoveryFeedKindOrder(
  triggerMessage?: string | null,
): readonly GlobeResourceReelItem["kind"][] {
  const defaultOrder: GlobeResourceReelItem["kind"][] = [
    "eatery",
    "activity",
    "amenity",
    "lodging",
  ];
  const msg = triggerMessage?.trim() ?? "";
  if (!msg) {
    return defaultOrder;
  }
  const resourceToKind: Record<string, GlobeResourceReelItem["kind"]> = {
    restaurant: "eatery",
    hotel: "lodging",
    activity: "activity",
    amenity: "amenity",
  };
  const mentioned = detectConcurrentDiscoveryDomains(msg)
    .map((hit) => resourceToKind[hit.resourceType])
    .filter((kind): kind is GlobeResourceReelItem["kind"] => Boolean(kind));
  if (mentioned.length === 0) {
    return defaultOrder;
  }
  const order: GlobeResourceReelItem["kind"][] = [];
  const used = new Set<GlobeResourceReelItem["kind"]>();
  for (const kind of mentioned) {
    if (used.has(kind)) {
      continue;
    }
    order.push(kind);
    used.add(kind);
  }
  for (const kind of defaultOrder) {
    if (used.has(kind)) {
      continue;
    }
    order.push(kind);
  }
  return order;
}

/** Group by kind into contiguous sectors (not interleaved). */
export function groupDiscoveryItemsBySector(
  items: readonly GlobeResourceReelItem[],
  triggerMessage?: string | null,
): GlobeResourceReelItem[] {
  const buckets = new Map<GlobeResourceReelItem["kind"], GlobeResourceReelItem[]>();
  for (const item of items) {
    const bucket = buckets.get(item.kind) ?? [];
    bucket.push(item);
    buckets.set(item.kind, bucket);
  }
  const kindsPresent = [...buckets.keys()];
  if (kindsPresent.length <= 1) {
    return [...items];
  }
  const order = resolveDiscoveryFeedKindOrder(triggerMessage);
  const mixed: GlobeResourceReelItem[] = [];
  const used = new Set<GlobeResourceReelItem["kind"]>();
  for (const kind of order) {
    const rows = buckets.get(kind);
    if (!rows?.length) {
      continue;
    }
    mixed.push(...rows);
    used.add(kind);
  }
  for (const kind of kindsPresent) {
    if (used.has(kind)) {
      continue;
    }
    mixed.push(...(buckets.get(kind) ?? []));
  }
  return mixed;
}

export function buildInfiniteDiscoveryFeedCards(input: {
  event: EventCandidate;
  items: readonly GlobeResourceReelItem[];
  triggerMessage?: string | null;
  viewerLat?: number | null;
  viewerLng?: number | null;
  now?: Date;
}): InfiniteDiscoveryFeedCard[] {
  const now = input.now ?? new Date();
  const classified = input.triggerMessage?.trim()
    ? classifyDiscoveryEntityQuery(input.triggerMessage)
    : null;
  const meaningWhy = resolveContextMeaningWhyLine({
    event: input.event,
    events: listLifeEventCandidates(),
  });
  const mixed = groupDiscoveryItemsBySector(input.items, input.triggerMessage);
  return mixed.map((item, index) => {
    const images = imageUrlsForItem(input.event, item);
    const lodgingRow =
      item.kind === "lodging"
        ? readLodgingInventoryRows(input.event).find(
            (entry) => entry.placeId === item.placeId,
          )
        : null;
    const eateryRow =
      item.kind !== "lodging"
        ? readEateryInventoryRows(input.event).find(
            (entry) => entry.placeId === item.placeId,
          )
        : null;
    const secondaryLine =
      refreshLivePlaceMetaLine({
        metaLine:
          item.secondaryLine ??
          formatPriceKrw(lodgingRow?.priceKrw ?? null) ??
          null,
        openNow: eateryRow?.openNow,
        now,
      }) ??
      formatPriceKrw(lodgingRow?.priceKrw ?? null) ??
      null;
    const detailReasonLine = decorateReasonWithMeaningWhy(
      meaningWhy,
      refreshLivePlaceReasonKo({
        reasonKo: item.detailReasonLine,
        openNow: eateryRow?.openNow,
        viewerLat: input.viewerLat,
        viewerLng: input.viewerLng,
        placeLat: item.lat,
        placeLng: item.lng,
        now,
      }),
    );
    const canCheckout = item.kind === "lodging" && lodgingRow != null;
    const profile = buildFeedEntityProfile({
      event: input.event,
      item,
      imageCount: images.length,
      userIntentKo: classified?.userIntentKo ?? null,
      triggerMessage: input.triggerMessage,
    });
    const areaFallback =
      input.event.place?.trim() ||
      input.event.title?.trim() ||
      item.title;
    // Lodging · eatery · activity · amenity — all open pin-anchored YouTube.
    const videoContext = resolveResourceReviewVideoContext({
      event: input.event,
      item,
      areaFallback,
    });
    return {
      resourceId: item.resourceId,
      kind: item.kind,
      activitySubtype: item.activitySubtype ?? null,
      placeId: item.placeId,
      lat: item.lat,
      lng: item.lng,
      carouselIndex: index,
      media: {
        title: item.title,
        categoryLabelKo: categoryLabelKo(item.kind, item.activitySubtype),
        detailReasonLine,
        secondaryLine,
        imageUrls: images,
        scoreLabel: formatScoreLabel(item.score100),
        videoContext,
      },
      profile,
      state: {
        capsuleState: "exploring",
        statusLineKo: copy.globe.intelligentPinStatusExploring,
      },
      transaction: {
        canCheckout,
        payLabelKo: canCheckout
          ? (item.actionLabel ?? copy.globe.lodgingFocusBook)
          : (item.actionLabel ?? null),
      },
    };
  });
}

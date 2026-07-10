import type { EventCandidate } from "@/lib/events/event-candidate";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { selectPreferredLodgingImage } from "@/lib/globe/lodging/lodging-photo-fidelity";
import { buildFeedEntityProfile } from "@/lib/globe/feed-entity/build-feed-entity-profile";
import { classifyDiscoveryEntityQuery } from "@/lib/globe/feed-entity/classify-discovery-entity-query";
import type { InfiniteDiscoveryFeedCard } from "@/lib/globe/intelligent-pin/types";
import { activitySubtypeNoun } from "@/lib/globe/place/activity-subtype-presentation";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";
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

function interleaveMixedKinds(
  items: readonly GlobeResourceReelItem[],
): GlobeResourceReelItem[] {
  const buckets = new Map<string, GlobeResourceReelItem[]>();
  for (const item of items) {
    const bucket = buckets.get(item.kind) ?? [];
    bucket.push(item);
    buckets.set(item.kind, bucket);
  }
  const kinds = [...buckets.keys()];
  if (kinds.length <= 1) {
    return [...items];
  }
  const maxLen = Math.max(...kinds.map((kind) => buckets.get(kind)!.length));
  const mixed: GlobeResourceReelItem[] = [];
  for (let index = 0; index < maxLen; index += 1) {
    for (const kind of kinds) {
      const row = buckets.get(kind)?.[index];
      if (row) {
        mixed.push(row);
      }
    }
  }
  return mixed;
}

export function buildInfiniteDiscoveryFeedCards(input: {
  event: EventCandidate;
  items: readonly GlobeResourceReelItem[];
  triggerMessage?: string | null;
}): InfiniteDiscoveryFeedCard[] {
  const classified = input.triggerMessage?.trim()
    ? classifyDiscoveryEntityQuery(input.triggerMessage)
    : null;
  const mixed = interleaveMixedKinds(input.items);
  return mixed.map((item, index) => {
    const images = imageUrlsForItem(input.event, item);
    const lodgingRow =
      item.kind === "lodging"
        ? readLodgingInventoryRows(input.event).find(
            (entry) => entry.placeId === item.placeId,
          )
        : null;
    const secondaryLine =
      item.secondaryLine ??
      formatPriceKrw(lodgingRow?.priceKrw ?? null) ??
      null;
    const canCheckout = item.kind === "lodging" && lodgingRow != null;
    const profile = buildFeedEntityProfile({
      event: input.event,
      item,
      imageCount: images.length,
      userIntentKo: classified?.userIntentKo ?? null,
      triggerMessage: input.triggerMessage,
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
        detailReasonLine: item.detailReasonLine,
        secondaryLine,
        imageUrls: images,
        scoreLabel: formatScoreLabel(item.score100),
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

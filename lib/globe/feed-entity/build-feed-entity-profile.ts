import type { EventCandidate } from "@/lib/events/event-candidate";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import { readEntityDataSchema } from "@/lib/globe/feed-entity/entity-data-schemas";
import { resolveDiscoveryEntityKindFromReel } from "@/lib/globe/feed-entity/resolve-discovery-entity-kind-from-reel";
import type {
  DiscoveryEntityKind,
  EntityDataSlotId,
  EntityReviewCategoryId,
  FeedEntityProfileLayer,
  FeedEntityReviewFocusWire,
  FeedEntitySlotWire,
} from "@/lib/globe/feed-entity/types";
import type { PlaceReviewKind } from "@/lib/globe/place-review-video";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";
import { copy } from "@/lib/copy/human-ko";
import { isDeepLocalNight } from "@/lib/globe/feed-entity/refresh-live-place-feed-copy";

type InventoryContext = {
  lodgingRow: ContextLodgingInventoryRow | null;
  eateryRow: ContextEateryInventoryRow | null;
  imageCount: number;
  hasVideo: boolean;
};

function reviewKindForEntity(entityKind: DiscoveryEntityKind): PlaceReviewKind {
  if (entityKind === "hotel") {
    return "lodging";
  }
  if (entityKind === "restaurant" || entityKind === "cafe") {
    return "eatery";
  }
  return "place";
}

function slotLabelKo(slotId: EntityDataSlotId): string {
  return copy.globe.feedEntitySlotLabel(slotId);
}

function reviewCategoryLabelKo(categoryId: EntityReviewCategoryId): string {
  return copy.globe.feedEntityReviewCategoryLabel(categoryId);
}

function resolveSlot(
  slotId: EntityDataSlotId,
  inventory: InventoryContext,
  item: GlobeResourceReelItem,
): Omit<FeedEntitySlotWire, "priority"> {
  const lodging = inventory.lodgingRow;
  const eatery = inventory.eateryRow;
  const images = inventory.imageCount;
  const address = lodging?.address ?? eatery?.address ?? null;
  const priceKrw = lodging?.priceKrw ?? null;
  const rating = eatery?.rating ?? null;
  const openNow = eatery?.openNow;

  switch (slotId) {
    case "room_photos":
    case "food_photos":
    case "drink_food_photos":
    case "product_photos":
    case "attraction_photos":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: images >= 1,
        valueKo: images > 0 ? copy.globe.feedEntityPhotoCount(images) : null,
        confidence: images >= 3 ? 90 : images >= 1 ? 65 : 0,
      };
    case "location_info":
    case "access_info":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: Boolean(address?.trim()),
        valueKo: address?.trim() ?? copy.globe.feedEntityNearMapPin,
        confidence: address?.trim() ? 85 : 35,
      };
    case "price_range":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: priceKrw != null || eatery?.priceLevel != null,
        valueKo:
          priceKrw != null
            ? `₩${Math.round(priceKrw).toLocaleString("ko-KR")}`
            : eatery?.priceLevel != null
              ? copy.globe.feedEntityPriceLevel(eatery.priceLevel)
              : null,
        confidence: priceKrw != null ? 88 : eatery?.priceLevel != null ? 60 : 0,
      };
    case "menu_with_prices":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: Boolean(eatery?.cuisineHint?.trim() || eatery?.categoryLabel?.trim()),
        valueKo: eatery?.cuisineHint?.trim() ?? eatery?.categoryLabel?.trim() ?? null,
        confidence: eatery?.cuisineHint ? 70 : 40,
      };
    case "operation_hours":
    case "working_hours":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: openNow != null,
        valueKo:
          openNow == null
            ? null
            : openNow
              ? isDeepLocalNight(new Date())
                ? copy.globe.feedEntityHoursCheck
                : copy.globe.feedEntityOpenNow
              : copy.globe.feedEntityClosedNow,
        confidence: openNow != null ? 75 : 0,
      };
    case "reviews_by_category":
    case "reviews_with_taste_rating":
    case "reviews_by_vibe":
    case "reviews_by_value":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: rating != null || Boolean(item.detailReasonLine?.trim()),
        valueKo:
          rating != null
            ? copy.globe.feedEntityRatingLabel(rating)
            : item.detailReasonLine?.trim() ?? null,
        confidence: rating != null ? 82 : item.detailReasonLine ? 55 : 0,
      };
    case "video_tour":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: inventory.hasVideo,
        valueKo: inventory.hasVideo
          ? copy.globe.feedEntityVideoReady
          : copy.globe.feedEntityVideoPending,
        confidence: inventory.hasVideo ? 80 : 25,
      };
    case "amenities":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: Boolean(lodging?.roomOffers?.length),
        valueKo: lodging?.roomOffers?.length
          ? copy.globe.feedEntityRoomTypes(lodging.roomOffers.length)
          : null,
        confidence: lodging?.roomOffers?.length ? 78 : 20,
      };
    case "breakfast_info":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: false,
        valueKo: copy.globe.feedEntityCollecting,
        confidence: 15,
      };
    case "interior_design":
    case "store_layout_photos":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: images >= 2,
        valueKo: images >= 2 ? copy.globe.feedEntityAmbiancePhotos : null,
        confidence: images >= 2 ? 68 : 0,
      };
    case "wifi_quality":
    case "noise_level":
    case "seating_capacity":
    case "waiting_time":
    case "reservation_info":
    case "crowd_timing":
    case "ticket_info":
    case "product_variety":
    case "payment_methods":
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: false,
        valueKo: copy.globe.feedEntityCollecting,
        confidence: 12,
      };
    default:
      return {
        slotId,
        labelKo: slotLabelKo(slotId),
        filled: false,
        valueKo: null,
        confidence: 0,
      };
  }
}

function readInventoryContext(input: {
  event: EventCandidate;
  item: GlobeResourceReelItem;
  imageCount: number;
}): InventoryContext {
  const lodgingRow =
    input.item.kind === "lodging"
      ? readLodgingInventoryRows(input.event).find(
          (row) => row.placeId === input.item.placeId,
        ) ?? null
      : null;
  const eateryRow =
    input.item.kind !== "lodging"
      ? readEateryInventoryRows(input.event).find(
          (row) => row.placeId === input.item.placeId,
        ) ?? null
      : null;
  const hasVideo =
    Boolean(lodgingRow?.videoUrl?.trim()) ||
    input.item.kind === "activity" ||
    input.item.kind === "amenity";
  return {
    lodgingRow,
    eateryRow,
    imageCount: input.imageCount,
    hasVideo,
  };
}

/** Step 3–4 — project inventory + schema into a feed card profile. */
export function buildFeedEntityProfile(input: {
  event: EventCandidate;
  item: GlobeResourceReelItem;
  imageCount: number;
  userIntentKo?: string | null;
  triggerMessage?: string | null;
}): FeedEntityProfileLayer {
  const inventory = readInventoryContext(input);
  const entityKind = resolveDiscoveryEntityKindFromReel({
    kind: input.item.kind,
    activitySubtype: input.item.activitySubtype,
    categoryLabel: inventory.eateryRow?.categoryLabel ?? null,
    cuisineHint: inventory.eateryRow?.cuisineHint ?? null,
    triggerMessage: input.triggerMessage,
  });
  const schema = readEntityDataSchema(entityKind);

  const prioritySlots: FeedEntitySlotWire[] = schema.priorityOrder.map(
    (slotId, index) => ({
      priority: index + 1,
      ...resolveSlot(slotId, inventory, input.item),
    }),
  );

  const filledCount = prioritySlots.filter((row) => row.filled).length;
  const dataCompletenessPercent = Math.round(
    (filledCount / Math.max(1, prioritySlots.length)) * 100,
  );

  const reviewFocus: FeedEntityReviewFocusWire[] = schema.reviewCategories.map(
    (categoryId) => ({
      categoryId,
      labelKo: reviewCategoryLabelKo(categoryId),
    }),
  );

  return {
    entityKind,
    userIntentKo: input.userIntentKo ?? null,
    prioritySlots,
    reviewFocus,
    practicalTipsKo: copy.globe.feedEntityPracticalTips(entityKind, {
      hasPhotos: inventory.imageCount > 0,
      hasVideo: inventory.hasVideo,
      hasPrice:
        inventory.lodgingRow?.priceKrw != null ||
        inventory.eateryRow?.priceLevel != null,
    })
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean),
    videoSearchKind: reviewKindForEntity(entityKind),
    dataCompletenessPercent,
  };
}

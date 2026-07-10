import type { PlaceReviewKind } from "@/lib/globe/place-review-video";

/** Feed-facing entity kinds — maps 1:1 to extraction schemas. */
export type DiscoveryEntityKind =
  | "hotel"
  | "restaurant"
  | "cafe"
  | "attraction"
  | "shopping";

export type EntityDataSlotId =
  | "room_photos"
  | "location_info"
  | "price_range"
  | "reviews_by_category"
  | "amenities"
  | "breakfast_info"
  | "food_photos"
  | "menu_with_prices"
  | "reviews_with_taste_rating"
  | "operation_hours"
  | "waiting_time"
  | "reservation_info"
  | "drink_food_photos"
  | "interior_design"
  | "wifi_quality"
  | "noise_level"
  | "reviews_by_vibe"
  | "working_hours"
  | "seating_capacity"
  | "product_photos"
  | "store_layout_photos"
  | "product_variety"
  | "reviews_by_value"
  | "payment_methods"
  | "attraction_photos"
  | "access_info"
  | "crowd_timing"
  | "ticket_info"
  | "video_tour";

export type EntityReviewCategoryId =
  | "cleanliness"
  | "staff"
  | "value"
  | "noise"
  | "comfort"
  | "taste"
  | "service_speed"
  | "atmosphere"
  | "ambiance"
  | "wifi"
  | "quiet"
  | "variety"
  | "quality"
  | "access"
  | "crowd";

export type EntityDataSchema = {
  readonly entityKind: DiscoveryEntityKind;
  readonly requiredData: readonly EntityDataSlotId[];
  readonly extractionFocusKo: string;
  readonly reviewCategories: readonly EntityReviewCategoryId[];
  readonly priorityOrder: readonly EntityDataSlotId[];
};

export type DiscoveryEntityClassifyResult = {
  readonly entityKind: DiscoveryEntityKind;
  readonly location: string | null;
  readonly queryDetail: string | null;
  readonly userIntentKo: string | null;
};

export type FeedEntitySlotWire = {
  readonly slotId: EntityDataSlotId;
  readonly labelKo: string;
  readonly priority: number;
  readonly filled: boolean;
  readonly valueKo: string | null;
  readonly confidence: number;
};

export type FeedEntityReviewFocusWire = {
  readonly categoryId: EntityReviewCategoryId;
  readonly labelKo: string;
};

/** Structured profile attached to each infinite feed card. */
export type FeedEntityProfileLayer = {
  readonly entityKind: DiscoveryEntityKind;
  readonly userIntentKo: string | null;
  readonly prioritySlots: readonly FeedEntitySlotWire[];
  readonly reviewFocus: readonly FeedEntityReviewFocusWire[];
  readonly practicalTipsKo: readonly string[];
  readonly videoSearchKind: PlaceReviewKind;
  readonly dataCompletenessPercent: number;
};

/**
 * Reality Object — durable place/media identity in the user's Reality Graph.
 * Not bookmarks. Not world-geo `lib/reality-graph` (geo:* hierarchy).
 */

export const REALITY_OBJECTS_META_KEY = "realityObjectsV1";
export const REALITY_OBJECT_PRIMARY_ID_META_KEY = "realityObjectPrimaryId";

export type RealityObjectType =
  | "landmark"
  | "restaurant"
  | "cafe"
  | "hotel"
  | "accommodation"
  | "shopping"
  | "activity"
  | "experience"
  | "photo"
  | "video"
  | "reel"
  | "post"
  | "memory"
  | "person"
  | "event"
  | "flight"
  | "train"
  | "ticket"
  | "rental_car"
  | "parking"
  | "document"
  | "website"
  | "product";

/** Pin-compat kind used by ContextPinnedItemV1. */
export type RealityPinCompatKind =
  | "eatery"
  | "lodging"
  | "activity"
  | "amenity";

export type RealityExecutionCapability =
  | "navigate"
  | "call"
  | "reserve"
  | "book_room"
  | "buy_ticket"
  | "order"
  | "add_to_trip"
  | "add_to_inbox"
  | "pay";

export type RealityObjectLocation = {
  readonly country?: string | null;
  readonly city?: string | null;
  readonly district?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
};

export type RealityObjectOntology = {
  readonly category?: string | null;
  readonly description?: string | null;
  readonly openingHours?: string | null;
  readonly phone?: string | null;
  readonly website?: string | null;
  readonly reservationSupport?: boolean | null;
  readonly paymentSupport?: boolean | null;
  readonly ticketSupport?: boolean | null;
  readonly rating?: number | null;
  readonly price?: number | null;
  readonly images?: readonly string[];
  readonly videos?: readonly string[];
};

export type RealityObjectExecution = {
  readonly capabilities: readonly RealityExecutionCapability[];
};

/** Bloom / nearby edge persisted on the Reality Object. */
export type RealityObjectRelationEdgeV1 = {
  readonly relatedObjectId: string;
  readonly resourceId?: string | null;
  readonly label?: string | null;
  readonly pinKind?: RealityPinCompatKind | null;
  readonly score: number;
  readonly relationKind: "travel" | "recommend" | "booking_order" | "visited";
  readonly lat?: number | null;
  readonly lng?: number | null;
};

export type RealityObjectRelations = {
  readonly relatedObjectIds: readonly string[];
  /** Ranked bloom edges — reused on reselect when candidates still match. */
  readonly edges?: readonly RealityObjectRelationEdgeV1[];
  readonly bloomRankedAtIso?: string | null;
};

export type RealityObjectTimeline = {
  readonly createdAtIso: string;
  readonly pinnedAtIso: string;
  readonly sourceContextEventId: string;
};

export type RealityObjectV1 = {
  readonly version: 1;
  readonly id: string;
  readonly title: string;
  readonly objectType: RealityObjectType;
  readonly coverImageUrl: string | null;
  readonly location: RealityObjectLocation;
  readonly ontology: RealityObjectOntology;
  readonly execution: RealityObjectExecution;
  readonly relations: RealityObjectRelations;
  readonly timeline: RealityObjectTimeline;
  readonly metadata: Readonly<Record<string, unknown>>;
};

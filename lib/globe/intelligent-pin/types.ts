import type { FeedEntityProfileLayer } from "@/lib/globe/feed-entity/types";
import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { ScoutFeedGateVideoContextWire } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import type { GlobeResourceReelKind } from "@/lib/globe/resource-reel/types";

/** Capsule FSM — one virtual coordinate, no page redirect. */
export type IntelligentPinCapsuleState =
  | "exploring"
  | "comparing"
  | "holding"
  | "paying"
  | "committed";

export type IntelligentPinMediaLayer = {
  readonly title: string;
  readonly categoryLabelKo: string;
  readonly detailReasonLine: string;
  readonly secondaryLine: string | null;
  readonly imageUrls: readonly string[];
  readonly scoreLabel: string | null;
  /** Activity / attraction — YouTube + related clips on the feed card. */
  readonly videoContext?: ScoutFeedGateVideoContextWire | null;
};

export type IntelligentPinStateLayer = {
  readonly capsuleState: IntelligentPinCapsuleState;
  readonly statusLineKo: string | null;
};

export type IntelligentPinTransactionLayer = {
  readonly canCheckout: boolean;
  readonly payLabelKo: string | null;
};

/** Instagram-style infinite feed card — all three layers in one row. */
export type InfiniteDiscoveryFeedCard = {
  readonly resourceId: string;
  readonly kind: GlobeResourceReelKind;
  readonly activitySubtype?: LocalDiscoveryActivitySubtype | null;
  readonly placeId: string;
  readonly lat: number;
  readonly lng: number;
  readonly carouselIndex: number;
  readonly media: IntelligentPinMediaLayer;
  readonly profile?: FeedEntityProfileLayer;
  readonly state: IntelligentPinStateLayer;
  readonly transaction: IntelligentPinTransactionLayer;
};

export type IntelligentDiscoveryFeedOpenDetail = {
  readonly contextEventId: string;
  readonly source: "scout_complete" | "manual";
};

export type IntelligentDiscoveryActiveCardDetail = {
  readonly contextEventId: string;
  readonly resourceId: string;
  readonly placeId: string;
  readonly kind: GlobeResourceReelKind;
  readonly lat: number;
  readonly lng: number;
};

/** Fragments that compose an Experience Node with its EventCandidate + plan. */
export type {
  FeedCaptureFragment,
  FeedCaptureKind,
} from "@/lib/ontology/feed-capture-wire";
import type { FeedCaptureKind } from "@/lib/ontology/feed-capture-wire";

export type FeedCaptureStats = {
  photos: number;
  videos: number;
  links: number;
  memos: number;
};

export {
  FEED_CAPTURES_META_KEY,
  FEED_CAPTURE_STATS_META_KEY,
  FEED_CAPTURE_PENDING_VERIFY_META_KEY,
  FEED_CAPTURE_VERIFIED_AT_META_KEY,
} from "@/lib/events/event-metadata-keys";

export type SpacetimeFeedTargetConfidence = "high" | "medium" | "low";

export type SpacetimeFeedTargetMatch = {
  eventId: string;
  eventTitle: string;
  confidence: SpacetimeFeedTargetConfidence;
  score: number;
  placeLabel: string | null;
  dayLabel: string | null;
  reason: string;
};

import assert from "node:assert/strict";
import { resolveResourceReviewVideoContext } from "@/lib/globe/resource-reel/resolve-resource-review-video-context";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";
import type { EventCandidate } from "@/lib/events/event-candidate";

const activityItem = {
  resourceId: "evt:activity:p1",
  kind: "activity",
  activitySubtype: "general",
  placeId: "p1",
  title: "오사카성",
  score100: 90,
  detailReasonLine: "명소",
  accent: "orange",
  thumbnailUrl: null,
  lat: 34.68,
  lng: 135.52,
  carouselIndex: 0,
  secondaryLine: null,
  actionHref: null,
  actionLabel: null,
  contractSource: { sourceKind: "batch", sourceId: "b1" },
} as GlobeResourceReelItem;

const ctx = resolveResourceReviewVideoContext({
  event: null as unknown as EventCandidate,
  item: activityItem,
  areaFallback: "오사카",
});

assert.equal(ctx.kind, "place");
assert.equal(ctx.name, "오사카성");
assert.equal(ctx.place, "오사카");

console.log("test-activity-feed-media-context ok");

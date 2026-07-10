import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { GlobeResourceReelKind } from "@/lib/globe/resource-reel/types";
import type { DiscoveryEntityKind } from "@/lib/globe/feed-entity/types";

/** Map scout/reel row → feed entity schema key. */
export function resolveDiscoveryEntityKindFromReel(input: {
  kind: GlobeResourceReelKind;
  activitySubtype?: LocalDiscoveryActivitySubtype | null;
  categoryLabel?: string | null;
  cuisineHint?: string | null;
  triggerMessage?: string | null;
}): DiscoveryEntityKind {
  if (input.kind === "lodging") {
    return "hotel";
  }
  if (input.kind === "activity") {
    if (input.activitySubtype === "shopping") {
      return "shopping";
    }
    return "attraction";
  }
  if (input.kind === "amenity") {
    return "attraction";
  }
  const haystack = [
    input.triggerMessage ?? "",
    input.categoryLabel ?? "",
    input.cuisineHint ?? "",
  ].join(" ");
  if (/카페|커피|브런치|베이커리|cafe|coffee|bakery/iu.test(haystack)) {
    return "cafe";
  }
  return "restaurant";
}

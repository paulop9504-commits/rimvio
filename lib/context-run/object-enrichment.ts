/**
 * Object Enrichment (ADR-050 STEP 4) — make Discovery hits operable Reality Objects.
 * Thin façade: normalize fields; deeper gallery/detail fetch stays in providers.
 */

import type { SearchToolCandidate } from "@/lib/graph-command/stamp-search-tool-results-to-diff";

export type EnrichedRealityObject = SearchToolCandidate & {
  readonly enriched: true;
  readonly enrichmentTags: readonly string[];
};

function tagsFromCandidate(c: SearchToolCandidate): string[] {
  const tags: string[] = [];
  const blob = `${c.labelKo ?? ""} ${c.amountLabel ?? ""}`.toLowerCase();
  if (/capsule|캡슐/iu.test(blob)) tags.push("capsule");
  if (/onsen|온천/iu.test(blob)) tags.push("onsen");
  if (typeof c.rating === "number" && c.rating >= 4.2) tags.push("high_rating");
  if (typeof c.priceKrw === "number" || typeof c.priceBand === "number") {
    tags.push("priced");
  }
  if (
    c.thumbnailUrl ||
    (Array.isArray(c.images) && c.images.length > 0)
  ) {
    tags.push("has_photo");
  }
  if (c.reservable) tags.push("reservable");
  return tags;
}

export function enrichDiscoveredObjects(
  candidates: readonly SearchToolCandidate[],
): readonly EnrichedRealityObject[] {
  return candidates.map((c) => ({
    ...c,
    enriched: true as const,
    enrichmentTags: tagsFromCandidate(c),
  }));
}

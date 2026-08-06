/**
 * Candidate Evaluation (ADR-050 STEP 5) — rank inside Runtime, not in chat.
 */

import type { EnrichedRealityObject } from "@/lib/context-run/object-enrichment";

function scoreObject(c: EnrichedRealityObject): number {
  let score = 0;
  if (typeof c.rating === "number") score += c.rating * 10;
  if (c.enrichmentTags.includes("has_photo")) score += 8;
  if (c.enrichmentTags.includes("high_rating")) score += 5;
  if (c.enrichmentTags.includes("priced")) score += 2;
  if (c.enrichmentTags.includes("reservable")) score += 3;
  if (typeof c.walkMinutes === "number" && Number.isFinite(c.walkMinutes)) {
    score += Math.max(0, 20 - c.walkMinutes);
  }
  if (typeof c.reviewCount === "number" && c.reviewCount > 50) {
    score += 4;
  }
  return score;
}

export function evaluateCandidateObjects(
  candidates: readonly EnrichedRealityObject[],
): readonly EnrichedRealityObject[] {
  return [...candidates].sort((a, b) => scoreObject(b) - scoreObject(a));
}

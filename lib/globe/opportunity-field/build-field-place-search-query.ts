import type { OpportunityPill } from "@/lib/globe/opportunity-field/types";

import { isFieldLodgingDiscoveryPill } from "@/lib/globe/opportunity-field/build-field-lodging-discovery-enabled";

const FOOD_PATTERN = /(?:맛집|카페|식당|음식|레스토랑|restaurant|cafe)/iu;

/** Derive place-search query from Field seeking pill — lodging uses market-price branch. */
export function buildFieldPlaceSearchQuery(
  pill: Pick<OpportunityPill, "title"> | null | undefined,
): string | null {
  const title = pill?.title?.trim();
  if (!title) {
    return null;
  }
  if (isFieldLodgingDiscoveryPill(pill)) {
    return null;
  }
  if (FOOD_PATTERN.test(title)) {
    return title;
  }
  return `${title} 맛집`;
}

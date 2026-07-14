/**
 * Local activity / attraction prep — 놀거리 · 관광 · 박물관 …
 * Engine SKU: activity_search (distinct from trip_experience_search).
 */

import {
  isBroadActivityQuery,
  parseActivitySpecificFocus,
  resolveLocalDiscoveryDomain,
} from "@/lib/globe/context-condition-ai/resolve-local-discovery-domain";
import { isAmenityPrepUtterance } from "@/lib/globe/amenity-prep/is-amenity-prep-utterance";
import { isEateryPrepUtterance } from "@/lib/globe/eatery-prep/is-eatery-prep-utterance";
import { isLodgingPrepUtterance } from "@/lib/globe/lodging-prep/is-lodging-prep-utterance";
import { isTripExperienceUtterance } from "@/lib/globe/trip-experience/detect-trip-experience-utterance";

/** Activity scout utterance — not lodging/eatery/amenity, not exploratory trip fun. */
export function isActivityPrepUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (
    isLodgingPrepUtterance(trimmed) ||
    isAmenityPrepUtterance(trimmed) ||
    isEateryPrepUtterance(trimmed)
  ) {
    return false;
  }
  // Exploratory multi-leg trip stays on trip_experience_search.
  if (isTripExperienceUtterance(trimmed)) {
    return false;
  }
  if (resolveLocalDiscoveryDomain(trimmed) === "activity") {
    return true;
  }
  if (isBroadActivityQuery(trimmed) || parseActivitySpecificFocus(trimmed)) {
    return true;
  }
  return false;
}

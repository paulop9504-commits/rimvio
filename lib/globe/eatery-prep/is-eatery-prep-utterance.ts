/**
 * Nearby eatery / cuisine prep — restaurant · cafe · cuisine focus.
 * Engine SKU: eatery_search (distinct from trip_experience_search).
 */

import { isInstantEaterySearch } from "@/lib/globe/context-condition-ai/instant-eatery-search";
import { isAmenityPrepUtterance } from "@/lib/globe/amenity-prep/is-amenity-prep-utterance";
import { isLodgingPrepUtterance } from "@/lib/globe/lodging-prep/is-lodging-prep-utterance";

const EATERY_CUE =
  /(?:맛집|식당|음식점|레스토랑|카페|먹을|초밥|스시|라멘|피자|치킨|restaurant|cafe|sushi|ramen)/iu;

/** Eatery scout utterance — not lodging, not amenity. */
export function isEateryPrepUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (isLodgingPrepUtterance(trimmed) || isAmenityPrepUtterance(trimmed)) {
    return false;
  }
  if (isInstantEaterySearch(trimmed)) {
    return true;
  }
  return EATERY_CUE.test(trimmed) && /(?:찾|근처|주변|어디|보여|알려|search|nearby|추천)/iu.test(trimmed);
}

import { parseSingleCuisineFocus } from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";
import { parseFoodBrandFocus } from "@/lib/globe/context-condition-ai/parse-food-brand-focus";
import { normalizeScoutUtterance } from "@/lib/globe/context-condition-ai/utterance-intent-slots";

export const INSTANT_EATERY_DEBOUNCE_MS = 350;

const EATERY_NOUN =
  /(?:맛집|식당|음식점|레스토랑|먹을\s*곳|먹고\s*싶|dining|restaurant)/iu;
const MAP_CUE = /(?:지도|표시|꽂|찾아|찾기|찾어|보여|nearby|show\s+on)/iu;
const CUISINE_SHOP =
  /^(?:초밥|스시|피자|치킨|라멘|카페|말차(?:아이스(?:크림)?)?|sushi|pizza|ramen|chicken|matcha)(?:집| 가게)?/iu;

/** Resolved cuisine focus — null means broad nearby eatery scout. */
export function resolveInstantEateryFocus(text: string): string | null {
  const trimmed = normalizeScoutUtterance(text);
  if (!trimmed) {
    return null;
  }
  return (
    parseFoodBrandFocus(trimmed)?.queryKo ?? parseSingleCuisineFocus(trimmed)
  );
}

export function isInstantEaterySearch(text: string): boolean {
  const trimmed = normalizeScoutUtterance(text);
  if (!trimmed) {
    return false;
  }
  if (parseFoodBrandFocus(trimmed) || parseSingleCuisineFocus(trimmed)) {
    return true;
  }
  if (CUISINE_SHOP.test(trimmed)) {
    return true;
  }
  if (EATERY_NOUN.test(trimmed) && MAP_CUE.test(trimmed)) {
    return true;
  }
  if (/스시|초밥|sushi|맥도날드|mcdonald/iu.test(trimmed) && MAP_CUE.test(trimmed)) {
    return true;
  }
  return false;
}

/** While typing — debounced auto-search when prefix is unambiguous. */
export function matchesInstantEateryTyping(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (isInstantEaterySearch(trimmed)) {
    return true;
  }
  return /^(?:맛|식|음식|레스|초밥|스시|피자|치킨|라멘|카페|sushi|pizza|ramen)/iu.test(
    trimmed,
  );
}

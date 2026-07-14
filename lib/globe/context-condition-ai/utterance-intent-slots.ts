/**
 * Utterance → Intent slots SSOT (scout search / rank / reason).
 * TravelBrain axes stay auxiliary only when dish slots are empty.
 */
import {
  parseCuisineCandidates,
  parseSingleCuisineFocus,
  resolveCuisineFocusQuery,
} from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";

export type UtteranceIntentSlots = {
  /** Catalog id when exactly one cuisine matched, else null. */
  readonly cuisineId: string | null;
  /** Search/rank focus string — e.g. "말차 아이스크림". */
  readonly dishFocus: string | null;
  /** Soft area noun from the utterance (not GPS). */
  readonly areaHint: string | null;
  /** "빼고/제외" style excludes. */
  readonly excludeKeywords: readonly string[];
  /** "디저트만" / dessert-only refine. */
  readonly dessertOnly: boolean;
  /** Replace prior dish ("아니 말차만", "말고 라멘"). */
  readonly replaceDish: boolean;
};

const AREA_HINT_PATTERN =
  /(도쿄|오사카|교토|후쿠오카|나고야|삿포로|요코하마|신주쿠|시부야|시부야|아사쿠사|우에노|긴자|하라주쿠|이케부쿠로|오사카|난바|우메다|도톤보리|서울|부산|제주|강남|홍대|이태원|tokyo|osaka|kyoto|seoul|busan)/iu;

const EXCLUDE_PATTERN = /([가-힣A-Za-z]{2,20})\s*(?:빼고|제외)/gu;

const DESSERT_ONLY_PATTERN =
  /디저트\s*만|디저트만|디저트로\s*만|디저트\s*위주|dessert\s*only/iu;

const REPLACE_DISH_PATTERN =
  /아니|아니라|말고|대신에|대신|from\s+now|only\s+(?:want|looking)/iu;

export function parseUtteranceIntentSlots(
  message: string,
): UtteranceIntentSlots {
  const text = message.trim();
  if (!text) {
    return {
      cuisineId: null,
      dishFocus: null,
      areaHint: null,
      excludeKeywords: [],
      dessertOnly: false,
      replaceDish: false,
    };
  }

  const candidates = parseCuisineCandidates(text);
  const cuisineId = candidates.length === 1 ? (candidates[0]?.id ?? null) : null;
  const dessertOnly = DESSERT_ONLY_PATTERN.test(text);
  const dishFocus = dessertOnly
    ? "디저트"
    : resolveCuisineFocusQuery(cuisineId) ??
      parseSingleCuisineFocus(text) ??
      null;

  const areaMatch = text.match(AREA_HINT_PATTERN);
  const areaHint = areaMatch?.[1]?.trim() || null;

  const excludeKeywords: string[] = [];
  for (const match of text.matchAll(EXCLUDE_PATTERN)) {
    const token = match[1]?.trim();
    if (token && token.length >= 2) {
      excludeKeywords.push(token);
    }
  }

  return {
    cuisineId,
    dishFocus,
    areaHint,
    excludeKeywords,
    dessertOnly,
    replaceDish: REPLACE_DISH_PATTERN.test(text),
  };
}

/** True when the utterance already carries a concrete dish/menu slot. */
export function utteranceHasConcreteDishSlot(message: string): boolean {
  const slots = parseUtteranceIntentSlots(message);
  return Boolean(slots.dishFocus?.trim());
}

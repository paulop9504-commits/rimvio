/**
 * Utterance → Intent slots SSOT (scout search / rank / reason).
 * TravelBrain axes stay auxiliary only when dish/brand slots are empty.
 */
import {
  parseCuisineCandidates,
  parseSingleCuisineFocus,
  resolveCuisineFocusQuery,
} from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";
import { parseFoodBrandFocus } from "@/lib/globe/context-condition-ai/parse-food-brand-focus";
import { lockEntities } from "@/lib/search-intent/entity-lock";

export type UtteranceIntentSlots = {
  /** Catalog id when exactly one cuisine matched, else null. */
  readonly cuisineId: string | null;
  /** Search/rank focus string — e.g. "말차 아이스크림" · "맥도날드". */
  readonly dishFocus: string | null;
  /** Soft area noun from the utterance (not GPS). */
  readonly areaHint: string | null;
  /** Transit/station noun — e.g. 도쿄역. */
  readonly stationHint: string | null;
  /** "빼고/제외" style excludes. */
  readonly excludeKeywords: readonly string[];
  /** "디저트만" / dessert-only refine. */
  readonly dessertOnly: boolean;
  /** Replace prior dish ("아니 말차만", "말고 라멘"). */
  readonly replaceDish: boolean;
  /** Hard brand lock (McDonald's etc.). */
  readonly brandFocus: string | null;
};

const AREA_HINT_PATTERN =
  /(도쿄역|신주쿠역|시부야역|우에노역|오사카역|난바|도쿄|오사카|교토|후쿠오카|나고야|삿포로|요코하마|신주쿠|시부야|아사쿠사|우에노|긴자|하라주쿠|이케부쿠로|도톤보리|서울|부산|제주|강남|홍대|이태원|tokyo\s*station|tokyo|osaka|kyoto|seoul|busan)/iu;

const EXCLUDE_PATTERN = /([가-힣A-Za-z]{2,20})\s*(?:빼고|제외)/gu;

const DESSERT_ONLY_PATTERN =
  /디저트\s*만|디저트만|디저트로\s*만|디저트\s*위주|dessert\s*only/iu;

const REPLACE_DISH_PATTERN =
  /아니|아니라|말고|대신에|대신|from\s+now|only\s+(?:want|looking)/iu;

/** Scout typos — 찾어줘 → 찾아줘. */
export function normalizeScoutUtterance(message: string): string {
  return message
    .trim()
    .replace(/찾어\s*줘/giu, "찾아줘")
    .replace(/찾어줘/giu, "찾아줘")
    .replace(/\s+/gu, " ");
}

export function parseUtteranceIntentSlots(
  message: string,
): UtteranceIntentSlots {
  const text = normalizeScoutUtterance(message);
  if (!text) {
    return {
      cuisineId: null,
      dishFocus: null,
      areaHint: null,
      stationHint: null,
      excludeKeywords: [],
      dessertOnly: false,
      replaceDish: false,
      brandFocus: null,
    };
  }

  const brand = parseFoodBrandFocus(text);
  const candidates = parseCuisineCandidates(text);
  const cuisineId = candidates.length === 1 ? (candidates[0]?.id ?? null) : null;
  const dessertOnly = DESSERT_ONLY_PATTERN.test(text);
  const dishFocus = brand
    ? brand.queryKo
    : dessertOnly
      ? "디저트"
      : resolveCuisineFocusQuery(cuisineId) ??
        parseSingleCuisineFocus(text) ??
        null;

  const areaMatch = text.match(AREA_HINT_PATTERN);
  const areaHint = areaMatch?.[1]?.trim() || null;
  const transit = lockEntities(text).find((row) => row.kind === "transit");
  const stationHint = transit?.value ?? (/[가-힣]{2,12}역/u.exec(text)?.[0] ?? null);

  const excludeKeywords: string[] = [];
  for (const match of text.matchAll(EXCLUDE_PATTERN)) {
    const token = match[1]?.trim();
    if (token && token.length >= 2) {
      excludeKeywords.push(token);
    }
  }

  return {
    cuisineId: brand ? brand.id : cuisineId,
    dishFocus,
    areaHint,
    stationHint,
    excludeKeywords,
    dessertOnly,
    replaceDish: REPLACE_DISH_PATTERN.test(text),
    brandFocus: brand?.queryKo ?? null,
  };
}

/** True when the utterance already carries a concrete dish/brand slot. */
export function utteranceHasConcreteDishSlot(message: string): boolean {
  const slots = parseUtteranceIntentSlots(message);
  return Boolean(slots.dishFocus?.trim() || slots.brandFocus?.trim());
}

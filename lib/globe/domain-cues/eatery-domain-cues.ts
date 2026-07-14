/**
 * Eatery domain cue SSOT — shared by ambiguity / classify / reel filter.
 */

export const EATERY_ENTITY_SOURCE =
  String.raw`맛집|먹을|식당|밥|레스토랑|카페|커피|brunch|lunch|dinner|food|eatery|restaurant|cafe|coffee|ラーメン|食|음료|드링크|drink|beverage|주스|juice|스무디|smoothie|디저트|dessert|베이커리|bakery|맥도날드|맥날|mcdonald|버거킹|스타벅스|starbucks|롯데리아|말차|matcha|抹茶`;

export const EATERY_ENTITY_RE = new RegExp(`(?:${EATERY_ENTITY_SOURCE})`, "iu");

export function hasEateryDomainCue(text: string): boolean {
  return EATERY_ENTITY_RE.test(text.trim());
}

export function defaultEateryWidenSeed(): string {
  return "주변 맛집 더 찾아줘";
}

export function widenPriorEateryUtterance(prior: string): string {
  const trimmed = prior.trim();
  if (!trimmed) {
    return defaultEateryWidenSeed();
  }
  if (/더\s*찾|다시\s*찾|더\s*넓/iu.test(trimmed)) {
    return trimmed;
  }
  const base =
    trimmed
      .replace(/\s*(?:찾아\s*줘|찾아줘|해\s*줘|해줘|좀)$/iu, "")
      .trim() || trimmed;
  return `${base} 더 찾아줘`;
}

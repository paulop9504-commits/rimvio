/** place_search + food — globe composer / orchestrator probe. */

const FOOD_ENTITY =
  /(?:맛집|식당|레스토랑|카페|음식|먹|밥|점심|저녁|브런치|restaurant|cafe|food|eatery|dining)/iu;

const FOOD_NEED =
  /(?:구하|구해야|찾|추천|알려|골라|가|need|search|recommend|where)/iu;

export type EaterySearchIntent = {
  intent: "place_search";
  category: "food";
};

export function detectEaterySearchIntent(message: string): EaterySearchIntent | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  if (!FOOD_ENTITY.test(text)) {
    return null;
  }
  if (!FOOD_NEED.test(text)) {
    return null;
  }
  return { intent: "place_search", category: "food" };
}

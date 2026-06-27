/** place_search + accommodation — globe composer / orchestrator probe. */

const LODGING_ENTITY =
  /(?:숙소|호텔|펜션|모텔|게스트(?:하우스|house)?|airbnb|에어비앤비|야놀자|booking|stay|lodging|hotel)/iu;

const LODGING_NEED =
  /(?:구하|구해야|찾|예약|추천|필요|알려|골라|해야|need|book|search|reserve)/iu;

export type LodgingSearchIntent = {
  intent: "place_search";
  category: "accommodation";
};

export function detectLodgingSearchIntent(message: string): LodgingSearchIntent | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  if (!LODGING_ENTITY.test(text)) {
    return null;
  }
  if (!LODGING_NEED.test(text)) {
    return null;
  }
  return { intent: "place_search", category: "accommodation" };
}

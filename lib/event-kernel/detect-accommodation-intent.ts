/** Accommodation intent — Context Hub Rail / globe composer keyword gate. */

const ACCOMMODATION_KEYWORD =
  /(?:숙소|호텔|어디서\s*자)/iu;

export type AccommodationIntent = {
  intent: "place_search";
  serviceType: "accommodation";
};

export function detectAccommodationIntent(message: string): AccommodationIntent | null {
  const text = message.trim();
  if (!text || !ACCOMMODATION_KEYWORD.test(text)) {
    return null;
  }
  return { intent: "place_search", serviceType: "accommodation" };
}

export function messageSignalsAccommodationIntent(message: string): boolean {
  return detectAccommodationIntent(message) != null;
}

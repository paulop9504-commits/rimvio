import type { TripFunAxis } from "@/lib/globe/trip-experience/types";

/** Deterministic fun-axis cues from message text. */
export function inferTripFunAxisFromMessage(
  message: string | null | undefined,
): TripFunAxis | null {
  const text = message?.trim() ?? "";
  if (!text) {
    return null;
  }
  if (/(?:시장|먹거리|맛집|미식|food|market|local\s*eat)/iu.test(text)) {
    return "food_market";
  }
  if (/(?:자연|산|바다|숲|휴양|nature|beach|mountain)/iu.test(text)) {
    return "nature";
  }
  if (/(?:축제|이벤트|공연|festival|concert)/iu.test(text)) {
    return "festival";
  }
  if (/(?:문화|박물관|역사|culture|museum)/iu.test(text)) {
    return "culture";
  }
  return null;
}

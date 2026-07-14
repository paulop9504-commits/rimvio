/**
 * Nearby lodging scout — skip convergence when hotel intent + map cue is clear.
 * Booking slot collection is separate (`requiresLodgingBookingSlots`).
 */

import { parseMaxNightlyPriceKrw } from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";

const LODGING_NOUN =
  /(?:호텔|숙소|숙박|게스트\s*하우스|게스트하우스|호스텔|료칸|민박|펜션|motel|hostel|ryokan|hotel|lodging)/iu;
const MAP_CUE =
  /(?:지도|표시|꽂|찾아|찾기|보여|주변|근처|nearby|show\s+on)/iu;

export function isInstantLodgingSearch(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (
    /^(?:주변|근처)\s*(?:호텔|숙소|숙박|게스트\s*하우스|게스트하우스|호스텔)/iu.test(
      trimmed,
    )
  ) {
    return true;
  }
  // Bare lodging noun (guest house / hostel) — one-shot scout, no both/hotel+eatery mix.
  if (
    /^(?:게스트\s*하우스|게스트하우스|호스텔|hostel|guesthouse|guest\s*house|료칸|민박|펜션)$/iu.test(
      trimmed,
    )
  ) {
    return true;
  }
  if (LODGING_NOUN.test(trimmed) && MAP_CUE.test(trimmed)) {
    return true;
  }
  // Price ceiling + find cue → lodging scout (e.g. "하루 3만원 미만으로 찾아줘").
  if (parseMaxNightlyPriceKrw(trimmed) && MAP_CUE.test(trimmed)) {
    return true;
  }
  return false;
}

/** Reserve / checkout cues — require stay window slots before proceeding. */
export function requiresLodgingBookingSlots(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return /(?:예약|체크인|체크아웃|객실|방\s*\d|박\s*\d|명\s*\d|guest|room\b|check[\s-]?in|check[\s-]?out|\bbook\b)/iu.test(
    trimmed,
  );
}

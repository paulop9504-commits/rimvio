/**
 * Nearby lodging scout — skip convergence when hotel intent + map cue is clear.
 * Booking slot collection is separate (`requiresLodgingBookingSlots`).
 */

const LODGING_NOUN = /(?:호텔|숙소|숙박|hotel|lodging)/iu;
const MAP_CUE =
  /(?:지도|표시|꽂|찾아|찾기|보여|주변|근처|nearby|show\s+on)/iu;

export function isInstantLodgingSearch(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (/^(?:주변|근처)\s*(?:호텔|숙소|숙박)/iu.test(trimmed)) {
    return true;
  }
  if (LODGING_NOUN.test(trimmed) && MAP_CUE.test(trimmed)) {
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
